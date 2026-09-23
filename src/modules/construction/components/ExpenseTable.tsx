/**
 * The project's payments, read as a sheet.
 *
 * Built on `shared/components/sheetGrid`, the same kit behind the dispatch
 * sheet and the cash book: **every column carries a funnel and a sort**, so the
 * header row is the whole filter and there is no separate bar of controls above
 * it saying the same thing in different words.
 *
 * Filtering is local rather than server-side. One project's payments arrive
 * whole — there is no paging here — so the lists the funnels offer can be built
 * from the rows themselves, and they can then behave the way a spreadsheet's do:
 * a column's own filter does not narrow its own list, so a second value can be
 * ticked without clearing the first.
 *
 * Narrow screens scroll sideways rather than dropping columns, as the dispatch
 * sheet does: a column that is not there cannot be filtered on, and the funnels
 * are the point of this table.
 */
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  ColumnFilter,
  type ColumnSpec,
  TOTALS_ROW_CLASS,
  useLocalColumns,
} from '@/shared/components/sheetGrid';
import { Button, Checkbox } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useExpenses } from '../api';
import type { Expense } from '../types';
import { CATEGORY_LABELS, formatMoney, formatShortDate } from '../utils';

/** How each column reads, sorts and totals. */
const COLUMNS: { key: string; label: string; align?: 'left' | 'right' }[] = [
  { key: 'spend_date', label: 'Date' },
  { key: 'description', label: 'What for' },
  { key: 'category', label: 'Category' },
  { key: 'paid_to', label: 'Paid to' },
  { key: 'payment_mode', label: 'How' },
  { key: 'state', label: 'Approval' },
  { key: 'amount', label: 'Amount', align: 'right' },
];

const MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK: 'Bank',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CREDIT: 'On credit',
};

const STATE_LABELS: Record<string, string> = {
  OPEN: 'Not sent yet',
  RETURNED: 'Sent back',
  SUBMITTED: 'Waiting',
  APPROVED: 'Approved',
};

export function ExpenseTable({
  projectId,
  canSpend,
  onEdit,
  onRemove,
  selected,
  onSelectedChange,
}: {
  projectId: number;
  canSpend: boolean;
  onEdit: (expense: Expense) => void;
  onRemove: (expense: Expense) => void;
  /** Payments ticked to go for approval. Only unsent ones can be ticked. */
  selected?: number[];
  onSelectedChange?: (next: number[]) => void;
}) {
  // Unfiltered: the funnels do the narrowing, over the rows in hand.
  const { data } = useExpenses(projectId);
  const rows = useMemo(() => data?.results ?? [], [data]);
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const specs: Record<string, ColumnSpec<Expense>> = {
    spend_date: {
      value: (row) => formatShortDate(row.spend_date),
      // The text reads "22 Sept" and would list by its day.
      sortValue: (row) => row.spend_date,
    },
    description: { value: (row) => row.description },
    category: { value: (row) => CATEGORY_LABELS[row.category] },
    paid_to: { value: (row) => row.paid_to },
    payment_mode: { value: (row) => MODE_LABELS[row.payment_mode] ?? row.payment_mode },
    state: { value: (row) => STATE_LABELS[row.batch_status] ?? row.batch_status },
    amount: {
      value: (row) => formatMoney(row.amount),
      // "₹1,00,000" would list by its first digit.
      sortValue: (row) => Number(row.amount),
      total: (row) => Number(row.amount),
    },
  };

  const {
    rows: visible,
    column: columnProps,
    filteredColumns,
    clearFilters,
    totals,
  } = useLocalColumns(rows, specs, { key: 'spend_date', direction: 'desc' }, {
    activeColumn: openColumn,
  });

  // Only what has not gone to the approver yet can be picked, and select-all
  // means "everything I can see" — a filtered table that silently ticked rows
  // outside the filter would send what the reader never looked at.
  const selectable = visible.filter((expense) => canSpend && expense.is_editable);
  const picking = Boolean(onSelectedChange) && selectable.length > 0;
  const ticked = selected ?? [];
  const allTicked =
    selectable.length > 0 && selectable.every((row) => ticked.includes(row.id));

  function toggleAll(next: boolean) {
    if (!onSelectedChange) return;
    const ids = selectable.map((row) => row.id);
    onSelectedChange(
      next
        ? [...new Set([...ticked, ...ids])]
        : ticked.filter((id) => !ids.includes(id)),
    );
  }

  return (
    <div className="space-y-2">
      {filteredColumns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Filtered by {filteredColumns.join(', ')} · {visible.length} of {rows.length}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {picking && (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allTicked}
                    onCheckedChange={toggleAll}
                    aria-label="Select every payment that can be sent"
                  />
                </th>
              )}
              {COLUMNS.map((column) => (
                <ColumnFilter
                  key={column.key}
                  {...columnProps(column.key, column.label, column.align ?? 'left')}
                  onOpen={() => setOpenColumn(column.key)}
                />
              ))}
              {canSpend && <th className="w-8 px-2" />}
            </tr>
          </thead>

          <tbody>
            {/* The total sits at the top: these lists scroll, and a figure you
                have to reach the bottom to see is one nobody reads. */}
            {visible.length > 0 && (
              <tr className={TOTALS_ROW_CLASS}>
                {picking && <td />}
                <td colSpan={6}>
                  {visible.length} payment{visible.length === 1 ? '' : 's'}
                </td>
                <td className="text-right tabular-nums">
                  {formatMoney(String(totals.amount ?? 0))}
                </td>
                {canSpend && <td />}
              </tr>
            )}

            {visible.map((expense) => {
              const editable = canSpend && expense.is_editable;
              const isTicked = ticked.includes(expense.id);
              return (
                <tr
                  key={expense.id}
                  className={cn(
                    'border-b last:border-0',
                    // A tick should be visible from the row, not only from the
                    // box: at a glance you can see which lines are going.
                    isTicked ? 'bg-primary/10' : 'hover:bg-muted/40',
                  )}
                >
                  {picking && (
                    <td className="px-3 py-2">
                      {canSpend && expense.is_editable && (
                        <Checkbox
                          checked={ticked.includes(expense.id)}
                          onCheckedChange={(next) =>
                            onSelectedChange?.(
                              next
                                ? [...ticked, expense.id]
                                : ticked.filter((id) => id !== expense.id),
                            )
                          }
                          aria-label={`Select ${expense.description}`}
                        />
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatShortDate(expense.spend_date)}
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        className="rounded text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label={`Edit ${expense.description}`}
                      >
                        {expense.description}
                      </button>
                    ) : (
                      <span className="font-medium">{expense.description}</span>
                    )}
                    {expense.bill && (
                      <a
                        href={expense.bill}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-xs text-primary hover:underline"
                      >
                        bill
                      </a>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {CATEGORY_LABELS[expense.category]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {expense.paid_to || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {MODE_LABELS[expense.payment_mode] ?? expense.payment_mode}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {STATE_LABELS[expense.batch_status] ?? expense.batch_status}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(expense.amount)}
                  </td>
                  {canSpend && (
                    <td className="px-2">
                      {editable && (
                        <button
                          type="button"
                          aria-label={`Remove ${expense.description}`}
                          className="text-muted-foreground hover:text-rose-600"
                          onClick={() => onRemove(expense)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + (canSpend ? 1 : 0) + (picking ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0
                    ? 'No payments recorded yet.'
                    : 'No payment matches those filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
