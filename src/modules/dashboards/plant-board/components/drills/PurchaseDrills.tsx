import { DrillSub, OpsDrill, useExpandedRow } from '../../../logistics-control/components';
import type { OpenPoRow, PlantBoardPurchase, PurchaseWorstRow } from '../../types';
import { decimal, money, shortDate, whole } from './format';

/** When an open order lands, as a buyer reads it. */
function dueLabel(row: OpenPoRow): string {
  if (row.po_overdue) return 'overdue';
  if (row.po_due_after_plan) return 'after the plan';
  return row.po_earliest_due ? shortDate(row.po_earliest_due) : 'no date';
}

/**
 * What is on order against one shortage.
 *
 * The question a shortfall raises is not "how short" — the row says that — but
 * "is anything coming". Both halves are already in this one response, keyed by
 * item code, so the answer is a join rather than a second request. An item with
 * nothing on order says so in words: that is a buying decision, where a
 * shortfall with an overdue order behind it is a chasing one.
 */
function ShortageOrders({ item, orders }: { item: PurchaseWorstRow; orders: OpenPoRow[] }) {
  return (
    <DrillSub
      lede={`What is on order against ${item.item_name}`}
      stats={
        <>
          Short <b>{whole(item.short_qty)}</b> · <b>{money(item.short_value)}</b>
          {item.po_overdue && <> · an order behind it is overdue</>}
        </>
      }
      rows={orders}
      rowKey={(row) => row.item_code}
      empty="Nothing is on order against this item — the whole shortfall is still to buy."
      columns={[
        { label: 'On hand', cell: (row) => whole(row.on_hand_qty), numeric: true, width: '14%' },
        { label: 'On order', cell: (row) => whole(row.open_po_qty), numeric: true, width: '14%' },
        { label: 'Value', cell: (row) => money(row.open_po_value), numeric: true, width: '14%' },
        { label: 'PO lines', cell: (row) => whole(row.po_lines), numeric: true, width: '12%' },
        { label: 'Due', cell: dueLabel, dim: true, width: '16%' },
        {
          // The receipt's own amount — what the company was billed — which is
          // NOT the same kind of rupee as the open value beside it. Named
          // apart so the two are never added together.
          label: 'Landed so far',
          cell: (row) => `${whole(row.received_qty)} · ${money(row.received_value)}`,
          dim: true,
          width: '30%',
        },
      ]}
    />
  );
}

/** The plan's shortages, and what is on order against any one of them. */
export function PurchasePlanDrill({
  which,
  purchase,
  onClose,
}: {
  which: 'plan' | 'benchmark';
  purchase: PlantBoardPurchase | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const isPlan = which === 'plan';
  const orders = purchase?.open_po_rows ?? [];

  return (
    <OpsDrill<PurchaseWorstRow>
      title={isPlan ? 'Plan this month' : 'Against benchmark'}
      subtitle={
        isPlan
          ? 'The packing material the plan needs, and what is left to buy — open one for its orders'
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
      onRowClick={(row) => toggle(row.item_code)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <ShortageOrders
          item={row}
          orders={orders.filter((order) => order.item_code === row.item_code)}
        />
      )}
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

/** One stage of the month's buying. */
interface PurchaseStage {
  key: string;
  stage: string;
  qty: number;
  value: number;
}

/** The month's buying, and the items still to land. */
export function PurchasedDrill({
  purchase,
  onClose,
}: {
  purchase: PlantBoardPurchase | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const orders = purchase?.open_po_rows ?? [];

  const stages: PurchaseStage[] = purchase
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
    : [];

  return (
    <OpsDrill<PurchaseStage>
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
      rows={stages}
      rowKey={(row) => row.key}
      empty="No purchase orders were raised in the plan month."
      onRowClick={(row) => toggle(row.key)}
      /*
       * Only the open stage names its items.
       *
       * The response carries the open order book item by item and the other
       * two stages only as totals — SAP's received and ordered columns are
       * summed on the server and the lines behind them are not sent. So the
       * two stages that cannot answer "which ones" do not offer to.
       */
      canOpenRow={(row) => row.key === 'open' && orders.length > 0}
      expandedKey={openKey}
      renderExpanded={() => (
        <DrillSub
          lede="The items still to land"
          stats={
            <>
              <b>{whole(orders.length)}</b> {orders.length === 1 ? 'item' : 'items'} listed ·{' '}
              <b>{money(purchase?.po_open_value)}</b> still to come
            </>
          }
          rows={orders}
          rowKey={(row) => row.item_code}
          empty="Nothing is on order against this plan."
          columns={[
            { label: 'Item', cell: (row) => row.item_name, width: '38%' },
            { label: 'Code', cell: (row) => row.item_code, dim: true, width: '14%' },
            {
              label: 'On order',
              cell: (row) => whole(row.open_po_qty),
              numeric: true,
              width: '14%',
            },
            {
              label: 'Value',
              cell: (row) => money(row.open_po_value),
              numeric: true,
              width: '16%',
            },
            { label: 'Due', cell: dueLabel, dim: true, width: '18%' },
          ]}
        />
      )}
      columns={[
        { label: 'Stage', cell: (row) => row.stage },
        { label: 'Quantity', cell: (row) => whole(row.qty), numeric: true },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
      ]}
    />
  );
}

/** One line of an item's position — a fact, not a document. */
interface PositionFact {
  key: string;
  label: string;
  qty: string;
  value: string;
  note: string;
}

/**
 * Where one item stands: what is held, what is coming, what has landed.
 *
 * Facts rather than documents, because the response holds no PO line rows —
 * only each item's totals. Saying so as a short table beats an empty one, and
 * it is the shape of the question a buyer asks of a row on this list: against
 * the pile I already have, is this order enough, and is it in time.
 */
function ItemPosition({ row, shortfall }: { row: OpenPoRow; shortfall?: PurchaseWorstRow }) {
  const facts: PositionFact[] = [
    {
      key: 'hand',
      label: 'In the stores',
      qty: whole(row.on_hand_qty),
      value: '—',
      note: 'what the order is adding to',
    },
    {
      key: 'open',
      label: 'Still on order',
      qty: whole(row.open_po_qty),
      value: money(row.open_po_value),
      note: `${whole(row.po_lines)} ${row.po_lines === 1 ? 'line' : 'lines'} · ${dueLabel(row)}`,
    },
    {
      key: 'received',
      label: 'Landed plan-to-date',
      qty: whole(row.received_qty),
      value: money(row.received_value),
      // The goods receipt's own amount: what the company was billed, which is
      // not the same kind of rupee as the open value above it.
      note: 'off the goods receipt, not the order line',
    },
    {
      key: 'short',
      label: 'Short on the plan',
      qty: shortfall ? whole(shortfall.short_qty) : '—',
      value: shortfall ? money(shortfall.short_value) : '—',
      note: shortfall
        ? 'among the plan’s worst shortages'
        : 'not among the plan’s worst shortages',
    },
  ];

  return (
    <DrillSub
      lede={`Where ${row.item_name} stands`}
      stats={
        <>
          <b>{whole(row.open_po_qty)}</b> on order · <b>{money(row.open_po_value)}</b> ·{' '}
          {dueLabel(row)}
        </>
      }
      rows={facts}
      rowKey={(fact) => fact.key}
      empty="Nothing is known about this item."
      columns={[
        { label: 'Position', cell: (fact) => fact.label, width: '24%' },
        { label: 'Quantity', cell: (fact) => fact.qty, numeric: true, width: '16%' },
        { label: 'Value', cell: (fact) => fact.value, numeric: true, width: '18%' },
        { label: 'Read as', cell: (fact) => fact.note, dim: true, width: '42%' },
      ]}
    />
  );
}

/** What is still on order against the plan, and where each item stands. */
export function OpenPosDrill({
  purchase,
  onClose,
}: {
  purchase: PlantBoardPurchase | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const open = purchase?.open_po_rows ?? [];
  const families = purchase?.open_po_families ?? [];
  const worst = purchase?.worst ?? [];

  return (
    <OpsDrill<OpenPoRow>
      title="Open POs"
      // This list is NOT cut to the board's twelve rows: ranked by value, the
      // top twelve are bottles, tins, cartons and caps on every plan, and the
      // label family — nineteen of the sixty-six items on order in September
      // 2026 — never appeared at all. The panel scrolls, so it carries the
      // whole book. The server still guards the payload, so if it ever does
      // come back short the subtitle says so AND says where the rest are: a
      // truncated list that does not admit it is one a buyer will act on
      // believing it is complete.
      subtitle={
        (purchase?.open_po_count ?? 0) > open.length
          ? `Open purchase orders on the plan's packing items, netted off its shortages. The ${open.length} largest are below; all ${purchase?.open_po_count} are on the PM Requirement sheet. ${purchase?.pm_received_basis ?? ''}`
          : `Open purchase orders on the plan's packing items, netted off its shortages. Every item on order is listed, largest first — scroll for the rest. ${purchase?.pm_received_basis ?? ''}`
      }
      domain="purchase"
      onClose={onClose}
      stats={[
        // The tile's own headline first, so the two visibly agree.
        { label: 'Still on order', value: money(purchase?.open_po_value) },
        { label: 'SKUs on order', value: whole(purchase?.open_po_count) },
        { label: 'Overdue', value: whole(purchase?.open_po_overdue_count) },
        // Named "received" and not "arrived value" because it is the goods
        // receipt's own amount — what the company was billed — while the
        // open figure beside it is priced at the item master. Two kinds of
        // rupee, never added together.
        { label: 'Received this month', value: money(purchase?.pm_received_value) },
      ]}
      breakdown={[
        {
          // WHICH PART OF THE BOOK, which the ranking buries. The list is
          // ordered by value and this company's twelve biggest open orders
          // are bottles, tins, cartons and caps every month, so the label
          // family — the largest by SKU count and the cheapest by far — read
          // as nothing on order at all. This strip is the whole population,
          // so a family can be small here but never missing.
          title: 'By packaging family, all on order',
          items: families.map((family) => ({
            key: family.sub_group,
            label: family.sub_group,
            value: money(family.open_po_value),
            sub: `${whole(family.item_count)} ${family.item_count === 1 ? 'item' : 'items'}`,
          })),
          empty: 'Nothing is on order against this plan.',
        },
        {
          // WHEN it lands, which the money does not say. An order already
          // overdue is a chase; one not due until after the plan closes is
          // stock the month that ordered it will never use. Counted over the
          // rows listed, which is now every item on order.
          title: 'When these land',
          items: [
            {
              key: 'overdue',
              label: 'Already overdue',
              value: whole(open.filter((row) => row.po_overdue).length),
            },
            {
              key: 'later',
              label: 'Due after the plan closes',
              value: whole(open.filter((row) => row.po_due_after_plan).length),
            },
            {
              key: 'in-plan',
              label: 'Due inside the plan',
              value: whole(
                open.filter((row) => !row.po_overdue && !row.po_due_after_plan).length,
              ),
            },
          ],
        },
      ]}
      rows={open}
      rowKey={(row) => row.item_code}
      empty="Nothing is on order against this plan."
      onRowClick={(row) => toggle(row.item_code)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <ItemPosition
          row={row}
          shortfall={worst.find((item) => item.item_code === row.item_code)}
        />
      )}
      columns={[
        { label: 'Item', cell: (row) => row.item_name },
        { label: 'Code', cell: (row) => row.item_code, dim: true },
        // Named on the row as well as in the strip: sixty-six rows deep, the
        // family a row belongs to is not readable off its name alone.
        { label: 'Family', cell: (row) => row.sub_group || '—', dim: true },
        { label: 'On hand', cell: (row) => whole(row.on_hand_qty), numeric: true, dim: true },
        { label: 'Open PO', cell: (row) => whole(row.open_po_qty), numeric: true },
        { label: 'Value', cell: (row) => money(row.open_po_value), numeric: true },
        {
          label: 'Received',
          cell: (row) => money(row.received_value),
          numeric: true,
          dim: true,
        },
        { label: 'Due', cell: dueLabel, dim: true },
      ]}
    />
  );
}
