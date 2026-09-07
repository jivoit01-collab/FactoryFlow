/**
 * What a run consumes per material, added across every product that draws on it.
 *
 * This is the *additive* half of the buildable analysis, and the half that is
 * exact: demand for one component sums cleanly across products in a way that
 * per-product maxima never do. A shortage on a row here blocks every product
 * listed against it, and those products are named so the row can be acted on
 * without going back to the bill of materials.
 *
 * Shared by both screens that ask the question — the plan's day and a run
 * somebody typed in. Two tables answering "how much of this do we have" with
 * different numbers or different rules would be a defect, not a feature, so
 * there is one table and the caller supplies only the sentence that says which
 * run is being measured.
 */
import { Fragment, useState } from 'react';

import { cn } from '@/shared/utils';

import { MATERIAL_TYPE_LABEL } from '../constants';
import type { ProducibleComponent } from '../types';
import { qty, qtyPrecise, toNumber } from './format';

export interface ComponentDemandTableProps {
  rows: ProducibleComponent[];
  /** Says which run these needs belong to. The rules are identical either way. */
  caption: string;
}

export function ComponentDemandTable({ rows, caption }: ComponentDemandTableProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {caption}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Material</th>
              <th className="px-3 py-2 text-right font-medium">Needed</th>
              <th className="px-3 py-2 text-right font-medium">On hand</th>
              <th className="px-3 py-2 text-right font-medium">Committed</th>
              <th className="px-3 py-2 text-right font-medium">Short</th>
              <th className="px-3 py-2 text-right font-medium">Covers</th>
              <th className="px-3 py-2 text-right font-medium">Used by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = open === row.component_code;
              const coverage = toNumber(row.coverage_pct);
              return (
                <Fragment key={row.component_code}>
                  <tr
                    className={cn('border-t', row.is_blocking ? '' : 'text-muted-foreground')}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{row.component_code}</span>
                      <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {row.component_name || '—'} ·{' '}
                        {MATERIAL_TYPE_LABEL[row.material_type] ?? row.material_type}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qtyPrecise(row.needed_qty)}
                      <span className="ml-1 text-[10px] text-muted-foreground">{row.uom}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qty(row.on_hand_qty)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qty(row.committed_qty)}
                      {row.over_committed ? (
                        <div
                          className="text-[10px] text-amber-600 dark:text-amber-400"
                          title="More is reserved in SAP than is physically on hand."
                        >
                          over-committed
                        </div>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right font-mono font-semibold tabular-nums',
                        row.is_blocking ? 'text-destructive' : '',
                      )}
                    >
                      {row.is_blocking ? qty(row.shortage_qty) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'font-mono text-xs font-semibold tabular-nums',
                          coverage >= 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : coverage >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-destructive',
                        )}
                      >
                        {coverage >= 100 ? '100' : row.coverage_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : row.component_code)}
                        className="text-xs text-primary hover:underline"
                      >
                        {row.drawn_by.length} product
                        {row.drawn_by.length === 1 ? '' : 's'}
                      </button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="border-t bg-muted/30">
                      <td colSpan={7} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground">
                            <tr>
                              <th className="py-1 text-left font-medium">Product</th>
                              <th className="py-1 text-right font-medium">Quantity</th>
                              <th className="py-1 text-right font-medium">Per piece</th>
                              <th className="py-1 text-right font-medium">Needs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.drawn_by.map((draw) => (
                              <tr key={draw.item_code} className="border-t">
                                <td className="py-1.5">
                                  <span className="font-mono">{draw.item_code}</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {draw.item_name}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qty(draw.planned_qty)} Pcs
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qtyPrecise(draw.qty_per_unit)}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qtyPrecise(draw.needed_qty)} {row.uom}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nothing matches that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
