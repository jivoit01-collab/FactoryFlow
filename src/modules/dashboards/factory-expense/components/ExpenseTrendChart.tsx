import { TrendingUp } from 'lucide-react';

import { BoardPanel } from '../../dispatch/components/BoardPanel';
import { money } from '../../dispatch/utils/format';
import { BUCKET_META, BUCKET_ORDER } from '../constants';
import type { ExpenseTrendPoint } from '../types';

export interface ExpenseTrendChartProps {
  trend: ExpenseTrendPoint[];
  className?: string;
}

/**
 * A fortnight of daily cost, stacked by bucket.
 *
 * Stacked rather than four separate lines: on a wall the question is "was
 * yesterday dearer than the day before, and what drove it", and a stack answers
 * both in one shape. Today's column is drawn at full opacity and labelled, so
 * the eye lands on it without a legend lookup.
 */
export function ExpenseTrendChart({ trend, className }: ExpenseTrendChartProps) {
  const totals = trend.map((point) => Number(point.total ?? 0));
  const max = Math.max(...totals, 1);
  const average = totals.length
    ? totals.reduce((sum, value) => sum + value, 0) / totals.length
    : 0;

  return (
    <BoardPanel
      title="Last 14 days"
      icon={TrendingUp}
      hex="#38bdf8"
      className={className}
      aside={
        <span className="rounded-full border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground/75">
          avg {money(average)}/day
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 items-end gap-1.5">
          {/* average line — the run rate a spike is judged against */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/20"
            style={{ bottom: `${(average / max) * 100}%` }}
          />

          {trend.map((point) => {
            const total = Number(point.total ?? 0);
            const heightPct = Math.max((total / max) * 100, total > 0 ? 4 : 1.5);

            return (
              <div
                key={point.date}
                className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${point.date} — ${money(total)}`}
              >
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm transition-[height] duration-500"
                  style={{ height: `${heightPct}%` }}
                >
                  {BUCKET_ORDER.map((key) => {
                    const value = Number(point[bucketField(key)] ?? 0);
                    if (value <= 0) return null;
                    return (
                      <span
                        key={key}
                        className="w-full shrink-0"
                        style={{
                          height: `${(value / total) * 100}%`,
                          backgroundColor: BUCKET_META[key].hex,
                          opacity: point.is_today ? 1 : 0.42,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {BUCKET_ORDER.map((key) => (
              <span
                key={key}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: BUCKET_META[key].hex }}
                />
                {BUCKET_META[key].label}
              </span>
            ))}
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
            {shortDay(trend[0]?.date)} → today
          </span>
        </div>
      </div>
    </BoardPanel>
  );
}

function bucketField(key: (typeof BUCKET_ORDER)[number]) {
  return key.toLowerCase() as 'labour' | 'salary' | 'electricity' | 'maintenance';
}

function shortDay(iso: string | undefined): string {
  if (!iso) return '';
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
