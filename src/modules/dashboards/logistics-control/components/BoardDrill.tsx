import { useMemo, useState } from 'react';

import { useDispatchBills } from '../../dispatch-fulfilment/api';
import type { NonMovingItem } from '../../non-moving/types';
import type { WarehouseOccupancyItem } from '../../production-control/types';
import {
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  LOGISTICS_CONTROL_OIL_SCOPE,
  type LogisticsControlScope,
} from '../constants';
import type { useLogisticsControlBoard } from '../hooks';
import { weighItems } from '../utils';
import { billWarehouse } from '../utils';
import { OpsDrill } from './OpsDrill';

/** Which tile's rows to show. One per openable tile. */
export type DrillKey =
  | 'stock'
  | 'non-moving'
  | 'pending'
  | 'allocated'
  | 'unscanned'
  | 'dispatched-today'
  | 'dispatched-month'
  | 'planned'
  | 'fleet'
  | 'transit'
  | 'freight-vendors'
  | 'cost-litre';

type Board = ReturnType<typeof useLogisticsControlBoard>;

/** The booking states, as a person reads them. */
const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Not booked',
  BOOKED: 'Booked',
  DISPATCHED: 'Gone',
  CANCELLED: 'Cancelled',
};

/** The duty states, as a person reads them. */
const VEHICLE_STATE_LABELS: Record<string, string> = {
  OUT_OF_SERVICE: 'Off the road',
  ON_BST: 'On a branch transfer',
  ON_DISPATCH: 'On a dispatch',
  AT_PLANT: 'At the plant',
  OUT: 'Out',
  FREE: 'Free',
};

export interface BoardDrillProps {
  which: DrillKey;
  board: Board;
  /**
   * The board these rows belong to.
   *
   * Passed rather than imported, so a panel opened over the Beverages board
   * captions itself with BH-FG and reads Beverages bills. Defaulted to Oil for
   * the same reason the hook is: a caller that names no scope keeps its old
   * behaviour exactly.
   */
  scope?: LogisticsControlScope;
  onClose: () => void;
}

/** Whole number, Indian grouping. */
function whole(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

function decimal(value: number, digits = 1): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

function companyLabel(code: string): string {
  return code.replace(/^JIVO[_\s-]*/i, '').replace(/_/g, ' ') || code;
}

/** `2026-09-12` → `Sat`. A slow day is usually a Sunday, and that should show. */
function weekday(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
}

/** `2026-09-12` → `12 Sep`. Dates on a drill-down are read, not sorted. */
function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Kilograms on one stock row, by the board's own weight chain.
 *
 * Mirrors `rollUpTonnage` rather than re-deriving it: the drill-down exists to
 * show what the tile counted, so a row that contributed nothing to the tonnage
 * must show a dash here and not a number computed some other way.
 */
function rowTonnes(row: {
  on_hand: number;
  pieces_per_box: number | null;
  gross_weight_per_case: number | null;
}): number | null {
  if (!row.gross_weight_per_case || !row.pieces_per_box) return null;
  return (row.on_hand * row.gross_weight_per_case) / row.pieces_per_box / 1000;
}

/** One variety's share of what is standing in the warehouse. */
interface VarietyTotal {
  variety: string;
  items: number;
  tonnes: number;
  value: number;
  /** Items in the variety SAP holds no case weight for. */
  unweighed: number;
}

/**
 * Stock rolled up by variety, heaviest first.
 *
 * The variety is the unit the floor thinks in — how much olive is standing,
 * how much mustard — where the SKU list underneath is a hundred rows that
 * answer a question nobody asked of a warehouse total.
 *
 * Items SAP cannot weigh are counted rather than dropped, so a variety's
 * tonnage discloses that it is a floor the same way the tile's does.
 */
function varietyTotals(
  rows: readonly (Parameters<typeof rowTonnes>[0] & {
    sub_group: string;
    stock_value: number;
  })[],
): VarietyTotal[] {
  const byVariety = new Map<string, VarietyTotal>();

  for (const row of rows) {
    const variety = row.sub_group?.trim() || 'Ungrouped';
    const found = byVariety.get(variety) ?? {
      variety,
      items: 0,
      tonnes: 0,
      value: 0,
      unweighed: 0,
    };

    const tonnes = rowTonnes(row);
    found.items += 1;
    found.value += row.stock_value ?? 0;
    if (tonnes === null) found.unweighed += 1;
    else found.tonnes += tonnes;

    byVariety.set(variety, found);
  }

  return [...byVariety.values()].sort((a, b) => b.tonnes - a.tonnes);
}

/** One variety's idle stock. */
interface IdleVariety {
  variety: string;
  items: number;
  quantity: number;
  tonnes: number;
  value: number;
  /** Days the oldest item in the variety has been standing. */
  longestIdle: number;
  /** Items in the variety the occupancy feed cannot weigh. */
  unweighed: number;
}

/**
 * Idle stock rolled up by variety, heaviest first.
 *
 * Weighed through `weighItems` rather than by a local calculation, because the
 * non-moving feed carries no unit of measure at all — its quantities are
 * weighable only by looking each item up in the occupancy rows. Using the same
 * function the tile uses is what keeps the panel's total equal to the tile's;
 * a second weight chain here would drift from it the first time either changed.
 */
function idleVarieties(
  rows: readonly NonMovingItem[],
  stockRows: readonly WarehouseOccupancyItem[],
): IdleVariety[] {
  const byVariety = new Map<string, (typeof rows)[number][]>();
  for (const row of rows) {
    const variety = row.sub_group?.trim() || 'Ungrouped';
    const found = byVariety.get(variety);
    if (found) found.push(row);
    else byVariety.set(variety, [row]);
  }

  return [...byVariety.entries()]
    .map(([variety, group]) => {
      const weighed = weighItems(group, stockRows);
      return {
        variety,
        items: group.length,
        quantity: group.reduce((total, row) => total + (row.quantity ?? 0), 0),
        tonnes: weighed.tonnes,
        value: group.reduce((total, row) => total + (row.value ?? 0), 0),
        longestIdle: group.reduce(
          (worst, row) => Math.max(worst, row.days_since_last_movement ?? 0),
          0,
        ),
        unweighed: weighed.unweighed,
      };
    })
    .sort((a, b) => b.tonnes - a.tonnes);
}

/** The bill's customer, never a blank cell. */
function customerOf(bill: { card_name?: string | null }): string {
  return (bill.card_name ?? '').trim() || 'Unnamed customer';
}

/**
 * The consignment a bill belongs to: customer, date, and where it ships from.
 *
 * One function rather than the same template string in two places — the
 * roll-up and the bills shown under a row MUST agree on what a consignment
 * is, or opening a customer would show a different set of bills than the row
 * counted.
 *
 * Warehouse joins the key, not just the row: a consignment that ships from two
 * places is two loads, and grouping them would show one. In practice it almost
 * never splits them further -- 1,306 of 1,308 recent bills draw from a single
 * warehouse.
 */
function consignmentKey(bill: {
  card_name?: string | null;
  warehouses?: string | null;
  plan?: { dispatch_date?: string | null } | null;
}): string {
  return `${customerOf(bill)}|${bill.plan?.dispatch_date ?? ''}|${billWarehouse(bill.warehouses)}`;
}

/** One customer's load for one date out of one warehouse. */
interface Consignment {
  key: string;
  customer: string;
  date: string | null;
  warehouse: string;
  bills: number;
  tonnes: number;
  booked: number;
}

/** The bills waiting to leave, and the bills behind any one of them. */
function PendingDispatchDrill({
  which,
  pending,
  onClose,
}: {
  which: 'pending' | 'planned';
  pending: Board['warehouse']['pendingDispatch'];
  onClose: () => void;
}) {
  /*
   * Which consignment the reader opened, by key rather than by object.
   *
   * The feed refetches while the panel is open, and holding the row object
   * would pin a stale copy of it — the bills underneath would go on saying
   * "awaiting a truck" after one was attached. The key survives a refetch;
   * everything shown is recomputed from the rows that came back.
   */
  const [openKey, setOpenKey] = useState<string | null>(null);

  const bookedBills = pending.rows.filter((bill) => bill.plan?.vehicle_id != null);

  /*
   * One row per consignment, not per bill.
   *
   * A consignment is a customer AND a dispatch date: the same customer
   * legitimately has bills waiting on several days, and those load onto
   * different trucks. Keying on the customer alone would make a group that
   * cannot go together look like one that can.
   *
   * Built in first-appearance order so the feed's own sort still decides
   * what is near the top.
   */
  const consignments = useMemo<Consignment[]>(() => {
    const order: string[] = [];
    const byKey = new Map<string, Consignment>();

    for (const bill of pending.rows) {
      const key = consignmentKey(bill);
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          customer: customerOf(bill),
          date: bill.plan?.dispatch_date ?? null,
          warehouse: billWarehouse(bill.warehouses),
          bills: 0,
          tonnes: 0,
          booked: 0,
        });
        order.push(key);
      }
      const group = byKey.get(key)!;
      group.bills += 1;
      group.tonnes += (bill.total_weight ?? 0) / 1000;
      // The vehicle link, not the status: the status is client-writable and
      // drifts, while the truck being attached is the fact underneath it.
      if (bill.plan?.vehicle_id != null) group.booked += 1;
    }

    return order.map((key) => byKey.get(key)!);
  }, [pending.rows]);

  /*
   * The same bills, cut by where they ship from.
   *
   * A PARTITION, not a tally: every bill lands in exactly one entry, so
   * these tonnes add back up to the headline. A bill drawing on two
   * warehouses gets its own compound entry rather than being counted under
   * each -- counting it twice would make the strip disagree with the figure
   * above it, which is the one thing a drill-down must never do.
   *
   * Ordered heaviest first: on this panel the question is which store the
   * waiting freight is sitting in.
   */
  const byWarehouse = useMemo(() => {
    const totals = new Map<string, { bills: number; tonnes: number }>();
    for (const row of consignments) {
      const slot = totals.get(row.warehouse) ?? { bills: 0, tonnes: 0 };
      slot.bills += row.bills;
      slot.tonnes += row.tonnes;
      totals.set(row.warehouse, slot);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].tonnes - a[1].tonnes)
      .map(([warehouse, totalsFor]) => ({
        key: warehouse,
        label: warehouse,
        value: `${decimal(totalsFor.tonnes, 2)} t`,
        sub: `${whole(totalsFor.bills)} ${totalsFor.bills === 1 ? 'bill' : 'bills'}`,
      }));
  }, [consignments]);

  const open = openKey ? (consignments.find((row) => row.key === openKey) ?? null) : null;
  const openBills = useMemo(
    () => (openKey ? pending.rows.filter((bill) => consignmentKey(bill) === openKey) : []),
    [openKey, pending.rows],
  );

  /*
   * The consignment the reader opened, bill by bill.
   *
   * The same figures as its row upstairs, recomputed from these bills rather
   * than carried down from it: the row above is a roll-up of exactly these
   * bills, so anything that made the two disagree would be worth seeing.
   */
  if (open) {
    const openTonnes = openBills.reduce((total, bill) => total + (bill.total_weight ?? 0), 0) / 1000;
    const openValue = openBills.reduce((total, bill) => total + (bill.doc_total ?? 0), 0);
    const openBooked = openBills.filter((bill) => bill.plan?.vehicle_id != null).length;

    return (
      <OpsDrill
        title={open.customer}
        subtitle={`${open.bills === 1 ? 'The bill' : 'The bills'} waiting at ${open.warehouse}${
          open.date ? ` for ${shortDate(open.date)}` : ''
        }`}
        domain={which === 'planned' ? 'dispatch' : 'warehouse'}
        onBack={() => setOpenKey(null)}
        backLabel="the waiting consignments"
        onClose={onClose}
        stats={[
          { label: 'Bills', value: whole(openBills.length) },
          { label: 'Tonnes', value: decimal(openTonnes, 2) },
          { label: 'On a truck', value: `${whole(openBooked)} of ${whole(openBills.length)}` },
          { label: 'Value', value: money(openValue) },
        ]}
        rows={openBills}
        rowKey={(bill) => String(bill.doc_entry)}
        empty="These bills have left or been cancelled since the panel opened."
        loading={pending.loading}
        columns={[
          { label: 'Invoice', cell: (bill) => bill.doc_num || '—' },
          { label: 'Billed', cell: (bill) => shortDate(bill.doc_date), dim: true },
          { label: 'Boxes', cell: (bill) => whole(bill.total_boxes ?? 0), numeric: true },
          { label: 'Litres', cell: (bill) => whole(bill.total_litres ?? 0), numeric: true },
          {
            label: 'Tonnes',
            cell: (bill) => decimal((bill.total_weight ?? 0) / 1000, 2),
            numeric: true,
          },
          { label: 'Value', cell: (bill) => money(bill.doc_total), numeric: true },
          {
            label: 'Vehicle',
            // The truck, or plainly that there is none — this column is the
            // reason the reader opened the customer.
            cell: (bill) =>
              bill.plan?.vehicle_no?.trim() ? (
                bill.plan.vehicle_no
              ) : (
                <span className="dim">Awaiting a truck</span>
              ),
          },
          {
            label: 'Transporter',
            cell: (bill) => bill.plan?.transporter_name?.trim() || '—',
            dim: true,
          },
          {
            label: 'Status',
            cell: (bill) => BOOKING_STATUS_LABELS[bill.plan?.booking_status ?? ''] ?? '—',
            dim: true,
          },
        ]}
      />
    );
  }

  return (
    <OpsDrill
      title={which === 'planned' ? 'Planned against booked' : 'Pending dispatch'}
      subtitle="Consignments with a dispatch date set that have not left — open one for its bills"
      domain={which === 'planned' ? 'dispatch' : 'warehouse'}
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(pending.tonnes) },
        { label: 'Bills', value: whole(pending.invoices) },
        { label: 'On a truck', value: whole(bookedBills.length) },
        { label: 'Awaiting a truck', value: whole(pending.invoices - bookedBills.length) },
      ]}
      breakdown={{
        title: 'Waiting, by warehouse',
        items: byWarehouse,
        empty: 'No warehouse is holding anything dated to leave.',
      }}
      rows={consignments}
      rowKey={(row) => row.key}
      empty="No bill is dated to leave and still waiting."
      loading={pending.loading}
      onRowClick={(row) => setOpenKey(row.key)}
      columns={[
        { label: 'Customer', cell: (row) => row.customer },
        { label: 'Warehouse', cell: (row) => row.warehouse, dim: true },
        {
          label: 'Dispatch date',
          cell: (row) => (row.date ? shortDate(row.date) : '—'),
          dim: true,
        },
        { label: 'Bills', cell: (row) => whole(row.bills), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true },
        {
          label: 'On a truck',
          // Partly-booked consignments are the ones worth chasing, so the
          // figure is a fraction rather than a tick: "2 of 5" says more
          // than "booked" and costs the same room.
          cell: (row) =>
            row.booked === row.bills ? (
              `${whole(row.bills)} of ${whole(row.bills)}`
            ) : (
              <span className="dim">{`${whole(row.booked)} of ${whole(row.bills)}`}</span>
            ),
          numeric: true,
        },
      ]}
    />
  );
}

/**
 * The rows behind whichever tile was clicked.
 *
 * One component rather than twelve files: every branch is a column list over
 * data the board already holds, and keeping them together is what makes it
 * obvious that they all take their figures from the same place the tiles do.
 *
 * The two dispatch branches are the exception — they fetch, because the board
 * only ever asked the dispatch feed for totals. That fetch is deliberately
 * mounted with the panel, so opening a drill-down costs a request and closing
 * it stops the cost; the board's own load is unchanged.
 */
export function BoardDrill({
  which,
  board,
  scope = LOGISTICS_CONTROL_OIL_SCOPE,
  onClose,
}: BoardDrillProps) {
  switch (which) {
    case 'stock': {
      const stock = board.warehouse.stockTonnage;
      const groups = varietyTotals(board.warehouse.stockRows);

      return (
        <OpsDrill
          title="Stock on hand"
          subtitle={`${scope.warehouse} · finished goods by variety, as SAP holds them`}
          domain="warehouse"
          onClose={onClose}
          stats={[
            { label: 'Tonnes', value: decimal(stock.tonnes) },
            { label: 'Varieties', value: whole(groups.length) },
            { label: 'Items', value: whole(stock.weighedItems + stock.unweighedItems) },
            { label: 'No case weight', value: whole(stock.unweighedItems) },
          ]}
          rows={groups}
          rowKey={(row) => row.variety}
          empty="SAP reported no stock in this warehouse."
          loading={board.warehouse.loading}
          columns={[
            { label: 'Variety', cell: (row) => row.variety },
            { label: 'Items', cell: (row) => whole(row.items), numeric: true },
            { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 1), numeric: true },
            { label: 'Value', cell: (row) => money(row.value), numeric: true },
            {
              label: 'Share',
              numeric: true,
              cell: (row) =>
                stock.tonnes > 0 ? `${decimal((row.tonnes / stock.tonnes) * 100, 1)}%` : '—',
            },
            {
              label: 'Unweighed',
              numeric: true,
              dim: true,
              // Stated per variety, not just once at the top: a variety whose
              // tonnage is missing half its items is a floor, and the total
              // above cannot say which variety that was.
              cell: (row) => (row.unweighed > 0 ? whole(row.unweighed) : '—'),
            },
          ]}
        />
      );
    }

    case 'non-moving': {
      const nonMoving = board.warehouse.nonMoving;
      const groups = idleVarieties(nonMoving.rows, board.warehouse.stockRows);

      return (
        <OpsDrill
          title="Non-moving stock"
          subtitle={`${scope.warehouse} · idle ${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}+ days, by variety`}
          domain="warehouse"
          onClose={onClose}
          stats={[
            { label: 'Tonnes', value: decimal(nonMoving.tonnes) },
            { label: 'Varieties', value: whole(groups.length) },
            { label: 'Items', value: whole(nonMoving.items) },
            {
              label: `${LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS}+ days`,
              value: `${decimal(nonMoving.ageingTonnes)} T`,
            },
          ]}
          rows={groups}
          rowKey={(row) => row.variety}
          empty="Nothing has been idle this long."
          loading={board.warehouse.loading}
          columns={[
            { label: 'Variety', cell: (row) => row.variety },
            { label: 'Items', cell: (row) => whole(row.items), numeric: true },
            { label: 'Quantity', cell: (row) => whole(row.quantity), numeric: true },
            { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 1), numeric: true },
            { label: 'Value', cell: (row) => money(row.value), numeric: true },
            {
              label: 'Share',
              numeric: true,
              cell: (row) =>
                nonMoving.tonnes > 0
                  ? `${decimal((row.tonnes / nonMoving.tonnes) * 100, 1)}%`
                  : '—',
            },
            {
              label: 'Longest idle',
              numeric: true,
              // The worst row in the variety, not its average: the question a
              // variety raises is how long the oldest of it has been standing.
              cell: (row) => `${whole(row.longestIdle)} days`,
            },
            {
              label: 'Unweighed',
              numeric: true,
              dim: true,
              cell: (row) => (row.unweighed > 0 ? whole(row.unweighed) : '—'),
            },
          ]}
        />
      );
    }

    case 'pending':
    case 'planned':
      return (
        <PendingDispatchDrill
          which={which}
          pending={board.warehouse.pendingDispatch}
          onClose={onClose}
        />
      );

    case 'allocated': {
      const allocated = board.warehouse.allocated;
      return (
        <OpsDrill
          title="Allocated stock"
          subtitle={`Declared by the production floor into ${scope.warehouse} today`}
          domain="warehouse"
          onClose={onClose}
          stats={[
            { label: 'Consignments', value: whole(allocated.movements) },
            { label: 'Pieces', value: whole(allocated.pieces) },
            { label: 'Litres', value: whole(allocated.litres) },
          ]}
          rows={allocated.rows}
          rowKey={(row) => String(row.id)}
          empty="The floor has declared nothing into this warehouse today."
          loading={allocated.loading}
          columns={[
            { label: 'Entry', cell: (row) => row.entry_no },
            { label: 'From', cell: (row) => row.from_warehouse, dim: true },
            { label: 'To', cell: (row) => row.destination_display, dim: true },
            { label: 'Vehicle', cell: (row) => row.vehicle_no || '—' },
            { label: 'Reference', cell: (row) => row.reference || '—', dim: true },
            { label: 'Pieces', cell: (row) => whole(row.total_pieces), numeric: true },
            { label: 'Litres', cell: (row) => whole(Number(row.total_litres)), numeric: true },
            { label: 'Date', cell: (row) => shortDate(row.movement_date), dim: true },
          ]}
        />
      );
    }

    case 'unscanned': {
      const unscanned = board.warehouse.unscanned;
      return (
        <OpsDrill
          title="Sent without barcodes"
          subtitle="Dispatched on approval, boxes never scanned — this month"
          domain="dispatch"
          onClose={onClose}
          stats={[
            { label: 'Approvals', value: whole(unscanned.approvals) },
            { label: 'Boxes short', value: whole(unscanned.shortfallBoxes) },
            { label: 'Expected', value: whole(unscanned.expectedBoxes) },
            { label: 'Scanned', value: whole(unscanned.scannedBoxes) },
          ]}
          rows={unscanned.rows}
          rowKey={(row) => String(row.id)}
          empty="Nothing has gone out unscanned this month."
          loading={unscanned.loading}
          columns={[
            { label: 'Entry', cell: (row) => row.entry_no },
            { label: 'Invoice', cell: (row) => row.sap_doc_num || '—' },
            { label: 'Customer', cell: (row) => row.customer_name },
            { label: 'Vehicle', cell: (row) => row.vehicle_no || '—' },
            { label: 'Company', cell: (row) => companyLabel(row.company_code), dim: true },
            { label: 'Expected', cell: (row) => whole(row.expected_boxes), numeric: true },
            { label: 'Scanned', cell: (row) => whole(row.scanned_boxes), numeric: true },
            {
              label: 'Short',
              cell: (row) => whole(Math.max(0, row.expected_boxes - row.scanned_boxes)),
              numeric: true,
            },
            { label: 'Reason', cell: (row) => row.reason || '—', dim: true },
            {
              label: 'Approved',
              cell: (row) => shortDate(row.reviewed_at ?? row.requested_at),
              dim: true,
            },
          ]}
        />
      );
    }

    case 'dispatched-today':
      return (
        <DispatchedDrill
          from={board.today}
          to={board.today}
          title="Dispatched today"
          totalTonnes={board.dispatch.today.tonnes}
          companies={scope.dispatchCompanies}
          onClose={onClose}
        />
      );

    case 'dispatched-month': {
      /*
       * Day by day, not bill by bill.
       *
       * A month of bills is several hundred rows and answers a question nobody
       * asks of a month-to-date figure. The shape that matters here is the one
       * the tile's bars already draw — which days were strong, which were slow,
       * which moved nothing — over the whole month rather than the seven days
       * that fit on the wall.
       */
      const mtd = board.dispatch.monthToDate;
      const days = board.dispatch.trend;
      const best = days.reduce(
        (peak, day) => (day.tonnes > peak.tonnes ? day : peak),
        { date: '', tonnes: 0 },
      );
      const activeDays = days.filter((day) => day.tonnes > 0).length;

      return (
        <OpsDrill
          title="Month to date"
          subtitle={`${shortDate(board.monthStart)} – ${shortDate(board.today)} · day by day`}
          domain="dispatch"
          onClose={onClose}
          stats={[
            { label: 'Tonnes', value: decimal(mtd.tonnes) },
            {
              label: 'Average a day',
              // Over the days that dispatched, not the calendar — the tile's
              // own divisor, so the panel and the subtitle above it agree.
              value:
                mtd.averagePerActiveDay == null ? '—' : decimal(mtd.averagePerActiveDay),
            },
            { label: 'Days dispatching', value: `${whole(activeDays)} of ${whole(days.length)}` },
            { label: 'Best day', value: best.tonnes > 0 ? shortDate(best.date) : '—' },
          ]}
          // Newest first: the question asked of a month-to-date list is what
          // has happened lately, and the reader should not have to scroll to
          // reach today.
          rows={[...days].reverse()}
          rowKey={(row) => row.date}
          empty="Nothing has left the gate this month."
          loading={board.dispatch.loading}
          columns={[
            {
              label: 'Date',
              cell: (row) => (
                <>
                  {shortDate(row.date)}
                  {row.date === board.today && <span className="dim"> · today</span>}
                </>
              ),
            },
            { label: 'Day', cell: (row) => weekday(row.date), dim: true },
            {
              label: 'Tonnes',
              numeric: true,
              // A day that moved nothing shows a dash, not 0.0 — a blank day on
              // a wall reads as a shutdown, which is what it usually is.
              cell: (row) =>
                row.tonnes > 0 ? decimal(row.tonnes, 1) : <span className="dim">—</span>,
            },
            {
              label: 'Trucks',
              numeric: true,
              cell: (row) => (row.trucks > 0 ? whole(row.trucks) : <span className="dim">—</span>),
            },
            {
              label: 'Bills',
              numeric: true,
              cell: (row) =>
                row.bills == null ? (
                  <span className="dim">—</span>
                ) : row.bills > 0 ? (
                  whole(row.bills)
                ) : (
                  <span className="dim">—</span>
                ),
            },
            {
              label: 'Share of month',
              numeric: true,
              cell: (row) =>
                mtd.tonnes > 0 && row.tonnes > 0
                  ? `${decimal((row.tonnes / mtd.tonnes) * 100, 1)}%`
                  : <span className="dim">—</span>,
            },
          ]}
        />
      );
    }

    case 'fleet': {
      const fleet = board.fleet;
      return (
        <OpsDrill
          title="Owned fleet"
          subtitle="Today's duty state, per truck"
          domain="transport"
          onClose={onClose}
          stats={[
            // A dash where no fleet size is configured. Nobody having entered
            // one is not the same as owning no trucks, and this panel lists the
            // registrations that prove it.
            { label: 'Owned', value: fleet.owned == null ? '—' : whole(fleet.owned) },
            { label: 'Free', value: whole(fleet.free) },
            { label: 'On a job', value: whole(fleet.onBst + fleet.onDispatch) },
            { label: 'Off the road', value: whole(fleet.outOfService) },
          ]}
          rows={fleet.vehicles}
          rowKey={(row) => row.vehicle_no}
          empty="No registrations have been entered on the settings screen."
          loading={fleet.loading}
          columns={[
            { label: 'Vehicle', cell: (row) => row.vehicle_no },
            { label: 'State', cell: (row) => VEHICLE_STATE_LABELS[row.state] ?? row.state },
            {
              // "On a branch transfer" is the answer to a question nobody asks
              // on its own; the one that follows is "which one". A truck with
              // no document behind it — at the plant, off the road — shows a
              // rule rather than a blank, so an empty cell is never mistaken
              // for a reference that failed to load.
              label: 'Document',
              cell: (row) => row.reference || <span className="dim">—</span>,
            },
            {
              label: 'Detail',
              cell: (row) => row.detail || <span className="dim">—</span>,
              dim: true,
            },
          ]}
        />
      );
    }

    case 'transit': {
      const transit = board.transit;
      return (
        <OpsDrill
          title="Stock in transit"
          subtitle="Invoiced out, no goods receipt against it in SAP"
          domain="transport"
          onClose={onClose}
          stats={[
            { label: 'Tonnes', value: decimal(transit.totals.tonnes) },
            { label: 'Loads', value: whole(transit.totals.loads) },
            { label: 'Over 7 days', value: whole(transit.bands?.stale.loads ?? 0) },
          ]}
          rows={transit.loads}
          rowKey={(row) => String(row.doc_num)}
          empty="Everything dispatched has been received in SAP."
          loading={transit.loading}
          columns={[
            { label: 'Invoice', cell: (row) => String(row.doc_num) },
            { label: 'Dispatched', cell: (row) => shortDate(row.doc_date), dim: true },
            { label: 'Days out', cell: (row) => whole(row.days_out), numeric: true },
            { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true },
            {
              label: 'Band',
              dim: true,
              cell: (row) =>
                row.band === 'fresh'
                  ? 'Up to 3 days'
                  : row.band === 'ageing'
                    ? '4 – 7 days'
                    : 'Over 7 days',
            },
          ]}
        />
      );
    }

    case 'freight-vendors': {
      const account = board.freight.account;
      return (
        <OpsDrill
          title="Transport account"
          subtitle="What SAP says is owed, by haulier"
          domain="transport"
          onClose={onClose}
          stats={[
            { label: 'Outstanding', value: money(account.outstanding) },
            { label: 'Invoices', value: whole(account.documents) },
            {
              label: 'Oldest',
              value: account.oldestDays == null ? '—' : `${whole(account.oldestDays)} days`,
            },
          ]}
          rows={account.vendors}
          rowKey={(row) => row.card_code}
          empty="SAP reports nothing outstanding to the hauliers."
          loading={account.loading}
          columns={[
            { label: 'Haulier', cell: (row) => row.card_name || row.card_code },
            { label: 'Invoices', cell: (row) => whole(row.documents), numeric: true },
            { label: 'Outstanding', cell: (row) => money(row.outstanding), numeric: true },
            {
              label: 'Oldest',
              cell: (row) => (row.oldest_days == null ? '—' : `${whole(row.oldest_days)} days`),
              numeric: true,
            },
          ]}
        />
      );
    }

    case 'cost-litre': {
      const costLitre = board.dispatch.costPerLitre;
      return (
        <OpsDrill
          title="Cost per litre"
          /* Spend per haulier, not a rate per haulier. SAP cannot say which
             dispatch a freight document paid for, so there are no litres to
             divide one haulier's spend by -- see `byTransporter` on the hook. */
          subtitle="Plant rate above; freight posted in the window, by haulier"
          domain="transport"
          onClose={onClose}
          stats={
            costLitre
              ? [
                  { label: 'Per litre', value: `₹${decimal(costLitre.total, 2)}` },
                  { label: 'Litres priced', value: `${decimal(costLitre.coveragePct, 0)}%` },
                ]
              : undefined
          }
          rows={costLitre?.byTransporter ?? []}
          rowKey={(row) => row.card_code}
          empty="SAP posted no freight for this window."
          columns={[
            { label: 'Haulier', cell: (row) => row.transporter_name || row.card_code },
            { label: 'Service GRPOs', cell: (row) => whole(row.documents), numeric: true },
            { label: 'Freight', cell: (row) => money(row.amount), numeric: true },
          ]}
        />
      );
    }

    default:
      return null;
  }
}

/**
 * Bills that actually left the gate over a window.
 *
 * Its own component so the fetch is mounted with the panel: the board asks the
 * dispatch feed for totals only, and firing a second request for every bill on
 * every board load — on a wall that polls — to serve a panel nobody has opened
 * would be a poor trade.
 *
 * Scoped to the board's own companies rather than the caller's, for the reason
 * given on `DispatchBillFilters.companies`.
 */
function DispatchedDrill({
  from,
  to,
  title,
  totalTonnes,
  companies,
  onClose,
}: {
  from: string;
  to: string;
  title: string;
  totalTonnes: number;
  /** The board's companies — the panel must not answer wider than its tile. */
  companies: readonly string[];
  onClose: () => void;
}) {
  const bills = useDispatchBills({
    from,
    to,
    status: 'DISPATCHED',
    limit: 200,
    offset: 0,
    order: 'newest',
    companies,
  });

  const rows = bills.data?.results ?? [];
  const total = bills.data?.count ?? rows.length;
  // The feed caps a page at 100 rows server-side, whatever this asks for.
  const truncated = total > rows.length;

  /*
   * The same bills, cut by where they shipped from.
   *
   * A PARTITION: every bill lands in exactly one entry, and a bill that drew on
   * two warehouses gets its own compound name rather than being counted under
   * each — the tonnes have to add back to the figure above them.
   *
   * Built only from the rows actually on the page. When the feed has truncated,
   * the strip says so rather than presenting a hundred bills' worth of
   * warehouses as if it were the window's.
   */
  const byWarehouse = (() => {
    const totals = new Map<string, { bills: number; tonnes: number }>();
    for (const row of rows) {
      const warehouse = billWarehouse(row.warehouses);
      const slot = totals.get(warehouse) ?? { bills: 0, tonnes: 0 };
      slot.bills += 1;
      slot.tonnes += (row.dispatched_weight ?? 0) / 1000;
      totals.set(warehouse, slot);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].tonnes - a[1].tonnes)
      .map(([warehouse, totalsFor]) => ({
        key: warehouse,
        label: warehouse,
        value: `${decimal(totalsFor.tonnes, 2)} t`,
        sub: `${whole(totalsFor.bills)} ${totalsFor.bills === 1 ? 'bill' : 'bills'}`,
      }));
  })();

  return (
    <OpsDrill
      title={title}
      subtitle={
        from === to
          ? `${shortDate(from)} · bills through the gate`
          : `${shortDate(from)} – ${shortDate(to)} · bills through the gate`
      }
      domain="dispatch"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(totalTonnes) },
        { label: 'Bills', value: whole(total) },
      ]}
      breakdown={{
        title: truncated
          ? `Left from, by warehouse · first ${whole(rows.length)} of ${whole(total)} bills`
          : 'Left from, by warehouse',
        items: byWarehouse,
        empty: 'No bill on this page carries a warehouse.',
      }}
      rows={rows}
      rowKey={(row) => String(row.id)}
      empty={
        bills.error
          ? 'Could not read the dispatch feed.'
          : 'Nothing has cleared the gate in this window.'
      }
      loading={bills.isLoading}
      columns={[
        { label: 'Invoice', cell: (row) => row.sap_doc_num || row.invoice_number },
        { label: 'Customer', cell: (row) => row.customer_name },
        // Next to the customer rather than at the end: the pair "who, and out
        // of where" is the one a reader scans down.
        { label: 'Warehouse', cell: (row) => billWarehouse(row.warehouses), dim: true },
        { label: 'Vehicle', cell: (row) => row.vehicle_no || '—' },
        { label: 'Transporter', cell: (row) => row.transporter_name || '—', dim: true },
        {
          label: 'Tonnes',
          cell: (row) => decimal((row.dispatched_weight ?? 0) / 1000, 2),
          numeric: true,
        },
        { label: 'Boxes', cell: (row) => whole(row.dispatched_boxes ?? 0), numeric: true },
        { label: 'Gate out', cell: (row) => shortDate(row.last_dispatched_at), dim: true },
      ]}
    />
  );
}
