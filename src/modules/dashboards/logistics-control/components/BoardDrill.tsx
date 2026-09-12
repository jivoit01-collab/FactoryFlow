import { useDispatchBills } from '../../dispatch-fulfilment/api';
import type { NonMovingItem } from '../../non-moving/types';
import type { WarehouseOccupancyItem } from '../../production-control/types';
import {
  LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  LOGISTICS_CONTROL_WAREHOUSE,
} from '../constants';
import type { useLogisticsControlBoard } from '../hooks';
import { weighItems } from '../utils';
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
export function BoardDrill({ which, board, onClose }: BoardDrillProps) {
  switch (which) {
    case 'stock': {
      const stock = board.warehouse.stockTonnage;
      const groups = varietyTotals(board.warehouse.stockRows);

      return (
        <OpsDrill
          title="Stock on hand"
          subtitle={`${LOGISTICS_CONTROL_WAREHOUSE} · finished goods by variety, as SAP holds them`}
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
          subtitle={`${LOGISTICS_CONTROL_WAREHOUSE} · idle ${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}+ days, by variety`}
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
    case 'planned': {
      const pending = board.warehouse.pendingDispatch;
      const booked = pending.rows.filter((bill) => bill.plan?.vehicle_id != null);
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
      const consignments = (() => {
        const order: string[] = [];
        const byKey = new Map<
          string,
          {
            key: string;
            customer: string;
            date: string | null;
            bills: number;
            tonnes: number;
            booked: number;
          }
        >();

        for (const bill of pending.rows) {
          const customer = (bill.card_name ?? '').trim() || 'Unnamed customer';
          const date = bill.plan?.dispatch_date ?? null;
          const key = `${customer}|${date ?? ''}`;
          if (!byKey.has(key)) {
            byKey.set(key, { key, customer, date, bills: 0, tonnes: 0, booked: 0 });
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
      })();

      return (
        <OpsDrill
          title={which === 'planned' ? 'Planned against booked' : 'Pending dispatch'}
          subtitle="Consignments with a dispatch date set that have not left"
          domain={which === 'planned' ? 'dispatch' : 'warehouse'}
          onClose={onClose}
          stats={[
            { label: 'Tonnes', value: decimal(pending.tonnes) },
            { label: 'Bills', value: whole(pending.invoices) },
            { label: 'On a truck', value: whole(booked.length) },
            { label: 'Awaiting a truck', value: whole(pending.invoices - booked.length) },
          ]}
          rows={consignments}
          rowKey={(row) => row.key}
          empty="No bill is dated to leave and still waiting."
          loading={pending.loading}
          columns={[
            { label: 'Customer', cell: (row) => row.customer },
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

    case 'allocated': {
      const allocated = board.warehouse.allocated;
      return (
        <OpsDrill
          title="Allocated stock"
          subtitle={`Declared by the production floor into ${LOGISTICS_CONTROL_WAREHOUSE} today`}
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
  onClose,
}: {
  from: string;
  to: string;
  title: string;
  totalTonnes: number;
  onClose: () => void;
}) {
  const bills = useDispatchBills({
    from,
    to,
    status: 'DISPATCHED',
    limit: 200,
    offset: 0,
    order: 'newest',
    companies: LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  });

  const rows = bills.data?.results ?? [];

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
        { label: 'Bills', value: whole(bills.data?.count ?? rows.length) },
      ]}
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
