import { OpsDrill } from '../../logistics-control/components';
import type {
  DailyQty,
  NonMovingItem,
  OverPurchasedRow,
  PlantBoardResponse,
  PurchaseWorstRow,
  ShiftingRoute,
  ShiftingStage,
  WasteDay,
} from '../types';

/**
 * The rows behind a tile.
 *
 * WHY A WALL BOARD IS CLICKABLE AT ALL. This screen was drawn for a factory TV
 * — full screen, no clicks, re-reading on a timer — and none of that changes:
 * nobody presses a television, and a board left alone behaves exactly as it
 * did. But the same URL is open on desks all day, and there the question that
 * follows every figure is "which ones". Answering it in place is the difference
 * between a board people trust and a board people re-derive in Excel.
 *
 * WHAT A PANEL MAY AND MAY NOT SAY. It opens with the tile's own figures above
 * the rows that make them up, because a drill-down that quietly disagrees with
 * the tile that opened it is worse than no drill-down. Where this feed does not
 * carry the rows behind a figure, the panel SAYS SO and names the page that
 * does, rather than showing an empty table the reader has to interpret. Six of
 * the fourteen tiles are in that position today; each one names its source.
 */

/** Which tile's rows to show. One per openable tile. */
export type PlantDrillKey =
  | 'plan'
  | 'purchased'
  | 'benchmark'
  | 'over-purchased'
  | 'stock-space'
  | 'non-moving'
  | 'pm-vehicles'
  | 'blowing'
  | 'today-lines'
  | 'monthly-planning'
  | 'total-stock'
  | 'wastage'
  | 'declared'
  | 'shipped';

export interface PlantBoardDrillProps {
  which: PlantDrillKey;
  data: PlantBoardResponse | undefined;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Formatting. Deliberately the same rules as the tiles, so a figure does not
// change shape between the card and the panel it opens.
// ---------------------------------------------------------------------------

function whole(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-IN');
}

function decimal(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Rupees, in EXACTLY the board's own shape.
 *
 * A lakh is one decimal here because it is one decimal on the tile. The panel
 * opens with the figure the card was showing, so a rounding rule that differs
 * by a digit makes the drill-down look like it disagrees with the thing that
 * opened it — which is the one failure this panel exists to avoid.
 */
function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

/** An ISO date as a short day. Parsed by hand — `new Date('…')` reads UTC. */
function shortDate(iso: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!parts) return '—';
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][Number(parts[2]) - 1];
  return month ? `${Number(parts[3])} ${month}` : '—';
}

/**
 * A panel for a figure this feed carries no rows for.
 *
 * Not a blank table and not a silence: the stats are real and the empty line
 * names the screen that holds the detail. A reader who clicks and gets nothing
 * stops clicking; one who is told where to look goes there.
 */
const NO_ROWS: { label: string; cell: (row: never) => React.ReactNode }[] = [];

export function PlantBoardDrill({ which, data, onClose }: PlantBoardDrillProps) {
  const purchase = data?.purchase ?? null;
  const store = data?.store ?? null;
  const production = data?.production ?? null;
  const shifting = data?.shifting ?? null;

  // ---------------------------------------------------------------- purchase
  if (which === 'plan' || which === 'benchmark') {
    const isPlan = which === 'plan';
    return (
      <OpsDrill<PurchaseWorstRow>
        title={isPlan ? 'Plan this month' : 'Against benchmark'}
        subtitle={
          isPlan
            ? 'The packing material the plan needs, and what is left to buy'
            : purchase?.benchmark_basis
        }
        domain="purchase"
        onClose={onClose}
        stats={
          isPlan
            ? [
                { label: 'Total PM required', value: money(purchase?.planning_value) },
                { label: 'Already drawn', value: money(purchase?.issued_value) },
                { label: 'PM on hand', value: money(purchase?.on_hand_value) },
                { label: 'On order', value: money(purchase?.open_po_value) },
                { label: 'No price in SAP', value: whole(purchase?.unpriced_count) },
              ]
            : [
                { label: 'SKUs below', value: whole(purchase?.below_benchmark_count) },
                { label: 'Low', value: whole(purchase?.low_count) },
                { label: 'Critical', value: whole(purchase?.critical_count) },
                { label: 'Healthy', value: whole(purchase?.healthy_count) },
                { label: 'Tonnes below', value: decimal(purchase?.below_benchmark_tonnes) },
              ]
        }
        breakdown={{
          title: isPlan ? 'Where the requirement stands' : 'The range',
          items: isPlan
            ? [
                { key: 'drawn', label: 'Already drawn', value: money(purchase?.issued_value) },
                { key: 'hand', label: 'PM on hand', value: money(purchase?.on_hand_value) },
                {
                  key: 'buy',
                  label: 'Still to purchase',
                  value: money(purchase?.short_value),
                  sub: `${whole(purchase?.short_count)} SKUs`,
                },
              ]
            : [
                { key: 'crit', label: 'Critical', value: whole(purchase?.critical_count) },
                { key: 'low', label: 'Low', value: whole(purchase?.low_count) },
                { key: 'ok', label: 'Healthy', value: whole(purchase?.healthy_count) },
              ],
        }}
        rows={purchase?.worst ?? []}
        rowKey={(row) => row.item_code}
        empty="Nothing in the range is short."
        columns={[
          { label: 'Item', cell: (row) => row.item_name },
          { label: 'Code', cell: (row) => row.item_code, dim: true },
          { label: 'Short', cell: (row) => whole(row.short_qty), numeric: true },
          { label: 'Value', cell: (row) => money(row.short_value), numeric: true },
          {
            // A shortfall with an overdue order behind it is a different
            // problem from one with nothing on order: the first is chasing, the
            // second is buying.
            label: 'On order',
            cell: (row) => (row.po_overdue ? 'overdue' : '—'),
            dim: true,
          },
        ]}
      />
    );
  }

  if (which === 'purchased') {
    return (
      <OpsDrill<{ key: string; stage: string; qty: number; value: number }>
        title="Purchased"
        subtitle={purchase?.po_basis}
        domain="purchase"
        onClose={onClose}
        stats={[
          { label: 'Ordered', value: money(purchase?.ordered_value) },
          { label: 'Received', value: money(purchase?.po_received_value) },
          { label: 'Still to come', value: money(purchase?.po_open_value) },
          { label: 'POs raised', value: whole(purchase?.po_count) },
          { label: 'Lines', value: whole(purchase?.po_lines) },
          { label: 'Closed by hand', value: whole(purchase?.po_closed_lines) },
        ]}
        rows={
          purchase
            ? [
                {
                  key: 'ordered',
                  stage: 'Ordered',
                  qty: purchase.ordered_qty,
                  value: purchase.ordered_value,
                },
                {
                  key: 'received',
                  stage: 'Received',
                  qty: purchase.po_received_qty,
                  value: purchase.po_received_value,
                },
                {
                  key: 'open',
                  stage: 'Still to come',
                  qty: purchase.po_open_qty,
                  value: purchase.po_open_value,
                },
              ]
            : []
        }
        rowKey={(row) => row.key}
        empty="No purchase orders were raised in the plan month."
        columns={[
          { label: 'Stage', cell: (row) => row.stage },
          { label: 'Quantity', cell: (row) => whole(row.qty), numeric: true },
          { label: 'Value', cell: (row) => money(row.value), numeric: true },
        ]}
      />
    );
  }

  if (which === 'over-purchased') {
    const over = purchase?.over_purchased_rows ?? [];
    return (
      <OpsDrill<OverPurchasedRow>
        title="Over purchased"
        // The list is capped like every other on this board, so when it is
        // shorter than the count beside it the panel says so AND says where the
        // rest are. A truncated list that does not admit it is a list a buyer
        // will act on believing it is complete.
        subtitle={
          (purchase?.over_purchased_count ?? 0) > over.length
            ? `${purchase?.over_purchase_basis} The worst ${over.length} by value are below; all ${purchase?.over_purchased_count} are on the PM Requirement sheet under its Over-purchased filter.`
            : purchase?.over_purchase_basis
        }
        domain="purchase"
        onClose={onClose}
        stats={[
          // The tile's own headline first, so the two visibly agree. Its
          // caption on the card is loose — the big figure is the over-purchase
          // VALUE, and `over_purchased_qty` is the Req-after-PO quantity. Both
          // are named for what they are here rather than repeating the
          // shorthand, because this is the screen where somebody acts on them.
          { label: 'Over-purchase value', value: money(purchase?.over_purchase_value) },
          { label: 'SKUs over', value: whole(purchase?.over_purchased_count) },
          { label: 'Req after PO', value: `${whole(purchase?.over_purchased_qty)} pcs` },
          { label: 'Listed here', value: whole(over.length) },
        ]}
        breakdown={{
          // WHY each row is over, which the money does not say. An order not
          // due until after the plan closes is surplus later; an overdue one is
          // surplus already paid for; a floor that drew more than the plan
          // asked for is a question about the plan, not about the buying.
          title: 'Why these are over, among the rows listed',
          items: [
            {
              key: 'later',
              label: 'Order lands after the plan closes',
              value: whole(over.filter((row) => row.po_due_after_plan).length),
            },
            {
              key: 'overdue',
              label: 'Order already overdue',
              value: whole(over.filter((row) => row.po_overdue).length),
            },
            {
              key: 'issued',
              label: 'Floor drew more than planned',
              value: whole(over.filter((row) => row.over_issued).length),
            },
          ],
        }}
        rows={over}
        rowKey={(row) => row.item_code}
        empty="Nothing is over-purchased against this plan."
        columns={[
          { label: 'Item', cell: (row) => row.item_name },
          { label: 'Code', cell: (row) => row.item_code, dim: true },
          { label: 'Over by', cell: (row) => whole(row.over_qty), numeric: true },
          { label: 'Value', cell: (row) => money(row.over_value), numeric: true },
          {
            label: 'On order',
            cell: (row) => whole(row.open_po_qty),
            numeric: true,
            dim: true,
          },
          {
            label: 'Why',
            cell: (row) =>
              row.over_issued
                ? 'floor drew more'
                : row.po_overdue
                  ? 'order overdue'
                  : row.po_due_after_plan
                    ? 'lands after the plan'
                    : 'bought over',
            dim: true,
          },
        ]}
      />
    );
  }

  // ------------------------------------------------------------------- store
  if (which === 'stock-space') {
    const area = store?.stock_space.area;
    return (
      <OpsDrill<NonNullable<typeof area>['by_store'][number]>
        title="Stock space"
        subtitle="Measured floor against the stock standing on it, store by store"
        domain="store"
        onClose={onClose}
        stats={[
          { label: 'Floor', value: `${whole(area?.sqft)} sq ft` },
          { label: 'In use', value: `${whole(area?.occupied_sqft)} sq ft` },
          { label: 'Free', value: `${whole(area?.free_sqft)} sq ft` },
          { label: 'Pallets standing', value: whole(area?.pallets) },
          { label: 'Held', value: money(area?.held_value) },
          { label: 'No pallet figure', value: whole(area?.unmeasured_items) },
        ]}
        breakdown={{
          title: 'The floor as it was measured',
          items: (area?.blocks ?? []).map((block) => ({
            key: block.key,
            label: block.label,
            value: `${whole(block.sqft)} sq ft`,
          })),
          empty: 'No floor blocks are configured.',
        }}
        rows={area?.by_store ?? []}
        rowKey={(row) => row.warehouse}
        empty="No packaging store is holding stock."
        columns={[
          { label: 'Store', cell: (row) => row.warehouse },
          { label: 'SKUs', cell: (row) => whole(row.items), numeric: true },
          { label: 'Pieces', cell: (row) => whole(row.pieces), numeric: true },
          { label: 'Pallets', cell: (row) => whole(row.pallets), numeric: true },
          {
            label: 'Floor used',
            cell: (row) =>
              row.occupied_sqft === null ? '—' : `${whole(row.occupied_sqft)} sq ft`,
            numeric: true,
          },
          { label: 'Value', cell: (row) => money(row.value), numeric: true },
        ]}
      />
    );
  }

  if (which === 'non-moving') {
    const idle = store?.non_moving;
    return (
      <OpsDrill<NonMovingItem>
        title="Non-moving stock"
        subtitle={idle?.basis}
        domain="store"
        onClose={onClose}
        stats={[
          { label: 'Idle in the stores', value: money(idle?.total_value) },
          { label: 'SKUs idle', value: whole(idle?.item_count) },
          { label: 'Slow 30–45d', value: whole(idle?.slow_moving_count) },
          { label: 'Non-moving 45d+', value: whole(idle?.non_moving_count) },
          { label: 'Oldest', value: `${whole(idle?.oldest_days)} days` },
          { label: 'Still moving', value: whole(idle?.recent_count) },
        ]}
        breakdown={{
          title: 'By how long it has stood',
          items: [
            {
              key: 'slow',
              label: 'Slow-moving 30–45 days',
              value: money(idle?.slow_moving_value),
              sub: `${whole(idle?.slow_moving_count)} SKUs`,
            },
            {
              key: 'non',
              label: 'Non-moving over 45 days',
              value: money(idle?.non_moving_value),
              sub: `${whole(idle?.non_moving_count)} SKUs`,
            },
          ],
        }}
        rows={idle?.items ?? []}
        rowKey={(row) => row.item_code}
        // The tile counts every idle SKU; the feed lists the worst of them.
        empty="Nothing in the stores has stood still."
        columns={[
          { label: 'Item', cell: (row) => row.item_name },
          { label: 'Code', cell: (row) => row.item_code, dim: true },
          { label: 'Store', cell: (row) => row.warehouses.join(', '), dim: true },
          { label: 'Idle days', cell: (row) => whole(row.days), numeric: true },
          { label: 'Quantity', cell: (row) => whole(row.quantity), numeric: true },
          { label: 'Value', cell: (row) => money(row.value), numeric: true },
        ]}
      />
    );
  }

  if (which === 'pm-vehicles') {
    const vehicles = store?.pm_vehicles_today;
    return (
      <OpsDrill<never>
        title="Packing material in"
        subtitle="Trucks unloaded at the gate today, and what SAP has been told about them"
        domain="store"
        onClose={onClose}
        stats={[
          { label: 'Vehicles', value: whole(vehicles?.count) },
          { label: 'POs', value: whole(vehicles?.po_count) },
          { label: 'Lines', value: whole(vehicles?.line_count) },
          { label: 'Received at the gate', value: whole(vehicles?.received_qty) },
          { label: 'Booked to SAP', value: whole(vehicles?.accepted_qty) },
          { label: 'Rejected', value: whole(vehicles?.rejected_qty) },
        ]}
        breakdown={{
          title: 'What the gate took in',
          items: [
            {
              key: 'booked',
              label: 'Booked to SAP',
              value: whole(vehicles?.accepted_qty),
            },
            { key: 'rejected', label: 'Rejected', value: whole(vehicles?.rejected_qty) },
            {
              key: 'awaiting',
              label: 'Awaiting GRPO',
              value: whole(vehicles?.awaiting_grpo_qty),
              // Stock in the building SAP does not have yet. On a board scoped
              // to today this is usually most of the day's intake, and is not a
              // quality problem.
              sub: 'in the building, not yet in SAP',
            },
          ],
        }}
        rows={[]}
        rowKey={(_row, index) => String(index)}
        empty="The board carries today's totals. The individual vehicles are on the Raw Material Gate-in register."
        columns={NO_ROWS}
      />
    );
  }

  if (which === 'blowing') {
    const blowing = store?.blowing;
    return (
      <OpsDrill<{ date: string; bottles: number }>
        title="Blowing this month"
        subtitle={blowing?.basis}
        domain="store"
        onClose={onClose}
        stats={[
          { label: 'Bottles made', value: whole(blowing?.bottles_made) },
          { label: 'Rejected', value: whole(blowing?.bottles_rejected) },
          { label: 'Cost', value: money(blowing?.cost) },
          { label: 'Per bottle', value: money(blowing?.cost_per_bottle) },
          { label: 'Runs', value: whole(blowing?.runs) },
          { label: 'Not costed yet', value: whole(blowing?.uncosted_runs) },
        ]}
        breakdown={{
          title: 'What the money went on',
          items: [
            { key: 'preform', label: 'Preform', value: money(blowing?.preform_cost) },
            {
              key: 'conversion',
              label: 'Conversion',
              value: money(blowing?.conversion_cost),
            },
          ],
        }}
        rows={blowing?.daily ?? []}
        rowKey={(row) => row.date}
        empty="No blowing run in the window."
        columns={[
          { label: 'Day', cell: (row) => shortDate(row.date) },
          { label: 'Bottles', cell: (row) => whole(row.bottles), numeric: true },
        ]}
      />
    );
  }

  // -------------------------------------------------------------- production
  if (which === 'today-lines') {
    const today = production?.today;
    return (
      <OpsDrill<never>
        title="Today on the lines"
        subtitle="The supervisor's own register — SAP holds no plan for a single day"
        domain="production"
        onClose={onClose}
        stats={[
          { label: 'Planned', value: `${whole(today?.planned_cases)} cases` },
          { label: 'Produced', value: `${whole(today?.produced_cases)} cases` },
          { label: 'Runs', value: whole(today?.runs) },
          { label: 'Lines', value: whole(today?.lines) },
          { label: 'Completed', value: whole(today?.completed_runs) },
          { label: 'In pieces', value: `${whole(today?.produced_qty)} pcs` },
        ]}
        breakdown={{
          title: 'The same day in pieces',
          items: [
            {
              key: 'planned',
              label: 'Planned',
              value: `${whole(today?.planned_qty)} pcs`,
              sub: 'drafts counted as planned',
            },
            {
              key: 'produced',
              label: 'Produced',
              value: `${whole(today?.produced_qty)} pcs`,
              sub: 'open runs read from their segments',
            },
          ],
        }}
        rows={[]}
        rowKey={(_row, index) => String(index)}
        empty="The board carries the day's totals. The individual runs are on the Production Execution screen."
        columns={NO_ROWS}
      />
    );
  }

  if (which === 'monthly-planning') {
    return (
      <OpsDrill<DailyQty>
        title="Monthly planning"
        subtitle="Plan against production, both in pieces, off SAP's own movement journal"
        domain="production"
        onClose={onClose}
        stats={[
          { label: 'Planned', value: `${whole(production?.planned_qty)} pcs` },
          { label: 'Produced', value: `${whole(production?.produced_qty)} pcs` },
          {
            label: 'Attainment',
            value:
              production?.attainment_pct == null ? '—' : `${production.attainment_pct}%`,
          },
          { label: 'Planned', value: `${whole(production?.planned_tons)} t` },
          { label: 'Produced', value: `${whole(production?.produced_tons)} t` },
          { label: 'Days that ran', value: whole(production?.active_days) },
        ]}
        rows={production?.daily ?? []}
        rowKey={(row) => row.date}
        empty="Nothing has been received from production this month."
        columns={[
          { label: 'Day', cell: (row) => shortDate(row.date) },
          { label: 'Pieces', cell: (row) => whole(row.qty), numeric: true },
        ]}
      />
    );
  }

  if (which === 'total-stock') {
    const floor = production?.floor;
    const age = floor?.age;
    return (
      <OpsDrill<never>
        title="Total stock"
        subtitle={floor?.age_basis}
        domain="production"
        onClose={onClose}
        stats={[
          { label: 'At BH-PF', value: `${decimal(floor?.tons)} t` },
          { label: 'Value', value: money(floor?.stock_value) },
          { label: 'SKUs', value: whole(floor?.item_count) },
          { label: 'Pieces', value: whole(floor?.total_pieces) },
          { label: 'Never shipped', value: whole(age?.never_shipped.items) },
          { label: 'No litre volume', value: whole(floor?.unweighed_items) },
        ]}
        breakdown={{
          title: 'Aged on when stock last left',
          items: [
            {
              key: 'fresh',
              label: 'Up to 3 days',
              value: `${decimal(age?.fresh.tons)} t`,
              sub: money(age?.fresh.value),
            },
            {
              key: 'd4_7',
              label: '4–7 days',
              value: `${decimal(age?.d4_7.tons)} t`,
              sub: money(age?.d4_7.value),
            },
            {
              key: 'd7',
              label: 'Over 7 days',
              value: `${decimal(age?.d7_plus.tons)} t`,
              sub: money(age?.d7_plus.value),
            },
            {
              key: 'never',
              label: 'Never shipped',
              value: `${decimal(age?.never_shipped.tons)} t`,
              sub: money(age?.never_shipped.value),
            },
          ],
        }}
        rows={[]}
        rowKey={(_row, index) => String(index)}
        empty="The board carries the floor by age band. The individual SKUs are on the Warehouse Control board."
        columns={NO_ROWS}
      />
    );
  }

  if (which === 'wastage') {
    const waste = production?.wastage;
    return (
      <OpsDrill<WasteDay>
        title="Wastage"
        subtitle={waste?.logged_basis}
        domain="production"
        onClose={onClose}
        stats={[
          { label: 'Packing this month', value: money(waste?.pm_logged_value) },
          { label: 'Raw material', value: money(waste?.rm_logged_value) },
          { label: 'Rows logged', value: whole(waste?.pm_log_count) },
          { label: 'Approved', value: whole(waste?.pm_approved_count) },
          {
            label: 'Paperwork behind',
            value:
              waste?.logged_days_behind == null
                ? '—'
                : `${whole(waste.logged_days_behind)} days`,
          },
          { label: 'Could not be priced', value: whole(waste?.logged_unpriced_count) },
        ]}
        rows={waste?.logged_daily ?? []}
        rowKey={(row) => row.date}
        empty="Nothing has been logged against a run in the window."
        columns={[
          { label: 'Run day', cell: (row) => shortDate(row.date) },
          { label: 'Rows', cell: (row) => whole(row.logs), numeric: true },
          {
            label: 'Packing',
            cell: (row) => money(row.pm_value),
            numeric: true,
          },
          { label: 'Raw material', cell: (row) => money(row.rm_value), numeric: true },
          {
            // The quantities behind the money, each in its own unit — pieces,
            // kilos and metres are never added together.
            label: 'Quantity',
            cell: (row) =>
              [
                row.pm_pieces > 0 ? `${whole(row.pm_pieces)} pcs` : null,
                ...row.pm_other.map((o) => `${whole(o.qty)} ${o.uom}`),
                row.rm_litres > 0 ? `${whole(row.rm_litres)} L` : null,
              ]
                .filter(Boolean)
                .join(', ') || '—',
            dim: true,
          },
          { label: 'Total', cell: (row) => money(row.total_value), numeric: true },
        ]}
      />
    );
  }

  // ---------------------------------------------------------------- shifting
  if (which === 'declared' || which === 'shipped') {
    const isDeclared = which === 'declared';
    const stage: ShiftingStage | undefined = isDeclared
      ? shifting?.allocated
      : shifting?.shipped;
    return (
      <OpsDrill<ShiftingRoute>
        title={isDeclared ? 'Declared today' : 'Shipped today'}
        subtitle={shifting?.basis}
        domain="shifting"
        onClose={onClose}
        stats={[
          {
            label: 'Total',
            value: stage?.tonnage_available
              ? `${decimal(stage?.total_tons)} t`
              : `${whole(stage?.total_pieces)} pcs`,
          },
          { label: 'Pieces', value: whole(stage?.total_pieces) },
          { label: 'Boxes', value: whole(stage?.boxes) },
          {
            label: isDeclared ? 'Declarations' : 'Transfers out',
            value: whole(stage?.transfers),
          },
          { label: 'No litre volume', value: whole(stage?.unweighed_items) },
        ]}
        rows={stage?.routes ?? []}
        rowKey={(row) => row.route}
        empty={
          isDeclared
            ? 'The keeper has declared nothing off the floor today.'
            : 'Nothing has been dispatched off the floor today.'
        }
        columns={[
          {
            label: 'Destination',
            cell: (row) =>
              row.codes?.length ? `${row.name} · ${row.codes.join(', ')}` : row.name,
          },
          { label: 'SKUs', cell: (row) => whole(row.item_count), numeric: true },
          { label: 'Boxes', cell: (row) => whole(row.boxes), numeric: true },
          { label: 'Pieces', cell: (row) => whole(row.pieces), numeric: true },
          {
            label: 'Tonnes',
            cell: (row) => (row.tons === null ? '—' : decimal(row.tons, 2)),
            numeric: true,
          },
        ]}
      />
    );
  }

  return null;
}

export default PlantBoardDrill;
