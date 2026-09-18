import { cn } from '@/shared/utils';

import { compact, count } from '../../dispatch/utils/format';
import type { TrendPoint } from '../utils/trend';

/** "17 Sep" under a bar; the year is never in doubt across a fortnight. */
function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** "Thu" — the weekday is what makes a Sunday's short bar read as a Sunday. */
function weekday(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
}

/**
 * How much of the plot a full bar may take.
 *
 * The value sits above its own bar inside the same column, so a bar drawn to
 * the full height would push its figure out of the top of the plot.
 */
const BAR_CEILING = 0.82;

/**
 * The fortnight behind the day on screen.
 *
 * One bar a day, ending on the day the board is showing — so the tiles below
 * are always the last bar, and changing the date walks the whole strip rather
 * than re-scaling it around a fixed today. That is the point of ending it on
 * the shown day rather than on the real one: on a back-date the reader wants
 * the fortnight leading UP to what they are looking at.
 *
 * Drawn against the window's own best day rather than against a target,
 * because the useful reading here is "is this a normal day for this plant" —
 * a question a rating cannot answer and the fortnight can. The dashed line is
 * the average of the days that ran, so a bar can be read against the plant's
 * own habit at a glance.
 *
 * Every column is a flex column of a definite height: a bar is a percentage of
 * its own column, and a percentage height needs a parent that has one. Left to
 * `items-end` the columns collapse to the height of their label and every bar
 * resolves to nothing — which is exactly what this looked like before.
 */
export function PerformanceTrend({
  points,
  /** What one unit is called — "cases", "ltr", "bottles". */
  noun,
  average,
  className,
}: {
  points: TrendPoint[];
  noun: string;
  /** The window's daily average, over the days something ran. */
  average: number;
  className?: string;
}) {
  const best = Math.max(...points.map((point) => point.value), 1);
  const ranDays = points.filter((point) => point.value > 0).length;
  const averageHeight = Math.min(average / best, 1) * BAR_CEILING * 100;

  return (
    <section
      className={cn(
        'shrink-0 rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.035]',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Last {points.length} days
        </h2>
        <p className="text-xs text-muted-foreground">
          {ranDays > 0 ? (
            <>
              <span className="font-bold text-foreground">
                {count(average)} {noun}
              </span>{' '}
              a day over {count(ranDays)} day{ranDays === 1 ? '' : 's'} that ran
            </>
          ) : (
            'nothing ran in this window'
          )}
        </p>
      </div>

      <div className="relative mt-3 flex h-28 items-stretch gap-1.5">
        {/* the plant's own habit, to read a bar against */}
        {average > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/25"
            style={{ bottom: `${averageHeight}%` }}
          />
        )}

        {points.map((point) => {
          const height = (point.value / best) * BAR_CEILING * 100;
          return (
            <div
              key={point.date}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
              title={`${shortDay(point.date)} — ${count(point.value)} ${noun}`}
            >
              <span
                className={cn(
                  'truncate text-center text-[10px] tabular-nums',
                  point.isShown ? 'font-bold text-foreground' : 'text-muted-foreground',
                )}
              >
                {point.value > 0 ? compact(point.value) : '—'}
              </span>
              <div
                className={cn(
                  'w-full rounded-t transition-[height] duration-500',
                  point.isShown
                    ? 'bg-violet-500'
                    : point.value > 0
                      ? 'bg-violet-500/35'
                      : // A day nothing ran on keeps a sliver, so the gap reads
                        // as a day with no output rather than a missing bar.
                        'bg-black/[0.08] dark:bg-white/10',
                )}
                style={{ height: `${point.value > 0 ? Math.max(height, 3) : 2}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-1.5">
        {points.map((point) => (
          <div key={point.date} className="min-w-0 flex-1 text-center">
            <p
              className={cn(
                'truncate text-[10px] tabular-nums',
                point.isShown ? 'font-bold text-foreground' : 'text-muted-foreground/70',
              )}
            >
              {shortDay(point.date)}
            </p>
            <p className="truncate text-[9px] text-muted-foreground/50">{weekday(point.date)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
