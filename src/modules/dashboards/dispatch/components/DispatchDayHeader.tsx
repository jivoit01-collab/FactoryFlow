import { Building2, CalendarDays, Maximize2, Minimize2, RefreshCw, RotateCcw } from 'lucide-react';

import { cn } from '@/shared/utils';

import { DISPATCH_DAY_REFRESH_MS } from '../constants/dispatch-day.constants';
import { useBoardDay, useNow } from '../hooks';
import { longDate, since } from '../utils/format';

/** Two missed refresh cycles before the badge goes amber -- one slow response
 *  is not a dead board, but a screen nobody watches must admit when it froze. */
const STALE_AFTER_MS = DISPATCH_DAY_REFRESH_MS * 2.5;

export interface DispatchDayHeaderProps {
  companyCount: number;
  companyCodes: string[];
  isFetching: boolean;
  /** Epoch ms of the last successful pull. */
  updatedAt: number;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * The board's top bar: what it is, what day it is, whose numbers these are, and
 * how fresh they are. The clock is the liveness tell — on a screen that is never
 * touched, a running second hand is the only proof the page has not silently
 * died overnight.
 *
 * Back-dating changes the bar's whole character on purpose. A wall board that
 * looked identical whether it showed today or last Tuesday would be the most
 * dangerous thing on this screen, so the LIVE pill becomes a HISTORY pill, the
 * running clock gives way to the chosen date, and a way back to today sits next
 * to it — as well as returning on its own if nobody presses it.
 */
export function DispatchDayHeader({
  companyCount,
  companyCodes,
  isFetching,
  updatedAt,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: DispatchDayHeaderProps) {
  const now = useNow(1_000);
  const day = useBoardDay();

  // Measured against the ticking clock, not against render time: the board can
  // sit for minutes between data pulls, and staleness has to age on its own.
  // A finished day is never "stale" — it is simply finished.
  const isStale = day.isToday && updatedAt > 0 && now.getTime() - updatedAt > STALE_AFTER_MS;
  const history = !day.isToday;

  const scope =
    companyCount > 1 ? `${companyCount} companies` : (companyCodes[0] ?? 'Company scope loading…');

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035] px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
            history
              ? 'border-sky-600/40 dark:border-sky-400/40 bg-sky-500/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300'
              : isStale
                ? 'border-amber-600/30 dark:border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          <span className="relative flex h-2 w-2">
            {!history && !isStale && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                history ? 'bg-sky-400' : isStale ? 'bg-amber-400' : 'bg-emerald-400',
              )}
            />
          </span>
          {history ? 'History' : isStale ? 'Stale' : 'Live'}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {history ? 'Dispatch — Past day' : 'Dispatch — Today'}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {longDate(new Date(`${day.date}T00:00:00`))}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{scope}</span>
        </div>

        {/* The date filter. `max` stops the obvious mistake; the provider rejects
            a future date regardless, since a typed-in one bypasses the widget. */}
        <label className="flex items-center gap-2 rounded-lg border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 px-2.5 py-1.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Show dispatch for</span>
          <input
            type="date"
            value={day.date}
            max={day.today}
            onChange={(event) => day.setDate(event.target.value)}
            className="bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
          />
        </label>

        {history && (
          <button
            type="button"
            onClick={day.resetToToday}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-600/40 dark:border-sky-400/40 bg-sky-500/10 dark:bg-sky-400/10 px-2.5 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 transition-colors hover:bg-sky-500/20 dark:bg-sky-400/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Back to today
          </button>
        )}

        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums leading-none text-foreground sm:text-3xl">
            {history
              ? day.date.split('-').reverse().join('/')
              : now.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-muted-foreground/80">
            {history
              ? 'finished day · not live'
              : updatedAt
                ? `updated ${since(new Date(updatedAt).toISOString(), now.getTime())}`
                : '—'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh now"
            aria-label="Refresh now"
            className="rounded-lg border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 p-2 text-foreground/75 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10 hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit wall mode' : 'Wall mode (fullscreen)'}
            aria-label={isFullscreen ? 'Exit wall mode' : 'Wall mode'}
            className="rounded-lg border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 p-2 text-foreground/75 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10 hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
