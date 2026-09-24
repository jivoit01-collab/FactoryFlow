import { DrillSub, OpsDrill, useExpandedRow } from '../../logistics-control/components';
import { ADMIN_COST_COLOURS } from '../constants';
import type { AdminCost, AdminCostRow, AdminCostSlice } from '../types';
import { money, NO_VALUE, num, pctRough } from '../utils';

/**
 * Today's figure for one row, or why there is not one.
 *
 * THREE OUTCOMES, AND THE LAST TWO ARE NOT THE SAME.
 *   - A figure: the money.
 *   - `nil`: the source was read and says nothing was spent. A meter read on a
 *     day the line drew no power is a real nil.
 *   - A rule: the source cannot say. Maintenance's line items carry no date of
 *     their own, so what one of them cost today is not in this payload, and
 *     `nil` would answer a question nobody asked.
 *
 * Rendering both as a dash — which this did first — throws away exactly the
 * distinction the rest of the board is built to keep.
 */
function rowToday(value: number | null | undefined): string {
  const amount = num(value);
  if (amount === null) return NO_VALUE;
  return amount > 0 ? money(amount) : 'nil';
}

/**
 * The rows behind one cost line.
 *
 * The lede carries the line's BASIS — why this line differs from the same line
 * on the Factory Expense wall board. That note is the thing a reader who has
 * both screens open needs most, and it belongs where the rows are: it is an
 * explanation of what they are looking at, not an alert.
 *
 * TWO KINDS OF ROW LIST, AND THE HEAD SAYS WHICH. On every line the server
 * currently sends, the rows ARE the line, split: adding them up and printing
 * the total beside the line's own is how a panel disagreeing with the tile
 * that opened it becomes visible instead of hidden. The other kind is a list
 * that is CONTEXT — rows the line was read against, one of which is the line
 * — and summing those would state a rival total for a month the tile has just
 * priced differently. Electricity was that until the server moved it onto
 * Oil's sub-meters, which add up; the branch stays because this repo and the
 * backend deploy separately. `rows_sum_to_line` is the payload saying which of
 * the two it is; where it is false the head names the row the line was priced
 * from instead of stating a total.
 */
function CostLineRows({ slice }: { slice: AdminCostSlice }) {
  // `rows` may be absent rather than empty — see `AdminCostSlice.rows`. Both
  // read as "nothing behind this line", which `empty` below already states.
  const rows = slice.rows ?? [];
  const monthSum = rows.reduce((total, row) => total + row.amount, 0);
  const todaySum = rows.reduce((total, row) => total + (row.today ?? 0), 0);
  const lineRow = rows.find((row) => row.is_line);
  const count = (
    <>
      <b>{rows.length}</b> {rows.length === 1 ? 'row' : 'rows'}
    </>
  );

  return (
    <DrillSub
      lede={slice.basis ?? `What makes up ${slice.label.toLowerCase()} this month`}
      stats={
        // Recomputed from these rows rather than carried down from the line,
        // so that anything which made the two disagree is visible instead of
        // hidden — but only where they are the line's own parts. See above.
        slice.rows_sum_to_line === false ? (
          <>
            {count} · the line is {lineRow ? <b>{lineRow.label}</b> : 'one of them'} at{' '}
            <b>{money(slice.amount)}</b>
          </>
        ) : (
          <>
            {count} · <b>{money(monthSum)}</b> this month · <b>{money(todaySum)}</b> today
          </>
        )
      }
      rows={rows}
      rowKey={(row: AdminCostRow) => row.label}
      empty={slice.warning ?? `Nothing is booked to ${slice.label.toLowerCase()} this month.`}
      columns={[
        {
          label: 'What',
          // The row the line was priced from, named as such. Size does not say
          // it: the biggest meter here is KVAH, which is the grid's own KWH
          // counted again as apparent energy and never the line.
          cell: (row: AdminCostRow) =>
            row.is_line ? (
              <>
                <strong>{row.label}</strong> · the line
              </>
            ) : (
              row.label
            ),
          width: '34%',
        },
        {
          label: 'In its own unit',
          cell: (row: AdminCostRow) => row.detail ?? NO_VALUE,
          dim: true,
          width: '30%',
        },
        {
          label: 'This month',
          cell: (row: AdminCostRow) => money(row.amount),
          numeric: true,
          width: '18%',
        },
        {
          label: 'Today',
          cell: (row: AdminCostRow) => rowToday(row.today),
          numeric: true,
          width: '18%',
        },
      ]}
    />
  );
}

export interface AdminCostDrillProps {
  cost: AdminCost;
  /** The window the figures cover, as the tile prints it. */
  period: string;
  onClose: () => void;
}

/**
 * What the month's money went on, and what each line is made of.
 *
 * The donut answers "what share of the bill is each of these" and nothing more:
 * it has four arcs and a legend, and the questions that follow any arc —
 * WHICH departments, WHICH meters, and why this line reads differently from the
 * same line on the expense wall — have nowhere to land on a tile that size.
 * They land here.
 *
 * ONE LINE OPENS AT A TIME, IN PLACE. A reader comparing two cost lines should
 * not have to close the first to see the second, and should not lose the list
 * of four while looking at one of them.
 *
 * A LINE WITH NOTHING BEHIND IT DOES NOT OFFER TO OPEN. Maintenance is usually
 * nil, and a chevron beside it would promise a list that cannot exist — the
 * same rule the tiles follow, one level down.
 */
export function AdminCostDrill({ cost, period, onClose }: AdminCostDrillProps) {
  const { openKey, toggle } = useExpandedRow();

  const unsourced = cost.slices.filter((slice) => !slice.has_source);

  return (
    <OpsDrill
      title="Factory cost"
      subtitle={`${period} · four cost lines — open one for what it is made of`}
      // The Cost band's own hue, so the panel is visibly the tile just clicked.
      domain="transport"
      onClose={onClose}
      stats={[
        { label: 'This month', value: money(cost.total) },
        { label: 'Today', value: money(cost.today_total) },
        { label: 'A day, on average', value: money(cost.avg_per_day) },
        {
          label: 'Unsourced lines',
          value: unsourced.length ? unsourced.map((slice) => slice.label).join(', ') : 'none',
        },
      ]}
      rows={cost.slices}
      rowKey={(slice: AdminCostSlice) => slice.key}
      empty="The expense registers could not be read."
      onRowClick={(slice: AdminCostSlice) => toggle(slice.key)}
      canOpenRow={(slice: AdminCostSlice) => (slice.rows?.length ?? 0) > 0}
      expandedKey={openKey}
      renderExpanded={(slice: AdminCostSlice) => <CostLineRows slice={slice} />}
      columns={[
        {
          label: 'Cost line',
          cell: (slice: AdminCostSlice) => (
            <span className="adm-dline">
              {/* The donut's own hue for this line, so a reader arriving from
                  an arc lands on the row they clicked. Never the only
                  encoding — the label is right beside it. */}
              <i style={{ background: ADMIN_COST_COLOURS[slice.key] }} />
              {slice.label}
            </span>
          ),
        },
        {
          label: 'In its own unit',
          cell: (slice: AdminCostSlice) => slice.detail ?? NO_VALUE,
          dim: true,
        },
        {
          label: 'This month',
          cell: (slice: AdminCostSlice) => money(slice.amount),
          numeric: true,
        },
        {
          label: 'Share',
          cell: (slice: AdminCostSlice) =>
            slice.amount > 0 ? pctRough(slice.share_pct) : slice.warning ? 'no rate' : 'nil',
          numeric: true,
          dim: true,
        },
        {
          label: 'Today',
          // The reason in place of the figure where there is no figure — a
          // meter nobody has read today is not a day the plant drew no power.
          cell: (slice: AdminCostSlice) =>
            slice.today > 0 ? money(slice.today) : (slice.today_detail ?? 'nil'),
          numeric: true,
        },
      ]}
    />
  );
}
