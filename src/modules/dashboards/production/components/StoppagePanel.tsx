import { AlertTriangle, OctagonX } from 'lucide-react';

import { cn } from '@/shared/utils';

import { count } from '../../dispatch/utils/format';
import type { LineStoppage } from '../utils/lineTiles';

/** "1h 35m" — lost time is argued about in hours, not in 95 minutes. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * What stopped the plant today, worst cause first.
 *
 * The tiles say how long each line was down; this says WHY, across all of them
 * at once — which is the question that actually gets acted on. A cause that
 * stopped three lines appears once, carrying all three, because that is one
 * problem to fix rather than three.
 *
 * Nothing logged is drawn as a statement rather than an empty panel, and
 * deliberately not as good news: on 2026-09-17 five lines ran between four and
 * eleven hours with not one stoppage recorded, which is a register nobody
 * filled in rather than a flawless day. The panel says what it knows — that
 * none was logged — and leaves the reader to draw that conclusion.
 */
export function StoppagePanel({
  stoppages,
  stoppageCount,
  breakdownMinutes,
  unrecoveredMinutes,
  className,
}: {
  stoppages: LineStoppage[];
  stoppageCount: number;
  breakdownMinutes: number;
  unrecoveredMinutes: number;
  className?: string;
}) {
  const worst = stoppages[0]?.minutes ?? 0;

  return (
    <section
      className={cn(
        'shrink-0 rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.035]',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          <OctagonX className="h-3.5 w-3.5 text-rose-500" />
          What stopped the lines
        </h2>
        {stoppageCount > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {duration(breakdownMinutes)}
            </span>{' '}
            lost over {count(stoppageCount)} stoppage{stoppageCount === 1 ? '' : 's'}
            {unrecoveredMinutes > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {duration(unrecoveredMinutes)} never made up
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {stoppages.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No stoppage was logged against any line on this day.
        </p>
      ) : (
        <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {stoppages.map((stoppage) => (
            <li key={stoppage.label} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 sm:w-28">
                <span
                  aria-hidden
                  className="block h-1.5 rounded-full bg-rose-500/70"
                  style={{ width: `${Math.max(8, (stoppage.minutes / Math.max(worst, 1)) * 100)}%` }}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs">
                <span className="font-semibold text-foreground">{stoppage.label}</span>
                {stoppage.count > 1 && (
                  <span className="text-muted-foreground"> ×{count(stoppage.count)}</span>
                )}
                <span className="text-muted-foreground/70">
                  {stoppage.category && ` · ${stoppage.category}`}
                  {` · ${stoppage.lines.join(', ')}`}
                </span>
                {stoppage.unrecovered && (
                  <AlertTriangle
                    className="ml-1 inline h-3 w-3 align-[-2px] text-rose-500"
                    aria-label="never made up"
                  />
                )}
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {duration(stoppage.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
