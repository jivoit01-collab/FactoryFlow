import { AlertTriangle, Wind } from 'lucide-react';

import { cn } from '@/shared/utils';

import { count } from '../../dispatch/utils/format';

/** "4h 20m" — lost time is argued about in hours. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * The strip above the blowing tiles.
 *
 * Deliberately not the filling lines' strip with different words in it: the two
 * halves of this board count different things — bottles off a counter against
 * cases booked by hand, yield against output-versus-rating — and one component
 * bending to both would end up captioning a bottle count "cases".
 */
export function BlowingSummary({
  machines,
  running,
  down,
  finished,
  bottles,
  rejects,
  yieldPct,
  breakdownMinutes,
  idleMinutes,
  stoppageCount,
  benchmark,
}: {
  machines: number;
  running: number;
  down: number;
  finished: number;
  bottles: number;
  rejects: number;
  yieldPct: number | null;
  breakdownMinutes: number;
  idleMinutes: number;
  stoppageCount: number;
  benchmark: number;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.035]">
      <span className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Wind className="h-4 w-4 text-violet-500" />
        {count(machines)}{' '}
        <span className="text-muted-foreground">machine{machines === 1 ? '' : 's'} ran</span>
      </span>

      <span className="text-base font-semibold text-foreground">
        {count(bottles)} <span className="font-normal text-muted-foreground">bottles</span>
      </span>

      <span
        className={cn(
          'text-base font-bold tabular-nums',
          yieldPct == null
            ? 'text-foreground'
            : yieldPct >= benchmark
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400',
        )}
      >
        {yieldPct == null ? '—' : `${yieldPct.toFixed(1)}%`}{' '}
        <span className="font-normal text-muted-foreground">good · {count(rejects)} rejected</span>
      </span>

      <span className="text-base text-muted-foreground">
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{count(running)}</span>{' '}
        running ·{' '}
        <span className={cn('font-bold', down > 0 && 'text-rose-600 dark:text-rose-400')}>
          {count(down)}
        </span>{' '}
        down · <span className="font-bold text-sky-600 dark:text-sky-400">{count(finished)}</span>{' '}
        finished
      </span>

      <span
        className={cn(
          'flex items-center gap-1.5 text-base',
          breakdownMinutes > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {breakdownMinutes > 0 ? (
          <>
            <span className="font-bold">{duration(breakdownMinutes)}</span> breakdown ·{' '}
            {count(stoppageCount)} logged
          </>
        ) : (
          'no breakdown logged'
        )}
      </span>

      {idleMinutes > 0 && (
        <span className="text-base text-amber-600 dark:text-amber-400">
          <span className="font-bold">{duration(idleMinutes)}</span> idle
        </span>
      )}
    </div>
  );
}
