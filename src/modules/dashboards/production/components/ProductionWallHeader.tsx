import { CalendarDays, Factory, Maximize2, Minimize2, RefreshCw, RotateCcw } from 'lucide-react';

import { cn } from '@/shared/utils';

import { useNow } from '../../dispatch/hooks';
import { longDate, since } from '../../dispatch/utils/format';
import { PRODUCTION_STALE_AFTER_MS } from '../constants/production-wall.constants';
import type { ProductionDay } from '../hooks';

export interface LineOption {
  id: number;
  name: string;
}

export interface ProductionWallHeaderProps {
  day: ProductionDay;
  /** Whose plant this is — the board is company-scoped by the API header. */
  companyName: string;
  /** Oil / Beverages / Production — the variant chip. */
  variantLabel: string;
  lines: LineOption[];
  selectedLine: number | undefined;
  onPickLine: (line: number | undefined) => void;
  isFetching: boolean;
  updatedAt: number;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * The board's top bar: what it is, what day it is, whose plant these cases came
 * off, and whether the screen is still alive.
 *
 * The running clock is the liveness tell. A production board is opened once and
 * left on a wall for months, and a frozen case count looks exactly like a quiet
 * shift — the second hand is the only thing that can tell the two apart.
 *
 * Back-dating changes the bar's whole character on purpose: the LIVE pill turns
 * into a HISTORY pill and the clock gives way to the chosen date, because a
 * board that looked identical on today and on last Tuesday would be the most
 * dangerous thing on this screen.
 */
export function ProductionWallHeader({
  day,
  companyName,
  variantLabel,
  lines,
  selectedLine,
  onPickLine,
  isFetching,
  updatedAt,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: ProductionWallHeaderProps) {
  const now = useNow(1_000);

  // Measured against the ticking clock, not against render time: the board can
  // sit for minutes between pulls and staleness has to age on its own. A
  // finished day is never "stale" — it is simply finished.
  const isStale =
    day.isToday && updatedAt > 0 && now.getTime() - updatedAt > PRODUCTION_STALE_AFTER_MS;
  const history = !day.isToday;

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
            history
              ? 'border-sky-600/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300'
              : isStale
                ? 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                : 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
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
          <h1 className="flex items-center gap-2 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Production — {history ? 'Past day' : 'Today'}
            <span className="shrink-0 rounded-full border border-black/[0.09] bg-black/[0.035] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/70 dark:border-white/10 dark:bg-white/5">
              {variantLabel}
            </span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {longDate(new Date(`${day.date}T00:00:00`))} · {companyName}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] bg-black/[0.02] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          <Factory className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Production line</span>
          <select
            value={selectedLine ?? ''}
            onChange={(event) =>
              onPickLine(event.target.value ? Number(event.target.value) : undefined)
            }
            className="max-w-[130px] bg-transparent text-xs font-semibold text-foreground outline-none"
          >
            <option value="">All lines</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
        </label>

        {/* `max` stops the obvious mistake; the day hook rejects a future date
            regardless, since a typed-in one bypasses the widget. */}
        <label className="flex items-center gap-1.5 rounded-lg border border-black/[0.09] bg-black/[0.02] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Board date</span>
          <input
            type="date"
            value={day.date}
            max={day.today}
            onChange={(event) => day.setDate(event.target.value)}
            className="bg-transparent text-xs tabular-nums text-foreground outline-none"
          />
        </label>

        {history && (
          <button
            type="button"
            onClick={day.resetToToday}
            className="flex items-center gap-1.5 rounded-lg border border-sky-600/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Today
          </button>
        )}

        <div className="text-right">
          <div className="text-xl font-bold leading-none tabular-nums text-foreground sm:text-2xl">
            {history
              ? day.date.split('-').reverse().join('/')
              : now.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
          </div>
          <div className="mt-1 text-[10px] tabular-nums text-muted-foreground/80">
            {history
              ? 'finished day · not live'
              : updatedAt
                ? `updated ${since(new Date(updatedAt).toISOString(), now.getTime())}`
                : '—'}
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh now"
          aria-label="Refresh now"
          className="rounded-lg border border-black/[0.09] bg-black/[0.035] p-2 text-foreground/75 transition-colors hover:bg-black/[0.06] hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit wall mode' : 'Wall mode (fullscreen)'}
          aria-label={isFullscreen ? 'Exit wall mode' : 'Wall mode'}
          className="rounded-lg border border-black/[0.09] bg-black/[0.035] p-2 text-foreground/75 transition-colors hover:bg-black/[0.06] hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
