import { Sigma } from 'lucide-react';

import { formatNumber } from '@/shared/utils';

import type { ColumnTotal } from '../utils/totals';

interface Props {
  totals: ColumnTotal[];
  /** How many rows went into these totals. */
  rowCount: number;
  /** Everything the report returned, so a filtered total can say so. */
  totalRowCount: number;
  /** The totals cover ticked rows rather than everything on screen. */
  isSelection: boolean;
}

/**
 * The column totals, above the grid.
 *
 * Reading a credit-note or dispatch report ends in the same question every
 * time — how many litres, how many boxes, how many pieces — and the answer used
 * to mean exporting the rows to Excel and adding them there. It follows the
 * search and the ticks, because a total of rows you are not looking at is a
 * different report's answer.
 */
export function ReportTotalsBar({ totals, rowCount, totalRowCount, isSelection }: Props) {
  if (!totals.length) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Sigma className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Totals
        </span>
        <span className="text-xs text-muted-foreground">
          {caption(rowCount, totalRowCount, isSelection)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {totals.map((total) => (
          <div key={total.column.key} className="min-w-[7rem]">
            <div className="truncate text-xs text-muted-foreground" title={total.column.label}>
              {total.column.label}
            </div>
            <div className="text-lg font-semibold tabular-nums">{formatTotal(total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function caption(rowCount: number, totalRowCount: number, isSelection: boolean): string {
  const rows = `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'}`;
  if (isSelection) return `${rows} selected`;
  if (rowCount < totalRowCount)
    return `${rows} of ${totalRowCount.toLocaleString()} — search applied`;
  return `all ${rows}`;
}

/** Whole totals stay whole; the rest carry two decimals — as the cells do. */
function formatTotal({ total, isWhole }: ColumnTotal): string {
  return isWhole ? total.toLocaleString() : formatNumber(total);
}
