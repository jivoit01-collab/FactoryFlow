import { ArrowRight, Maximize2, Minimize2, RefreshCw, RotateCcw } from 'lucide-react';

import { cn } from '@/shared/utils';

import { useNow } from '../../dispatch/hooks';
import { count, longDate, since } from '../../dispatch/utils/format';
import { GATE_STALE_AFTER_MS, type GateRange } from '../constants/gate-dashboard.constants';

export interface GateWallHeaderProps {
  range: GateRange;
  /** True when the board is on a single day and that day is today. */
  isToday: boolean;
  isSingleDay: boolean;
  /** How many days the range spans, inclusive. */
  days: number;
  companyName: string;
  onChangeFrom: (date: string) => void;
  onChangeTo: (date: string) => void;
  onResetToToday: () => void;
  /** Promoted into the bar so they survive a panel that is still loading. */
  vehiclesIn: number;
  vehiclesOut: number;
  insideNow: number;
  isFetching: boolean;
  updatedAt: number;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * The wall's top bar: what span it is showing, whose gate this is, what has
 * crossed it, and whether the screen is still alive.
 *
 * The board opens on today, because that is what a screen in the security cabin
 * is for. The From/To pair widens it when somebody wants a week, and the bar
 * changes character when they do — the LIVE pill becomes a RANGE pill and the
 * running clock gives way to the dates. A board showing five days must never be
 * mistakable for one showing this shift.
 *
 * The running clock is the liveness tell. A gate board is opened once and left
 * on a wall for months, and a frozen vehicle count looks exactly like a quiet
 * morning — the second hand is the only thing that can tell the two apart.
 *
 * "Inside now" sits in the bar rather than only on a tile because it is the one
 * figure somebody runs to this screen for, and it is always *now* — never the
 * selected range — even while the rest of the board is showing last Tuesday.
 */
export function GateWallHeader({
  range,
  isToday,
  isSingleDay,
  days,
  companyName,
  onChangeFrom,
  onChangeTo,
  onResetToToday,
  vehiclesIn,
  vehiclesOut,
  insideNow,
  isFetching,
  updatedAt,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: GateWallHeaderProps) {
  const now = useNow(1_000);

  // Measured against the ticking clock, not against render time: the board can
  // sit for minutes between pulls and staleness has to age on its own. A
  // finished day is never "stale" — it is simply finished.
  const isStale = isToday && updatedAt > 0 && now.getTime() - updatedAt > GATE_STALE_AFTER_MS;
  const mode = !isSingleDay ? 'range' : isToday ? 'live' : 'history';
  const pill =
    mode === 'range' ? `${days} days` : mode === 'history' ? 'History' : isStale ? 'Stale' : 'Live';

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
            mode === 'range'
              ? 'border-violet-600/40 bg-violet-500/10 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300'
              : mode === 'history'
                ? 'border-sky-600/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300'
                : isStale
                  ? 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                  : 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
          )}
        >
          <span className="relative flex h-2 w-2">
            {mode === 'live' && !isStale && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                mode === 'range'
                  ? 'bg-violet-400'
                  : mode === 'history'
                    ? 'bg-sky-400'
                    : isStale
                      ? 'bg-amber-400'
                      : 'bg-emerald-400',
              )}
            />
          </span>
          {pill}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Gate activity — {mode === 'range' ? 'Range' : mode === 'history' ? 'Past day' : 'Today'}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {isSingleDay
              ? longDate(new Date(`${range.to}T00:00:00`))
              : `${longDate(new Date(`${range.from}T00:00:00`))} → ${longDate(new Date(`${range.to}T00:00:00`))}`}{' '}
            · {companyName}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-6">
        <HeaderFigure value={count(vehiclesIn)} label="Vehicles in" />
        <HeaderFigure value={count(vehiclesOut)} label="Vehicles out" />
        <HeaderFigure value={count(insideNow)} label="Inside now" />
        {mode === 'live' && (
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Local time
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] bg-black/[0.02] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              From
            </span>
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => onChangeFrom(event.target.value)}
              className="bg-transparent text-xs tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
          </label>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              To
            </span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => onChangeTo(event.target.value)}
              className="bg-transparent text-xs tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
          </label>
        </div>

        {!(isToday && isSingleDay) && (
          <button
            type="button"
            onClick={onResetToToday}
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:border-white/10 dark:hover:bg-white/[0.06]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Today
          </button>
        )}

        <button
          type="button"
          onClick={onRefresh}
          title={updatedAt ? `Updated ${since(new Date(updatedAt).toISOString())} ago` : 'Refresh'}
          className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:border-white/10 dark:hover:bg-white/[0.06]"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {updatedAt ? since(new Date(updatedAt).toISOString(), now.getTime()) : '—'}
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit wall mode' : 'Wall mode (fullscreen)'}
          aria-label={isFullscreen ? 'Exit wall mode' : 'Wall mode'}
          className="flex items-center rounded-lg border border-black/[0.09] px-2.5 py-1.5 text-foreground/80 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:border-white/10 dark:hover:bg-white/[0.06]"
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

/** One promoted figure in the bar. */
function HeaderFigure({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-2xl font-bold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
