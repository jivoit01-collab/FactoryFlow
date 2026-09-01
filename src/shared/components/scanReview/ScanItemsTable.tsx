import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { type ScanRowStatus, ScanStatusBadge } from './ScanStatusBadge';

export interface ScanItemCell {
  primary: ReactNode;
  /**
   * Small sub-lines under the primary value. Muted by default — pass a styled
   * <span> to override (e.g. the amber "+ N PCS loose" note). Nulls are skipped
   * so callers can build the list with conditionals.
   */
  lines?: ReactNode[];
  /** Thin progress bar under the cell content. */
  progress?: { percent: number; tone?: 'ok' | 'over' } | null;
  align?: 'left' | 'right';
}

export interface ScanItemsTableColumn {
  header: ReactNode;
  /** th classes — typically a width, e.g. 'w-[140px]'. */
  className?: string;
  align?: 'left' | 'right';
}

export interface ScanItemsTableRow {
  key: string;
  itemCode: ReactNode;
  itemName: ReactNode;
  /** Small note under the item name (e.g. "Line 4", or why the row is flagged). */
  itemNote?: ReactNode;
  /** Data cells between the Item and Status columns; must align with `columns`. */
  cells: ScanItemCell[];
  /** Drives the row tint and the status badge. */
  status: ScanRowStatus;
  /** Badge text override (e.g. "Short 40 PCS", "Over +3"). */
  statusLabel?: ReactNode;
  /** Makes the row clickable (e.g. open the scanned-boxes panel filtered to it). */
  onClick?: () => void;
}

// Row tint per state — the same colors on every scan review screen.
const ROW_TINTS: Record<ScanRowStatus, string> = {
  open: '',
  exempt: '',
  partial: 'bg-amber-50/60',
  complete: 'bg-emerald-50/60',
  over: 'bg-orange-50/70',
  offBill: 'bg-red-50/70',
};

/**
 * The expected-vs-scanned item table of a scan review, extracted from the
 * dispatch docking scan page so BST (and future flows) share the same look.
 * Purely presentational: each flow tallies its own scans and maps them to rows;
 * the fixed Item Code / Item / Status columns frame the flow's data columns.
 */
export function ScanItemsTable({
  columns,
  rows,
  minWidthClassName = 'min-w-[760px]',
  emptyMessage = 'No item lines on this bill.',
  /** Red footer strip for anomalies (e.g. scanned boxes outside the bill). */
  footnote,
}: {
  columns: ScanItemsTableColumn[];
  rows: ScanItemsTableRow[];
  minWidthClassName?: string;
  emptyMessage?: string;
  footnote?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className={cn('w-full text-sm', minWidthClassName)}>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'p-3 font-medium',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
            <th className="w-[130px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={row.onClick}
              title={row.onClick ? 'View scanned boxes' : undefined}
              className={cn(
                'border-b last:border-b-0',
                ROW_TINTS[row.status],
                row.onClick && 'cursor-pointer transition-colors hover:bg-muted/40',
              )}
            >
              <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                {row.itemCode}
              </td>
              <td className="p-3 align-top">
                <div className="font-medium">{row.itemName}</div>
                {row.itemNote ? (
                  <div className="mt-1 text-xs text-muted-foreground">{row.itemNote}</div>
                ) : null}
              </td>
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={cn(
                    'p-3 align-top',
                    cell.align === 'right' && 'whitespace-nowrap text-right tabular-nums',
                  )}
                >
                  <div className="font-medium">{cell.primary}</div>
                  {(cell.lines ?? []).map((line, lineIndex) =>
                    line == null ? null : (
                      <div key={lineIndex} className="text-xs text-muted-foreground">
                        {line}
                      </div>
                    ),
                  )}
                  {cell.progress ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          cell.progress.tone === 'over' ? 'bg-orange-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${cell.progress.percent}%` }}
                      />
                    </div>
                  ) : null}
                </td>
              ))}
              <td className="p-3 align-top">
                <ScanStatusBadge status={row.status} label={row.statusLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {footnote ? (
        <div className="border-t bg-red-50 p-2 text-xs text-red-700">{footnote}</div>
      ) : null}
    </div>
  );
}
