import { CalendarDays, Maximize2, Minimize2, RefreshCw, RotateCcw, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { useNow } from '../../dispatch/hooks';
import { longDate, money, since } from '../../dispatch/utils/format';

export interface ExpenseWallHeaderProps {
  /** The day on the board, as YYYY-MM-DD. */
  date: string;
  isToday: boolean;
  onResetToToday: () => void;
  onPickDate: (date: string) => void;
  companyCode: string;
  mtdTotal: number;
  todayTotal: number;
  isFetching: boolean;
  updatedAt: number;
  refreshSeconds: number;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canConfigure: boolean;
}

/**
 * The wall's top bar: what day it is, whose factory this is, what it has cost
 * so far, and whether the screen is still alive.
 *
 * The running clock is the liveness tell. A board left on a wall for a month
 * has no other way to prove it did not quietly die overnight, and a frozen
 * cost figure looks exactly like a cheap day.
 */
export function ExpenseWallHeader({
  date,
  isToday,
  onResetToToday,
  onPickDate,
  companyCode,
  mtdTotal,
  todayTotal,
  isFetching,
  updatedAt,
  refreshSeconds,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  canConfigure,
}: ExpenseWallHeaderProps) {
  const now = useNow(1_000);
  // Two and a half missed cycles: one slow response is not a dead board.
  const staleAfter = refreshSeconds * 1000 * 2.5;
  const isStale = isToday && updatedAt > 0 && now.getTime() - updatedAt > staleAfter;

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035] px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
            !isToday
              ? 'border-sky-600/40 dark:border-sky-400/40 bg-sky-500/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300'
              : isStale
                ? 'border-amber-600/30 dark:border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          <span className="relative flex h-2 w-2">
            {isToday && !isStale && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                !isToday ? 'bg-sky-400' : isStale ? 'bg-amber-400' : 'bg-emerald-400',
              )}
            />
          </span>
          {!isToday ? 'History' : isStale ? 'Stale' : 'Live'}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Factory Expense — {isToday ? 'Today' : 'Past day'}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {longDate(new Date(`${date}T00:00:00`))} · {companyCode}
          </p>
        </div>
      </div>

      {/* The two figures that matter most, promoted into the bar so they survive
          even when a panel below is still loading. */}
      <div className="flex min-w-0 items-center gap-6">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold tabular-nums leading-none text-foreground">
            {money(todayTotal)}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Today
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold tabular-nums leading-none text-foreground">
            {money(mtdTotal)}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Month to date
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="sr-only">Board date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => onPickDate(event.target.value)}
            className="bg-transparent text-xs tabular-nums text-foreground outline-none"
          />
        </label>

        {!isToday && (
          <button
            type="button"
            onClick={onResetToToday}
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] dark:border-white/10 px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Today
          </button>
        )}

        {canConfigure && (
          <Link
            to="/dashboards/factory-expense/config"
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] dark:border-white/10 px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configure
          </Link>
        )}

        <button
          type="button"
          onClick={onRefresh}
          title={updatedAt ? `Updated ${since(new Date(updatedAt).toISOString())} ago` : 'Refresh'}
          className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] dark:border-white/10 px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {updatedAt ? since(new Date(updatedAt).toISOString(), now.getTime()) : '—'}
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit wall mode' : 'Wall mode'}
          className="flex items-center rounded-lg border border-black/[0.09] dark:border-white/10 px-2.5 py-1.5 text-foreground/80 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
