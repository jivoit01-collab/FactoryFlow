import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { usePermission } from '@/core/auth';
import { usePFMovements } from '@/modules/warehouse/api/pfMovement.queries';

import { useDispatchFulfilment } from '../../dispatch-fulfilment/api';
import { useExpenseBoard } from '../../factory-expense/api';
import { useControlWmsCollection } from '../../warehouse-control/api';
import { summarisePalletSpace } from '../../warehouse-control/utils/palletSpace';
import {
  boardSettingsApi,
  LOGISTICS_CONTROL_QUERY_KEYS,
  useApprovedPartialScans,
  useBoardSettings,
  useDayPlanBills,
  useEmployeeRoll,
  useFreightRate,
  useOwnedVehicleStatus,
  usePendingBillsByCompany,
  usePendingGrpoSummary,
  useStockInTransit,
  useTransporterAccount,
} from '../api';
import {
  LOGISTICS_CONTROL_FREIGHT_PAYMENT_DAYS,
  LOGISTICS_CONTROL_FREIGHT_REFRESH_MS,
  LOGISTICS_CONTROL_FUNNEL_AGE_BANDS,
  LOGISTICS_CONTROL_LOADING_COST_PER_LITRE,
  LOGISTICS_CONTROL_MAX_ROLLUP_ROWS,
  LOGISTICS_CONTROL_MONTHLY_TARGET_TONNES,
  LOGISTICS_CONTROL_OIL_SCOPE,
  LOGISTICS_CONTROL_PENDING_STATUSES,
  LOGISTICS_CONTROL_PENDING_WINDOW,
  LOGISTICS_CONTROL_REFRESH_MS,
  LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS,
  LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS,
  type LogisticsControlScope,
} from '../constants';
import {
  boardHeadcount,
  buildFunnelColumnFromBuckets,
  buildWorkforceStrip,
  companyLabel,
  costPerLitre,
  dayOnDay,
  dayPlan,
  gateLabourTotal,
  type LabourDepartment,
  labourForSection,
  sectionHeadcount,
  sumWorkforceStrips,
} from '../utils';
import { useWarehouseSides } from './useWarehouseSides';

/**
 * Local `YYYY-MM-DD`. Never `toISOString()`, which shifts the day in IST and
 * would roll a wall board's "today" over at half past five in the evening.
 */
function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Everything on the Logistics Control wall, in one hook.
 *
 * Deliberately composed from the boards that already own these feeds rather
 * than a new API layer: the occupancy, non-moving, plan-bill, WMS, expense,
 * GRPO-queue and open-bilty queries are all existing, typed and cached under
 * their own keys. Reusing the keys means this board shares their cache instead
 * of doubling the SAP traffic — which matters most for the open-bilty feed,
 * where every call fans the whole outstanding backlog into one HANA query.
 *
 * The single aggregate endpoint this board eventually wants would replace the
 * fan-out here and nothing above it.
 *
 * Everything that makes one plant's board different from another's arrives in
 * `scope` -- the warehouse, the companies added together, the labour departments
 * and the tiles with no source on that side of the plant. Defaulted to the
 * original Oil scope so a caller that names none behaves as it always did.
 */
/** The month the board's month figures are read over. */
export interface LogisticsBoardPeriod {
  /** First day of the month. */
  from: string;
  /** Today for the current month; the month's last day for an ended one. */
  to: string;
  /** The real today, which the live tiles keep reading whatever the month. */
  today: string;
  isCurrent: boolean;
}

export function useLogisticsControlBoard(
  scope: LogisticsControlScope = LOGISTICS_CONTROL_OIL_SCOPE,
  period?: LogisticsBoardPeriod,
) {
  const { hasAnyPermission, hasPermission } = usePermission();
  // The employee roll is the one feed behind a grant this board can check
  // before asking: a viewer without it would get a 403 per company, every time
  // the board mounted, for a figure it was never going to be shown.
  const canSeeWorkforce = hasAnyPermission(LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS);
  // The SAP freight account is behind the same grant as the open-bilty queue,
  // and is three HANA aggregates per company — not worth firing for a viewer
  // who will only be shown a locked band.
  const canSeeFreight = hasAnyPermission(LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS);

  // One clock for the whole board, so every card agrees on what "today" is even
  // if their queries resolve seconds apart. The page's month hook owns it where
  // there is one — it re-reads the clock every minute, so a wall left running
  // crosses midnight with every query key — and a caller without one keeps the
  // old clock, read once at mount.
  const mountedAt = useMemo(() => new Date(), []);
  const today = period?.today ?? localDate(mountedAt);
  /**
   * The month the month figures belong to.
   *
   * Two dates, not one: `today` is what the live tiles read — stock, pending,
   * what left today — and `monthEnd` is where the month's own figures stop.
   * They are the same day on the current month and a month apart on an ended
   * one, which is the whole of what stepping back a month changes.
   */
  const monthStart = period?.from ?? `${today.slice(0, 7)}-01`;
  const monthEnd = period?.to ?? today;
  const isCurrentMonth = period?.isCurrent ?? true;
  // The calendar day before today — derived from the same clock, so a board
  // that stays open past midnight moves both days together.
  const yesterday = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return localDate(date);
  }, [today]);

  // ---------------------------------------------------------------- warehouse
  // Every warehouse ticked for each side's company, read through that company:
  // its stock (finished goods only, filtered in the endpoint's own SQL — see
  // LOGISTICS_CONTROL_STOCK_ITEM_GROUPS for why packaging is excluded) and its
  // idle stock, rolled up per side and then added.
  const warehouseBand = useWarehouseSides(scope);

  /**
   * Pallet slots, and only where a scope has a WMS floor mapped to it.
   *
   * Four collection reads for one fallback figure, so a scope WMS knows nothing
   * about skips them outright rather than fetching the whole estate and finding
   * its warehouse absent from it.
   */
  const wmsMapped = !scope.absent.palletSpace;
  const wmsWarehouses = useControlWmsCollection('warehouses', wmsMapped);
  const wmsLocations = useControlWmsCollection('locations', wmsMapped);
  const wmsPallets = useControlWmsCollection('pallets', wmsMapped);
  const wmsPurposes = useControlWmsCollection('cellPurposes', wmsMapped);

  /*
   * Every bill dated to leave and still waiting — with no date floor.
   *
   * One request per company AND per open booking state: the bills endpoint
   * takes no company parameter (the tile shows Oil and Mart side by side), and
   * the state slices are what keep an all-time window under the feed's own
   * 2000-row cap. Both constants carry the reasoning.
   *
   * Pointedly NOT `warehouseControlPlanWindow` — that window exists to make the
   * warehouse board agree with the Dispatch Plans page, and a bill stuck since
   * April is exactly what this tile is for and what that window hides.
   */
  const planBills = usePendingBillsByCompany(
    scope.dispatchCompanies,
    LOGISTICS_CONTROL_PENDING_WINDOW,
    LOGISTICS_CONTROL_MAX_ROLLUP_ROWS,
    LOGISTICS_CONTROL_PENDING_STATUSES,
  );

  /**
   * What the production floor has declared into the ticked warehouses today.
   *
   * The Godown Movements register, every godown consignment of the day, narrowed
   * below to those whose destination is a ticked warehouse of that company —
   * client-side, because the register filters on one destination at a time and
   * a day's declarations are a handful of rows. `GODOWN` excludes the direct
   * dispatches that leave the floor straight onto a customer's truck — those
   * never arrive in a warehouse.
   *
   * A single day on purpose. The register is a declaration log with no received
   * or closed state, so there is no "outstanding" set to total: a wider window
   * would just accumulate everything ever sent and call it allocated.
   */
  const floorToWarehouse = usePFMovements(
    {
      destinationKind: 'GODOWN',
      dateFrom: today,
      dateTo: today,
      allCompanies: true,
    },
    // Not fetched where the tile is not on the wall: the register belongs to
    // the oil floor, so a scope that hides this tile would be paying for rows
    // it could not show.
    { enabled: !scope.hidden.includes('allocated') },
  );

  // ----------------------------------------------------------------- dispatch
  // Two windows on the same feed, each aggregating both companies server-side —
  // so "Oil + Mart combined" is one call per window, not two added client-side.
  //
  // Scoped explicitly, because the endpoint's default is every company the
  // VIEWER belongs to: on a login that also holds Beverages, its tonnage was
  // being folded into a card headed "Oil + Mart".
  //
  // Both windows poll: today's tonnage has to climb as each truck clears the
  // gate, and the month total grows with it. Postgres-backed, so the cost is a
  // cheap aggregate rather than a SAP round-trip.
  const dispatchToday = useDispatchFulfilment(
    { from: today, to: today, companies: scope.dispatchCompanies },
    { refetchIntervalMs: LOGISTICS_CONTROL_REFRESH_MS },
  );
  const dispatchMonth = useDispatchFulfilment(
    { from: monthStart, to: monthEnd, companies: scope.dispatchCompanies },
    { refetchIntervalMs: LOGISTICS_CONTROL_REFRESH_MS },
  );

  /**
   * The same window, one day back.
   *
   * A closed day, so it is fetched once and left alone rather than polled —
   * nothing behind it can change while the board is open. Its only job is the
   * comparison on today's tile.
   */
  const dispatchYesterday = useDispatchFulfilment({
    from: yesterday,
    to: yesterday,
    companies: scope.dispatchCompanies,
  });

  /**
   * What today is committed to move: bills dated for today with a truck linked.
   *
   * Read per company and merged, because the bills endpoint has no company
   * filter — the same reason the pending-bill and partial-scan feeds are
   * pinned. Polled with the board: a plan booked at eleven o'clock belongs to
   * the day's target from eleven o'clock.
   */
  const dayPlanBills = useDayPlanBills(
    scope.dispatchCompanies,
    today,
    LOGISTICS_CONTROL_MAX_ROLLUP_ROWS,
    LOGISTICS_CONTROL_REFRESH_MS,
  );

  /**
   * Dockings released without a full box scan, this month.
   *
   * The Partial Dispatch Approval register: a keeper asks to gate a truck out
   * with fewer boxes scanned than the bill expects, and an admin approves it.
   * Only APPROVED rows count — a pending request has not let anything leave.
   *
   * Read once per company and merged: the endpoint takes no company parameter,
   * so a single call would answer only for whichever company the viewer is
   * signed into — which is how this tile came to show Oil's 16 approvals and
   * none of Mart's.
   *
   * Read once per company and merged: the register endpoint takes no company
   * parameter, so a single call answers only for whichever company the viewer
   * is signed into — which is how this tile came to show Oil's approvals and
   * none of Mart's.
   *
   * Windowed client-side because the endpoint takes only `status` and
   * `sales_dispatch`, no dates.
   *
   * The shortfall is boxes, truck-wide, frozen at request time — the register
   * stores no tonnage and no per-bill split, so this tile cannot be stated in
   * tonnes without a source that does not exist yet.
   */
  const partialScans = useApprovedPartialScans(
    scope.dispatchCompanies,
    !scope.hidden.includes('unscanned') && !scope.absent.barcodeScanning,
  );

  // ------------------------------------------------------------------ freight
  /**
   * The receipt queue, counted across both companies.
   *
   * Not the paginated queue feed the Service GRPO page renders. That one
   * answers 25 rows and scopes its dispatched half to the current month —
   * counting its rows gave 25 however long the backlog was, and the month bound
   * made the 30 and 45 day bands structurally empty, because on the 12th
   * nothing dispatched can be older than 11 days.
   */
  const grpoQueue = usePendingGrpoSummary(
    scope.dispatchCompanies,
    LOGISTICS_CONTROL_REFRESH_MS,
    canSeeFreight,
  );

  /**
   * What SAP says is still owed to the hauliers, and what has been paid.
   *
   * The payment stage of the freight funnel had no source in either repo until
   * this: `TransporterAPInvoicePosting` records the invoice this app posted and
   * carries no paid-to-date, so "outstanding" could not be derived locally at
   * any point. It comes off SAP's own open A/P invoices instead.
   */
  const transporterAccount = useTransporterAccount(
    scope.dispatchCompanies,
    LOGISTICS_CONTROL_FREIGHT_PAYMENT_DAYS,
    LOGISTICS_CONTROL_FREIGHT_REFRESH_MS,
    canSeeFreight,
  );

  // ---------------------------------------------------------------- workforce
  const expense = useExpenseBoard(today, today, 'all');

  // Owned vehicles and per-section salary, typed in on the settings screen
  // because nothing in the system holds them. The head counts typed there are
  // now a fallback rather than the only source — see the roll below.
  const boardSettings = useBoardSettings(true, scope.settingsCompany);

  /**
   * Each warehouse side's own company's figures, for its head count and salary.
   *
   * Keyed exactly as `useBoardSettings` keys them, so the settings company's
   * read above is the same cache entry as its side's here, and a save on the
   * settings screen lands in both.
   */
  const sideSettings = useQueries({
    queries: scope.warehouseSides.map((side) => ({
      queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardSettings(side.companyCode),
      queryFn: () => boardSettingsApi.get(side.companyCode),
      staleTime: 5 * 60 * 1000,
      enabled: canSeeWorkforce,
    })),
  });
  const sideSettingsData = sideSettings.map((query) => query.data);
  /** When each side's figures last landed — a fixed-size memo dependency. */
  const sideSettingsKey = sideSettings.map((query) => query.dataUpdatedAt).join(',');

  /**
   * The permanent staff on the roll, both companies.
   *
   * On-roll, not on shift: the directory counts everyone still employed,
   * including somebody on leave, which is the right population for a figure
   * that is priced as a day's salary. Never added to the labour count without
   * saying so — a standing payroll and a daily gate intake are two different
   * populations.
   */
  const employeeRoll = useEmployeeRoll(scope.dispatchCompanies, canSeeWorkforce);

  // Today's duty state per owned truck. Polled with the board — gate arrivals
  // move through the day, unlike the fleet list itself.
  const ownedVehicles = useOwnedVehicleStatus(LOGISTICS_CONTROL_REFRESH_MS, scope.settingsCompany);

  // Stock dispatched from a godown and not yet received. Switched off entirely
  // for a scope the endpoint's route table has no leg for -- see `absent`.
  const transit = useStockInTransit(
    LOGISTICS_CONTROL_REFRESH_MS,
    scope.settingsCompany,
    !scope.absent.stockInTransit,
  );

  // ============================================================== derivations

  /**
   * Filled percentage by pallet slot, over the ticked warehouses WMS maps.
   *
   * Slots rather than tonnage: a half-empty pallet still consumes a whole slot,
   * which is what "full" means to somebody looking for somewhere to put a
   * pallet down. The fallback for a board with no rated capacity at all; WMS
   * matches on the code alone, which is safe while it maps only the three
   * floors it does today.
   */
  const tickedCodes = warehouseBand.codes.map((code) => code.trim().toUpperCase());
  const tickedCodesKey = tickedCodes.join(',');
  /** Which warehouses each side has ticked, as one comparable string. */
  const tickedKey = warehouseBand.sides
    .map((side) => `${side.companyCode}:${side.warehouses.map((row) => row.warehouse).join('|')}`)
    .join(',');
  const palletSpace = useMemo(() => {
    if (!wmsLocations.data || !wmsPallets.data) return null;

    const summary = summarisePalletSpace({
      warehouses: wmsWarehouses.data ?? [],
      locations: wmsLocations.data,
      pallets: wmsPallets.data,
      purposes: wmsPurposes.data ?? [],
    });

    const mapped = summary.warehouses.filter((row) =>
      tickedCodes.includes(row.code.trim().toUpperCase()),
    );
    if (mapped.length === 0) return null;

    const totalSpace = mapped.reduce((total, row) => total + row.totalSpace, 0);
    const usedSpace = mapped.reduce((total, row) => total + row.usedSpace, 0);
    return {
      totalSpace,
      usedSpace,
      unavailableSpace: mapped.reduce((total, row) => total + row.unavailableSpace, 0),
      utilisationPct: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0,
    };
    // The codes are a fresh array each render; their joined string is the
    // real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wmsWarehouses.data, wmsLocations.data, wmsPallets.data, wmsPurposes.data, tickedCodesKey]);

  /**
   * Today's floor declarations, split by the company whose warehouse took them.
   *
   * A consignment counts on a side only where both halves match: the
   * destination company, and a warehouse ticked for it. Oil's floor declares
   * into Mart's Gupta godown as well as its own basement, and the register
   * names the receiving company on every godown row.
   */
  const allocated = useMemo(() => {
    const movements = floorToWarehouse.data?.movements ?? [];
    const sides = warehouseBand.sides.map((side) => {
      const codes = new Set(side.warehouses.map((row) => row.warehouse.trim().toUpperCase()));
      const rows = movements.filter(
        (movement) =>
          movement.to_company_code === side.companyCode &&
          codes.has((movement.to_warehouse ?? '').trim().toUpperCase()),
      );
      return {
        companyCode: side.companyCode,
        rows,
        pieces: rows.reduce((total, row) => total + (row.total_pieces ?? 0), 0),
        litres: rows.reduce((total, row) => total + Number(row.total_litres ?? 0), 0),
        movements: rows.length,
      };
    });
    return {
      sides,
      /** The consignments themselves, for the drill-down. */
      rows: sides.flatMap((side) => side.rows),
      pieces: sides.reduce((total, side) => total + side.pieces, 0),
      litres: sides.reduce((total, side) => total + side.litres, 0),
      movements: sides.reduce((total, side) => total + side.movements, 0),
    };
    // The sides' ticked lists are what decide a row's side; `tickedKey` is
    // them, as a string, where the sides themselves are new each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorToWarehouse.data, tickedKey]);

  /**
   * Bills with a dispatch date that have not gone out.
   *
   * Both un-booked and booked count: a bill with a truck against it still has
   * not left. The existing Warehouse Control panel shows only the un-booked
   * half and reports the booked ones separately, which is a narrower question
   * than this tile asks.
   */
  const pendingDispatch = useMemo(() => {
    const groups = planBills.data ?? [];

    /** Bills dated to go that have not gone. */
    const outstanding = (bills: (typeof groups)[number]['bills']) =>
      bills.filter((bill) => bill.plan?.dispatch_date && bill.plan.booking_status !== 'DISPATCHED');

    const tonnesOf = (bills: (typeof groups)[number]['bills']) =>
      bills.reduce((total, bill) => total + (bill.total_weight ?? 0), 0) / 1000;

    const byCompany = groups.map((group) => {
      const open = outstanding(group.bills);
      return {
        companyCode: group.companyCode,
        invoices: open.length,
        tonnes: tonnesOf(open),
        // The feed slices AFTER ordering by dispatch date descending, so a
        // truncated page has dropped the oldest and most overdue bills —
        // exactly the ones this card exists to show.
        truncated: group.total > group.bills.length,
      };
    });

    const all = groups.flatMap((group) => outstanding(group.bills));
    const booked = all.filter((bill) => bill.plan?.vehicle_id != null);

    return {
      /** The outstanding bills themselves, for the drill-down. */
      rows: all,
      byCompany,
      invoices: all.length,
      tonnes: tonnesOf(all),
      plannedBills: all.length,
      bookedBills: booked.length,
      plannedTonnes: tonnesOf(all),
      bookedTonnes: tonnesOf(booked),
      truncated: byCompany.some((company) => company.truncated),
      /**
       * Surfaced so the tile can say SAP is unreachable.
       *
       * This feed reads SAP for every bill, so a HANA outage answers 503 and
       * the board received an empty list — which rendered as "0.0 tonnes, 0
       * invoices", indistinguishable from a day with nothing pending.
       */
      error: planBills.error ?? null,
      loading: planBills.isLoading,
    };
  }, [planBills.data, planBills.error, planBills.isLoading]);

  /** The freight funnel: three stages, each aged from its own clock. */
  const funnel = useMemo(() => {
    /**
     * Why the SAP feed is unreadable, or nothing when it is fine.
     *
     * Shared by both SAP columns: they come from one call, so they are never in
     * different states, and a column that went blank on its own would imply the
     * other one had been checked.
     */
    const sapUnavailable = transporterAccount.data
      ? undefined
      : transporterAccount.isLoading
        ? 'Reading SAP'
        : 'Could not read the freight account from SAP';

    return [
      /*
       * GRPO — bilties dispatched and not yet received into SAP.
       *
       * The one column that stays on this app's own queue, because it is the
       * only one whose documents do not exist in SAP yet: that is precisely
       * what is pending.
       *
       * Counts only. Freight is typed on the post form afterwards, so most of
       * this queue carries no amount at all — a money row under these counts
       * would be missing on the majority of the column rather than merely
       * small, which makes it worse than no money row. The question this
       * column answers is how many receipts are waiting and how long they have
       * waited; the rupees live in the two SAP columns beside it.
       */
      {
        ...buildFunnelColumnFromBuckets(
          'GRPO',
          grpoQueue.data
            ? grpoQueue.data.buckets.map((bucket) => ({
                band: bucket.band,
                documents: bucket.documents,
                amount: bucket.amount,
                // Carried, not dropped: this is the one stage whose documents
                // exist before anybody prices them.
                unpriced: bucket.unpriced,
              }))
            : null,
          LOGISTICS_CONTROL_FUNNEL_AGE_BANDS,
          // A read that answered for NO company is unavailable, not empty. The
          // fan-out settles each company separately and returns an envelope
          // either way, so `data` is truthy even when every request was
          // refused — and the column then drew a confident column of zeros
          // over a queue of seven hundred receipts. The envelope existing is
          // not evidence that anything was read.
          grpoQueue.isLoading
            ? 'Reading the queue'
            : !grpoQueue.data || grpoQueue.data.unread.length >= scope.dispatchCompanies.length
              ? 'Could not read the receipt queue'
              : undefined,
        ),
        countsOnly: true,
      },
      /*
       * AP — received into SAP, no A/P invoice raised against it.
       *
       * SAP's own open service GRPOs (`OPDN`), not this app's posting records.
       * The app only knows the GRPOs it posted itself, while accounts also
       * receive freight directly, and only SAP knows which receipts have since
       * been invoiced — a local "not yet invoiced" flag goes stale the moment
       * somebody raises the invoice in SAP.
       *
       * The amount is the un-invoiced remainder, pre-tax.
       */
      buildFunnelColumnFromBuckets(
        'AP',
        transporterAccount.data
          ? transporterAccount.data.awaitingInvoice.buckets.map((bucket) => ({
              band: bucket.band,
              documents: bucket.documents,
              amount: bucket.amount,
            }))
          : null,
        LOGISTICS_CONTROL_FUNNEL_AGE_BANDS,
        sapUnavailable,
      ),
      /*
       * PAYMENT — invoiced and not yet paid.
       *
       * SAP's open A/P invoices for the transporter vendor group, amount
       * `DocTotal - PaidToDate`, so a part-paid invoice shows only what is left.
       *
       * Tax-inclusive where the AP column beside it is pre-tax: each is the
       * right measure for its own question — what is left to invoice, versus
       * what is owed — and the two are deliberately not added anywhere.
       */
      buildFunnelColumnFromBuckets(
        'PAYMENT',
        transporterAccount.data
          ? transporterAccount.data.buckets.map((bucket) => ({
              band: bucket.band,
              documents: bucket.documents,
              amount: bucket.outstanding,
            }))
          : null,
        LOGISTICS_CONTROL_FUNNEL_AGE_BANDS,
        sapUnavailable,
      ),
    ];
  }, [
    grpoQueue.data,
    grpoQueue.isLoading,
    transporterAccount.data,
    transporterAccount.isLoading,
    // The GRPO column calls itself unreadable when every company refused, so it
    // has to recompute when the board is pointed at a different set of them.
    scope.dispatchCompanies.length,
  ]);

  /** Employees and labour, per card and in total. */
  const workforce = useMemo(() => {
    const board = expense.data;
    // Money arrives as a string — these are Decimals server-side and must not
    // be added as text.
    const departments: LabourDepartment[] = (board?.labour_departments ?? []).map((row) => ({
      department: row.department,
      headcount: row.headcount,
      cost: Number(row.cost) || 0,
    }));

    // The expense board already knows when a bucket has nothing behind it and
    // states the reason on its own tile. Reuse that judgement rather than
    // inferring it from a zero, which cannot tell "no rate configured" apart
    // from "nobody came to work today".
    // A rate typed on the settings screen wins over Cost Master, which holds a
    // `factory-labour` rate for exactly this but has none seeded — so the
    // expense board reports ₹0 with a warning, and this one would inherit it.
    const configuredRate = boardSettings.data?.labour_rate_per_day ?? null;
    const labourRateConfigured = configuredRate !== null || !board?.buckets?.LABOUR?.warning;
    const gateTotal = gateLabourTotal(departments);

    const cfg = boardSettings.data;
    const roll = employeeRoll.data?.departments ?? [];
    /**
     * The whole roll, both companies.
     *
     * Null — not zero — until the directory answers, or where the viewer's
     * grant did not reach it: an unread payroll must not print as a company
     * that employs nobody.
     */
    const rollHeadcount = employeeRoll.data ? employeeRoll.data.headcount : null;
    /**
     * One section's strip.
     *
     * The head count is the figure typed on the settings screen, and the
     * employee directory's own answer only where nothing has been typed.
     *
     * This used to be the other way round — live first, on the reasoning that a
     * typed number goes stale the day somebody joins. The reasoning was sound
     * and the behaviour was still wrong, for two reasons the floor found before
     * we did. The settings screen gives no sign it is being overridden: the
     * field is labelled "Transport — employees" and the salary beside it says
     * "Shows on the board as ₹5,461.10 a day", so somebody who types 6 and sees
     * 1 on the wall has been told the board is broken. And the directory is a
     * poorer master than it looks — it holds departments for one of the three
     * companies, hangs its head count on leaves whose names repeat across
     * floors, and answers for the org chart rather than for who works this
     * shift on this floor.
     *
     * So the typed figure wins, and the directory fills the gap where the
     * section has never been configured — which is the only case where it is
     * the better of the two answers rather than merely the fresher one.
     */
    const strip = (
      section_: 'warehouse' | 'dispatch' | 'transport',
      names: readonly string[],
      employees: number | null,
      salaryDaily: number | null,
      // A warehouse side looks up only its own company's directory: the same
      // department code can exist in both.
      directory: typeof roll = roll,
    ) => {
      const section = labourForSection(departments, names);
      const onRoll = sectionHeadcount(
        employees,
        directory,
        scope.sectionEmployeeDepartments[section_],
      );
      // Priced against the gate's own head count when a rate is set, rather
      // than the expense board's figure for the same people.
      const labourCost =
        configuredRate !== null ? section.headcount * configuredRate : section.cost;
      return buildWorkforceStrip({
        // The settings screen's count for this section, falling back to the
        // directory where none is typed. Salary is typed in either way: payroll
        // withholds it without a grant a wall-board login has no reason to hold,
        // so the head count and the cost beside it now come from one master.
        employees: onRoll,
        annualPayroll: null,
        salaryVisible: false,
        employeeCostPerDay: salaryDaily,
        labour: section.headcount,
        labourCost,
        labourAssigned: section.assigned,
        labourRateConfigured,
      });
    };

    /**
     * The warehouse card, one strip per side and then added.
     *
     * Each side's head count and salary are its own company's, typed on the
     * settings screen; its labour is the gate's departments for its floors,
     * priced at the board's one rate.
     */
    const warehouseSides = scope.warehouseSides.map((side, index) => {
      const sideCfg = sideSettingsData[index];
      return {
        companyCode: side.companyCode,
        strip: strip(
          'warehouse',
          side.labourDepartments,
          sideCfg?.warehouse_employees ?? null,
          sideCfg?.warehouse_salary_daily ?? null,
          roll.filter((row) => row.companyCode === side.companyCode),
        ),
      };
    });
    const warehouse =
      warehouseSides.length === 1
        ? warehouseSides[0].strip
        : sumWorkforceStrips(warehouseSides.map((side) => side.strip));
    const dispatch = strip(
      'dispatch',
      scope.sectionDepartments.dispatch,
      cfg?.dispatch_employees ?? null,
      cfg?.dispatch_salary_daily ?? null,
    );
    const transport = strip(
      'transport',
      scope.sectionDepartments.transport,
      cfg?.transport_employees ?? null,
      cfg?.transport_salary_daily ?? null,
    );

    return {
      total: buildWorkforceStrip({
        // Both companies' rolls added. It IS a fan-out — every employee
        // endpoint serves one company per request — but two cached calls that
        // refresh quarter-hourly are a fair price for the one figure this board
        // could not previously state at all.
        employees: rollHeadcount,
        annualPayroll: null,
        salaryVisible: false,
        labour: gateTotal,
        labourCost:
          configuredRate !== null
            ? gateTotal * configuredRate
            : Number(board?.buckets?.LABOUR?.today ?? 0) || 0,
        labourAssigned: true,
        labourRateConfigured,
      }),
      /**
       * What the whole workforce costs for a day.
       *
       * Labour is priced off the gate's head count; the employee half is the
       * three configured section salaries added up, because no company-wide
       * payroll figure reaches this board — the endpoint serves one company per
       * request and withholds salary without a grant.
       *
       * Null, not zero, when neither half is configured: an unpriced workforce
       * must not read as a free one.
       */
      totalCostPerDay: (() => {
        const labourCost =
          configuredRate !== null
            ? gateTotal * configuredRate
            : board?.buckets?.LABOUR?.warning
              ? null
              : Number(board?.buckets?.LABOUR?.today ?? 0) || 0;

        const salaries = [
          // Every side's warehouse salary, not only the settings company's.
          warehouse.employeeCostPerDay,
          cfg?.dispatch_salary_daily ?? null,
          cfg?.transport_salary_daily ?? null,
        ].filter((value): value is number => value !== null);

        const employeeCost = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) : null;

        if (labourCost === null && employeeCost === null) return null;
        return (labourCost ?? 0) + (employeeCost ?? 0);
      })(),
      warehouse,
      /**
       * The warehouse strip's halves, for the Oil | Mart line under each role.
       * One entry on a single-company board, which prints no line.
       */
      warehouseSplit: warehouseSides.map((side) => ({
        label: companyLabel(side.companyCode),
        employees: side.strip.employees,
        labour: side.strip.labour,
      })),
      dispatch,
      transport,
      /**
       * The three sections added — what the topbar heads the board with.
       *
       * Built from the same strips the bands render, never from the roll
       * beside it, so the headline and the cards under it are one arithmetic.
       * A warehouse side nobody has configured is named on its own, because
       * the total is short by exactly it.
       */
      onBoard: boardHeadcount([
        ...warehouseSides.map((side) => ({
          name:
            warehouseSides.length > 1
              ? `${companyLabel(side.companyCode)} warehouse`
              : 'Warehouse',
          employees: side.strip.employees,
        })),
        { name: 'Dispatch', employees: dispatch.employees },
        { name: 'Transport', employees: transport.employees },
      ]),
    };
    // The side settings are read through `sideSettingsKey`, which changes when
    // any of them lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    expense.data,
    boardSettings.data,
    employeeRoll.data,
    scope.sectionDepartments,
    scope.sectionEmployeeDepartments,
    scope.warehouseSides,
    sideSettingsKey,
  ]);

  /**
   * Today's tile: tonnage out, the day's booked plan, and yesterday's mark.
   *
   * The plan is deliberately not the backend's `backlog` total, which is a
   * snapshot of every open plan in the system and not window-bound at all —
   * using it would put the whole outstanding pipeline behind a bar headed
   * "today".
   */
  const dispatchTodayTile = useMemo(() => {
    const tonnes = (dispatchToday.data?.totals?.dispatched?.weight ?? 0) / 1000;
    const bills = dayPlanBills.data?.bills ?? [];
    const toPlanBill = (bill: (typeof bills)[number]) => ({
      weightKg: bill.total_weight ?? 0,
      vehicleId: bill.plan?.vehicle_id ?? null,
    });
    const plan = dayPlan(bills.map(toPlanBill));
    // Each company's share of the plan. A company whose feed failed is left
    // out rather than shown as 0 T — the tile already names it as unread.
    const unread = dayPlanBills.data?.unread ?? [];
    const sides = scope.dispatchCompanies
      .filter((companyCode) => !unread.includes(companyCode))
      .map((companyCode) => ({
        companyCode,
        ...dayPlan(
          bills.filter((bill) => bill.company_code === companyCode).map(toPlanBill),
        ),
      }));

    return {
      tonnes,
      // Trucks as the backend counts them: per-company dockings, so a truck
      // carrying both companies' bills is counted twice. Correcting it needs
      // the arrival id, which this summary does not carry.
      vehicles: dispatchToday.data?.totals?.dispatched?.count ?? 0,
      invoices: dispatchToday.data?.totals?.dispatched?.bills ?? 0,
      plan: {
        ...plan,
        // A day nobody has booked has no target, which is not a target of
        // zero: the tile draws a note instead of a full bar.
        configured: plan.bills > 0,
        // Named companies whose feed failed — their bills are missing from the
        // total, so the tile says so rather than showing a short plan.
        unread,
        sides,
        loading: dayPlanBills.isLoading,
        error: dayPlanBills.error ?? null,
      },
      vsYesterday: dayOnDay(
        tonnes,
        (dispatchYesterday.data?.totals?.dispatched?.weight ?? 0) / 1000,
      ),
    };
  }, [
    dispatchToday.data,
    dispatchYesterday.data,
    dayPlanBills.data,
    dayPlanBills.isLoading,
    dayPlanBills.error,
    scope.dispatchCompanies,
  ]);

  /**
   * What it costs to get a litre out of the gate, month to date.
   *
   * Both halves of the division come off the same plans — the backend restricts
   * the litres to the trucks whose own bilty carries a freight figure, because
   * freight is stored per bilty and litres per truck and mixing the two
   * populations gives a ratio of nothing in particular.
   *
   * Month to date, with the freight taken from SAP.
   *
   * The money is the pre-tax line total of the service GRPOs this app posted;
   * the litres come from the posting lines that tie each SAP document back to
   * the bills it covers. The denominator for coverage is still the dispatch
   * summary's own litres, so the tile can say how much of the month has
   * reached SAP at all.
   */
  /**
   * Freight for the month's litres, with the money read from SAP.
   *
   * Its own feed rather than a block on the dispatch summary: the freight comes
   * out of SAP's service GRPOs and the litres out of the posting lines that tie
   * each SAP document back to its bills, which is a different join from
   * anything the dispatch dashboard does and should not slow that page down.
   */
  const freightRate = useFreightRate(
    scope.dispatchCompanies,
    monthStart,
    monthEnd,
    LOGISTICS_CONTROL_FREIGHT_REFRESH_MS,
    canSeeFreight,
  );

  const costLitre = useMemo(() => {
    const freight = freightRate.data;
    // Absent, not zero: an older backend that does not send this block must
    // leave the tile saying it has no source, never quoting the loading half
    // alone as if freight were free.
    if (!freight) return null;

    // Divided by the month's FULL dispatched litres, not only the litres whose
    // freight has been posted. Two independent totals, divided once — which is
    // the rate the plant actually pays per litre it sent out, and needs no
    // per-bill matching to arrive at.
    //
    // The cost of that is a numerator still catching up: freight is posted days
    // after the truck leaves, so early in a month the rate reads LOW rather
    // than reading as missing. `coveragePct` is how much of the month's litres
    // have had their freight posted, and the tile leads with it for that reason.
    const windowLitres = dispatchMonth.data?.totals?.dispatched?.litres ?? 0;
    const plant = costPerLitre(
      freight.amount ?? 0,
      windowLitres,
      windowLitres,
      LOGISTICS_CONTROL_LOADING_COST_PER_LITRE,
    );
    if (plant === null) return null;

    return {
      ...plant,
      /**
       * Freight spend per haulier, NOT a per-haulier rate.
       *
       * SAP cannot say which dispatch a freight document paid for — its bilty
       * user field is filled on 17 of 380 service GRPOs — so there are no
       * litres to divide a haulier's spend by. Share of spend is the honest
       * comparison, and inventing a denominator would be worse than not
       * answering.
       */
      byTransporter: freight.byTransporter ?? [],
      /** SAP service GRPOs the freight was read from. */
      documents: freight.documents,
      windowStart: monthStart,
    };
  }, [freightRate.data, dispatchMonth.data, monthStart]);

  /** Month-to-date dispatch, averaged over the days that actually dispatched. */
  const monthToDate = useMemo(() => {
    const summary = dispatchMonth.data;
    const tonnes = (summary?.totals?.dispatched?.weight ?? 0) / 1000;
    // The trend carries only days that had a dispatch, which is exactly the
    // divisor this board wants — zero-dispatch days are excluded, so the figure
    // reads as a normal working day's output.
    const activeDays = summary?.trend?.length ?? 0;

    return {
      tonnes,
      activeDays,
      averagePerActiveDay: activeDays > 0 ? tonnes / activeDays : null,
      targetTonnes:
        LOGISTICS_CONTROL_MONTHLY_TARGET_TONNES > 0
          ? LOGISTICS_CONTROL_MONTHLY_TARGET_TONNES
          : null,
    };
  }, [dispatchMonth.data]);

  /**
   * Per-panel state, not one flag for the board.
   *
   * Stock comes from SAP HANA, plans and gate figures from Postgres, the freight
   * queue from both — so they fail independently, and a HANA outage must leave
   * the panels that still work rendering their numbers rather than blanking the
   * screen. `loading` is the first-load skeleton; `isFetching` is the quiet
   * spinner on a background refresh.
   */
  return {
    /**
     * The scope this board was read for.
     *
     * Returned rather than left for the caller to remember: the page, the
     * topbar and every drill-down need the warehouse and the companies to
     * label themselves, and a component that imported the constant instead
     * would caption Beverages rows with an Oil warehouse code.
     */
    scope,
    today,
    monthStart,
    /** Where the month figures stop: today, or an ended month's last day. */
    monthEnd,
    isCurrentMonth,
    isFetching:
      warehouseBand.isFetching ||
      planBills.isFetching ||
      dispatchToday.isFetching ||
      dispatchMonth.isFetching ||
      grpoQueue.isFetching ||
      expense.isFetching,
    hasPermission,
    warehouse: {
      /**
       * Each company's half: its ticked warehouses and what they hold.
       *
       * One entry on a single-company board. The tiles print the combined
       * figures below as the headline and these beneath it.
       */
      sides: warehouseBand.sides,
      /** Every ticked warehouse code, across the sides, for the band's caption. */
      codes: warehouseBand.codes,
      /** Companies whose stock could not be read, and is missing from every figure. */
      unread: warehouseBand.unread,
      /** Companies whose idle stock could not be read. */
      idleUnread: warehouseBand.idleUnread,
      stockTonnage: warehouseBand.combined.stockTonnage,
      /** Every stock row behind the tonnage, tagged with its company, for the drill-down. */
      stockRows: warehouseBand.combined.stockRows,
      capacityTonnes: warehouseBand.combined.capacityTonnes,
      /** Tonnage in the warehouses that have a capacity — what "% full" divides. */
      ratedTonnes: warehouseBand.combined.ratedTonnes,
      fillPct: warehouseBand.combined.fillPct,
      unrated: warehouseBand.combined.unrated,
      oldestAudit: warehouseBand.combined.oldestAudit,
      unaudited: warehouseBand.combined.unaudited,
      nonMoving: warehouseBand.combined.nonMoving,
      // Reshaped for the shared CapacityMeter, which takes slot counts rather
      // than a percentage so it can draw used, unusable and free separately.
      space: palletSpace
        ? {
            total: palletSpace.totalSpace,
            used: palletSpace.usedSpace,
            unavailable: palletSpace.unavailableSpace,
            utilisationPct: palletSpace.utilisationPct,
          }
        : null,
      pendingDispatch,
      unscanned: (() => {
        const rows = (partialScans.data ?? []).filter(
          (row) =>
            (row.reviewed_at ?? row.requested_at ?? '').slice(0, 7) === monthStart.slice(0, 7),
        );
        return {
          /**
           * Why this floor has no scan to fall short of, or null where it does.
           *
           * A floor that does not barcode its stock produces an empty register,
           * which reads on a wall as flawless scanning discipline. This is what
           * the tile prints instead of that zero.
           */
          absent: scope.absent.barcodeScanning ?? null,
          /** The approvals themselves, for the drill-down. */
          rows,
          approvals: rows.length,
          expectedBoxes: rows.reduce((sum, row) => sum + (row.expected_boxes ?? 0), 0),
          scannedBoxes: rows.reduce((sum, row) => sum + (row.scanned_boxes ?? 0), 0),
          shortfallBoxes: rows.reduce(
            (sum, row) => sum + Math.max(0, (row.expected_boxes ?? 0) - (row.scanned_boxes ?? 0)),
            0,
          ),
          loading: partialScans.isLoading,
          error: partialScans.error ?? null,
        };
      })(),
      allocated: {
        ...allocated,
        loading: floorToWarehouse.isLoading,
        error: floorToWarehouse.error ?? null,
      },
      loading: warehouseBand.loading || planBills.isLoading,
      isFetching: warehouseBand.isFetching || planBills.isFetching,
      // planBills included deliberately: leaving it out meant a failed bill feed
      // rendered as "0 invoices pending" — the one reading a control board must
      // never mistake for a quiet day.
      error: warehouseBand.error ?? planBills.error ?? null,
    },
    dispatch: {
      today: dispatchTodayTile,
      monthToDate,
      costPerLitre: costLitre,
      /**
       * Every day of the month so far, oldest first.
       *
       * Zero-filled from the 1st: the API answers only days that had a
       * dispatch, and drawing just those would silently close up the gaps, so a
       * week with two shutdowns would read as a continuous run. A calendar month
       * with visible empty days is the honest shape — and on a board about pace,
       * the days nothing moved are the point.
       */
      /**
       * Every day of the month so far, zero-filled.
       *
       * Zero-filled on purpose: a day nothing moved is a gap in the row rather
       * than a day that closes up, so the bars and the day-wise list both read
       * as a calendar instead of a list of the days that happened to work.
       *
       * Trucks and bills are carried alongside the tonnage because the feed
       * already reports them per day, and the drill-down asks "how much, on how
       * many trucks" of every row. `bills` is optional on the wire — an older
       * backend omits it, and absent has to read as unknown rather than zero.
       */
      trend: (() => {
        const byDate = new Map(
          (dispatchMonth.data?.trend ?? []).map((row) => [
            row.date.slice(0, 10),
            {
              tonnes: (row.dispatched_weight ?? 0) / 1000,
              trucks: row.trucks ?? 0,
              bills: row.bills ?? null,
              litres: row.dispatched_litres ?? 0,
              boxes: row.dispatched_boxes ?? 0,
            },
          ]),
        );

        const days: {
          date: string;
          tonnes: number;
          trucks: number;
          bills: number | null;
          litres: number;
          boxes: number;
        }[] = [];
        const cursor = new Date(`${monthStart}T00:00:00`);
        const end = new Date(`${monthEnd}T00:00:00`);
        while (cursor <= end) {
          const month = String(cursor.getMonth() + 1).padStart(2, '0');
          const day = String(cursor.getDate()).padStart(2, '0');
          const key = `${cursor.getFullYear()}-${month}-${day}`;
          const found = byDate.get(key);
          days.push({
            date: key,
            tonnes: found?.tonnes ?? 0,
            trucks: found?.trucks ?? 0,
            // A day with no row moved nothing, so nothing is the right count —
            // distinct from a day whose row omitted the field.
            bills: found ? found.bills : 0,
            litres: found?.litres ?? 0,
            boxes: found?.boxes ?? 0,
          });
          cursor.setDate(cursor.getDate() + 1);
        }
        return days;
      })(),
      companies: dispatchMonth.data?.filters?.company_codes ?? [],
      loading: dispatchToday.isLoading || dispatchMonth.isLoading,
      isFetching: dispatchToday.isFetching || dispatchMonth.isFetching || dayPlanBills.isFetching,
      // The day-plan feed is deliberately not here: it fails on its own tile,
      // and a missing target must not blank a band that still knows what went
      // out.
      error: dispatchToday.error ?? dispatchMonth.error ?? null,
    },
    fleet: {
      /**
       * The registration list is the fleet where it exists; the headline count
       * is the fallback for a site that never listed its plates.
       */
      configured: ownedVehicles.data?.configured ?? false,
      owned: ownedVehicles.data?.configured
        ? ownedVehicles.data.summary.owned
        : (boardSettings.data?.owned_vehicles ?? null),
      onBst: ownedVehicles.data?.summary.on_bst ?? 0,
      onDispatch: ownedVehicles.data?.summary.on_dispatch ?? 0,
      atPlant: ownedVehicles.data?.summary.at_plant ?? 0,
      out: ownedVehicles.data?.summary.out ?? 0,
      free: ownedVehicles.data?.summary.free ?? 0,
      outOfService: ownedVehicles.data?.summary.out_of_service ?? 0,
      vehicles: ownedVehicles.data?.vehicles ?? [],
      loading: ownedVehicles.isLoading,
    },
    transit: {
      /**
       * Why this scope has nothing on the road to report, or null where it has.
       *
       * The transit read matches invoices against the receiving company's goods
       * receipt over a fixed route table, so a plant with no leg in that table
       * can only ever answer nothing -- which is not the same as nothing being
       * out there.
       */
      absent: scope.absent.stockInTransit ?? null,
      bands: transit.data?.bands ?? null,
      totals: transit.data?.totals ?? { loads: 0, tonnes: 0 },
      /** The unreceived invoices themselves, for the drill-down. */
      loads: transit.data?.loads ?? [],
      unweighedLines: transit.data?.unweighed_lines ?? 0,
      weightsAvailable: transit.data?.weights_available ?? true,
      loading: transit.isLoading,
      error: transit.error ?? null,
    },
    freight: {
      funnel,
      /**
       * The freight account as SAP holds it, beside the funnel built from it.
       *
       * Carried separately because it answers a question the matrix cannot: the
       * matrix is documents by age, and an accounts desk wants the total, who
       * it is owed to, and what has gone out of the bank lately.
       */
      account: {
        awaitingInvoice: transporterAccount.data?.awaitingInvoice ?? null,
        outstanding: transporterAccount.data?.outstanding ?? null,
        documents: transporterAccount.data?.documents ?? 0,
        billed: transporterAccount.data?.billed ?? 0,
        oldestDays: transporterAccount.data?.oldestDays ?? null,
        vendors: transporterAccount.data?.vendors ?? [],
        payments: transporterAccount.data?.payments ?? null,
        // Named companies whose read failed: their dues are missing from every
        // figure above, and a short payable reads as a healthy one.
        unread: transporterAccount.data?.unread ?? [],
        loading: transporterAccount.isLoading,
        error: transporterAccount.error ?? null,
      },
      /**
       * Companies whose receipt queue could not be read.
       *
       * Their bilties are missing from every GRPO count, and a short queue
       * reads as a queue somebody has been working.
       */
      queueUnread: grpoQueue.data?.unread ?? [],
      loading: grpoQueue.isLoading,
      isFetching: grpoQueue.isFetching || transporterAccount.isFetching,
      // The SAP account fails onto its own column and tile, so it is not here:
      // a freight outage must not blank a band that still knows its queue.
      error: grpoQueue.error ?? null,
    },
    workforce: {
      ...workforce,
      /**
       * The standing payroll, kept separate from everything on shift.
       *
       * Its own branch rather than folded into the strips: the roll is a
       * different population from the gate's labour, and a board that added the
       * two into one "people" figure would be counting a permanent storekeeper
       * and a day's casual hand as the same thing.
       */
      roll: {
        headcount: employeeRoll.data?.headcount ?? null,
        departments: employeeRoll.data?.departments ?? [],
        unread: employeeRoll.data?.unread ?? [],
        loading: employeeRoll.isLoading,
        error: employeeRoll.error ?? null,
      },
      loading: expense.isLoading,
      isFetching: expense.isFetching,
    },
  };
}
