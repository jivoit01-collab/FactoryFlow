import { cn, formatNumber } from '@/shared/utils';

import type { SapReportColumn } from '../api';
import type { ColumnTotal } from '../utils/totals';

interface Props {
  columns: SapReportColumn[];
  totals: ColumnTotal[];
  /** How many rows went into these totals. */
  rowCount: number;
  /** The totals cover ticked rows rather than everything the search left. */
  isSelection: boolean;
  /** The search has narrowed the result, so these are not the report's totals. */
  isFiltered: boolean;
}

/**
 * The column totals, as a row sitting on top of the headings.
 *
 * Reading a credit-note or dispatch report ends in the same question every
 * time — how many litres, how many boxes, how many pieces — and the answer used
 * to mean exporting the rows to Excel and adding them there. Each total sits in
 * its own column, where the eye already is, rather than in a separate panel the
 * reader has to match back to the grid by name.
 *
 * It rides inside the sticky header, so it stays put as the rows scroll under it.
 */
export function ReportTotalsRow({ columns, totals, rowCount, isSelection, isFiltered }: Props) {
  if (!totals.length) return null;

  const byColumn = new Map(totals.map((total) => [total.index, total]));
  // The label goes at the far left, as it would on a spreadsheet — unless the
  // first column is itself being added up, in which case the tick column is the
  // only space left for it.
  const labelInFirstColumn = !byColumn.has(0);
  const label = isSelection ? 'Selected total' : isFiltered ? 'Filtered total' : 'Total';
  const rows = `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'} added up`;

  return (
    <tr className="border-b bg-muted" aria-label="Column totals">
      <td className="whitespace-nowrap px-3 py-1.5" title={rows}>
        {!labelInFirstColumn && <span className={labelClass}>{label}</span>}
      </td>
      {columns.map((column, index) => {
        const total = byColumn.get(index);
        return (
          <td
            key={column.key}
            className={cn(
              'whitespace-nowrap px-3 py-1.5',
              total ? 'text-right font-semibold tabular-nums' : 'text-left',
            )}
            title={total ? rows : undefined}
          >
            {total ? (
              formatTotal(total)
            ) : index === 0 && labelInFirstColumn ? (
              <span className={labelClass} title={rows}>
                {label}
              </span>
            ) : null}
          </td>
        );
      })}
    </tr>
  );
}

const labelClass = 'text-xs font-medium uppercase tracking-wide text-muted-foreground';

/** Whole totals stay whole; the rest carry two decimals — as the cells do. */
function formatTotal({ total, isWhole }: ColumnTotal): string {
  return isWhole ? total.toLocaleString() : formatNumber(total);
}
