import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';

import { cn, getErrorMessage } from '@/shared/utils';

import { useFillingCostBoard } from '../api';
import type { FillingCostSkuMonth } from '../types';
import { count, rate, rupees } from '../utils/format';

/** '2026-09-28' → '28 Sep, Mon'. */
function shortDay(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}, ${d.toLocaleDateString('en-IN', { weekday: 'short' })}`;
}

const skuKey = (sku: FillingCostSkuMonth) =>
  `${sku.product}|${sku.pieces_per_case ?? ''}|${sku.litres_per_piece ?? ''}`;

/**
 * The month's filling cost SKU by SKU: how many days each ran, its boxes and
 * its average cost a box and a bottle, opening onto the days it ran. A day
 * that ran several SKUs splits its sheet between them by boxes.
 *
 * `date` picks the month, the same one the sheet above it shows.
 */
export function FillingCostSkuPanel({ date }: { date: string }) {
  const { data, isLoading, isError, error } = useFillingCostBoard(date.slice(0, 7), date);
  const [open, setOpen] = useState<string | null>(null);

  const skus = data?.skus ?? [];
  const month = new Date(`${date.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section
      aria-label="Filling cost by SKU"
      className="mt-6 rounded-3xl border border-black/[0.09] bg-card p-4 dark:border-white/10"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Cost by SKU</h2>
        <p className="text-sm text-muted-foreground">
          {month} — average cost a box and a bottle, and the days each SKU line ran. Pick a SKU for
          its days.
        </p>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
      ) : isError && !data ? (
        <p className="py-10 text-center text-sm text-destructive">
          {getErrorMessage(error, 'The cost by SKU could not be loaded.')}
        </p>
      ) : skus.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No SKU ran on a day with a saved sheet this month.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm" aria-label="Filling cost by SKU">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">SKU</th>
                <th className="px-3 py-2 text-right font-semibold">Box size</th>
                <th className="px-3 py-2 text-right font-semibold">Days run</th>
                <th className="px-3 py-2 text-right font-semibold">Production (boxes)</th>
                <th className="px-3 py-2 text-right font-semibold">Total cost</th>
                <th className="px-3 py-2 text-right font-semibold">Avg per box</th>
                <th className="px-3 py-2 text-right font-semibold">Avg per bottle</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => {
                const key = skuKey(sku);
                const isOpen = open === key;
                return (
                  <Fragment key={key}>
                    <tr
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : key)}
                      className={cn(
                        'cursor-pointer border-b hover:bg-muted/40',
                        isOpen && 'bg-primary/10 font-medium',
                      )}
                    >
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          <span>{sku.sku}</span>
                          {sku.product !== sku.sku && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {sku.product}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {sku.pieces_per_case ? `${sku.pieces_per_case} PCS` : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {sku.days_run}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {count(sku.cases)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {rupees(sku.total)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {rate(sku.per_case)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                        {rate(sku.per_bottle, 4)}
                      </td>
                    </tr>
                    {isOpen &&
                      sku.days.map((day) => (
                        <tr key={day.date} className="border-b bg-muted/20 text-muted-foreground">
                          <td className="py-1 pl-9 pr-3">
                            {shortDay(day.date)}
                            {Number(day.share) < 100 && (
                              <span className="ml-2 text-xs">
                                ({Number(day.share).toFixed(0)}% of the day&apos;s boxes)
                              </span>
                            )}
                          </td>
                          <td />
                          <td />
                          <td className="px-3 py-1 text-right font-mono tabular-nums">
                            {count(day.cases)}
                          </td>
                          <td className="px-3 py-1 text-right font-mono tabular-nums">
                            {rupees(day.total)}
                          </td>
                          <td className="px-3 py-1 text-right font-mono tabular-nums">
                            {rate(day.per_case)}
                          </td>
                          <td className="px-3 py-1 text-right font-mono tabular-nums">
                            {rate(day.per_bottle, 4)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && skus.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          A day that ran more than one SKU splits its cost between them by boxes filled.
          {data.unassigned &&
            ` ${data.unassigned.days.map(shortDay).join(', ')} had a sheet but no runs, so its ${rupees(data.unassigned.total)} is in no SKU.`}
        </p>
      )}
    </section>
  );
}
