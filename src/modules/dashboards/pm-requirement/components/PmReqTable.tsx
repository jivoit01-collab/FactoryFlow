import { ChevronDown, ChevronsUpDown, ChevronUp, Clock, TriangleAlert } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  COLUMN_HELP,
  formatDay,
  OVER_PURCHASE_NOTE,
  PM_REQ_COLUMNS,
  STATUS_LABELS,
} from '../constants';
import type { PmReqRow, PmReqSort, PmReqSortKey } from '../types';
import {
  formatInrCompact,
  formatQty,
  formatSigned,
  overPurchaseKind,
  rowStatus,
  visibleTotals,
} from '../utils';

export interface PmReqTableProps {
  rows: PmReqRow[];
  sort: PmReqSort;
  onSortChange: (key: PmReqSortKey) => void;
  isLoading: boolean;
  onOpenRow: (row: PmReqRow) => void;
  /** Shown when the filter has hidden everything. */
  emptyMessage: string;
}

const STATUS_STYLES: Record<string, string> = {
  short:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
  'po-risk':
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
  'po-covered':
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  'over-issued':
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  covered:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }
  return dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

/**
 * A signed figure, coloured only where the sign carries a decision.
 *
 * `Req` and `REQ after PO` go red when negative because that is a shortage
 * somebody has to close. The other columns are never coloured: a big
 * `Planning` is not good or bad, and colouring every number leaves nothing
 * standing out.
 */
function SignedCell({ value, emphasise }: { value: number; emphasise?: boolean }) {
  const short = value < 0;
  return (
    <span
      className={cn(
        'tabular-nums',
        emphasise && 'font-semibold',
        short
          ? 'text-rose-600 dark:text-rose-400'
          : emphasise && value > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : undefined,
      )}
    >
      {formatSigned(value)}
    </span>
  );
}

export function PmReqTable({
  rows,
  sort,
  onSortChange,
  isLoading,
  onOpenRow,
  emptyMessage,
}: PmReqTableProps) {
  const totals = visibleTotals(rows);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* The table is nine numeric columns wide and scrolls sideways on its
          own rather than pushing the page out. The first two columns are
          sticky, because a code and a description scrolled out of view make
          the numbers unreadable. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {PM_REQ_COLUMNS.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-medium',
                    column.numeric ? 'text-right' : 'text-left',
                    index === 0 && 'sticky left-0 z-20 bg-muted/40',
                    index === 1 && 'sticky left-[112px] z-20 bg-muted/40',
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                      column.numeric && 'w-full justify-end',
                    )}
                    title={COLUMN_HELP[column.key]}
                    onClick={() => onSortChange(column.key as PmReqSortKey)}
                  >
                    {column.label}
                    <SortIcon active={sort.key === column.key} dir={sort.dir} />
                  </button>
                </th>
              ))}
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-left">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
              </th>
            </tr>
          </thead>

          <tbody className={cn(isLoading && 'opacity-60 transition-opacity')}>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={PM_REQ_COLUMNS.length + 1}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status = rowStatus(row);
                return (
                  <tr
                    key={row.item_code}
                    className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40"
                    onClick={() => onOpenRow(row)}
                    title="Open to see which products drive this figure"
                  >
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 font-mono text-xs">
                      {row.item_code}
                    </td>
                    <td className="sticky left-[112px] z-10 max-w-[280px] bg-card px-3 py-2">
                      <span className="block truncate font-medium" title={row.item_name}>
                        {row.item_name || '—'}
                      </span>
                      {row.sub_group && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.sub_group}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatQty(row.planning_qty)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatQty(row.issued_pc_qty)}
                      {/* Blown or made in-house rather than drawn from the
                          stores. Worth marking: it never depleted BH-BS or
                          BH-PM, so the row is not a buying signal. */}
                      {row.issued_produced_qty > 0 && (
                        <span
                          className="ml-1 text-[10px] uppercase text-violet-600 dark:text-violet-400"
                          title={`${formatQty(row.issued_produced_qty)} of this was made in-house, not drawn from the stores`}
                        >
                          in-house
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <SignedCell value={row.rest_planning_qty} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatQty(row.on_hand_qty)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <SignedCell value={row.req_qty} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.open_po_qty ? (
                        <span
                          className="inline-flex items-center gap-1"
                          title={
                            row.po_earliest_due
                              ? `${row.po_lines} open line${row.po_lines === 1 ? '' : 's'}, earliest due ${formatDay(row.po_earliest_due, true)}`
                              : `${row.po_lines} open line${row.po_lines === 1 ? '' : 's'}, no due date`
                          }
                        >
                          {(row.po_overdue || row.po_due_after_plan) && (
                            <Clock className="h-3 w-3 shrink-0 text-orange-500" />
                          )}
                          {formatQty(row.open_po_qty)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {/* The excess sits under the order it is part of, not in
                          a column of its own: it is a reading of THIS number
                          against the requirement, and a tenth column would
                          push the table wider for a figure that is zero on
                          most rows. */}
                      {row.over_purchased && (
                        <span
                          className="block text-[11px] tabular-nums text-amber-600 dark:text-amber-400"
                          title={`${formatQty(row.to_buy_qty)} still to buy against a ${formatQty(
                            row.open_po_qty,
                          )} order — ${OVER_PURCHASE_NOTE[overPurchaseKind(row)]}`}
                        >
                          +{formatQty(row.over_purchase_qty)} over
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <SignedCell value={row.req_after_po_qty} emphasise />
                      {row.short_value > 0 && (
                        <span className="block text-[11px] tabular-nums text-muted-foreground">
                          {formatInrCompact(row.short_value)}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge variant="outline" className={cn('text-xs', STATUS_STYLES[status])}>
                        {status === 'short' && <TriangleAlert className="mr-1 h-3 w-3 shrink-0" />}
                        {STATUS_LABELS[status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals for what is ON SCREEN, not for the whole plan — a footer
              that summed all 196 components under a filtered table would not
              add up to the column above it. The shortfall is summed as a
              positive magnitude so a surplus row cannot cancel a short one,
              which is why it sits in its own cell rather than under `Req`. */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-medium">
                <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2.5 text-xs">Shown</td>
                <td className="sticky left-[112px] z-10 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                  {totals.item_count} {totals.item_count === 1 ? 'component' : 'components'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQty(totals.planning_qty)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQty(totals.issued_pc_qty)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQty(totals.rest_planning_qty)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQty(totals.on_hand_qty)}
                </td>
                {/* Deliberately not a sum: adding signed requirements across
                    items is meaningless, because spare caps are not missing
                    cartons. The hover says so, so it does not read as a
                    figure that failed to calculate. */}
                <td
                  className="px-3 py-2.5 text-right text-xs text-muted-foreground"
                  title="Deliberately not totalled: adding signed requirements across components is meaningless, because spare caps are not missing cartons."
                >
                  —
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatQty(totals.open_po_qty)}
                  {totals.over_purchased_count > 0 && (
                    <span
                      className="block text-[11px] tabular-nums text-amber-600 dark:text-amber-400"
                      title={`${formatInrCompact(
                        totals.over_purchase_value,
                      )} on order beyond what the plan needs, across ${
                        totals.over_purchased_count
                      } component${totals.over_purchased_count === 1 ? '' : 's'}`}
                    >
                      +{formatQty(totals.over_purchase_qty)} over
                    </span>
                  )}
                </td>
                {/* The column added straight down, which is what somebody
                    reading a footer expects -- with the shortfall kept under
                    it, because the sum alone would mislead in one specific
                    way. It NETS: 84,000 spare labels and 50 missing cartons
                    total to a comfortable +83,950, and nobody can make the
                    plan with it. The sub-line is what has to be bought, and
                    is summed as a magnitude so no surplus can cancel it. */}
                <td
                  className="px-3 py-2.5 text-right"
                  title={
                    totals.short_qty > 0
                      ? `The column added up: ${formatQty(totals.req_after_po_qty)}. It nets, so a surplus on one component offsets a shortage on another — ${formatQty(totals.short_count)} of the ${totals.item_count} components shown are short by ${formatQty(totals.short_qty)} in total, and that is the figure to buy against.`
                      : `The column added up: ${formatQty(totals.req_after_po_qty)}. None of the components shown is short once its open orders are counted.`
                  }
                >
                  <SignedCell value={totals.req_after_po_qty} emphasise />
                  {totals.short_qty > 0 ? (
                    <span className="block text-[11px] tabular-nums text-rose-600 dark:text-rose-400">
                      {formatQty(totals.short_qty)} short · {formatInrCompact(totals.short_value)}
                    </span>
                  ) : (
                    <span className="block text-[11px] text-muted-foreground">nothing short</span>
                  )}
                </td>
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
