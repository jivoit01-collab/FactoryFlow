import { Building2, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

import { cn } from '@/shared/utils';

import { DISPATCH_DAY_REFRESH_MS } from '../constants/dispatch-day.constants';
import { useNow } from '../hooks';
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

  // Measured against the ticking clock, not against render time: the board can
  // sit for minutes between data pulls, and staleness has to age on its own.
  const isStale = updatedAt > 0 && now.getTime() - updatedAt > STALE_AFTER_MS;

  const scope =
    companyCount > 1 ? `${companyCount} companies` : (companyCodes[0] ?? 'Company scope loading…');

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
            isStale
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
          )}
        >
          <span className="relative flex h-2 w-2">
            {!isStale && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                isStale ? 'bg-amber-400' : 'bg-emerald-400',
              )}
            />
          </span>
          {isStale ? 'Stale' : 'Live'}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
            Dispatch — Today
          </h1>
          <p className="truncate text-xs text-slate-400">{longDate(now)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{scope}</span>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
            {now.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {updatedAt ? `updated ${since(new Date(updatedAt).toISOString(), now.getTime())}` : '—'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh now"
            aria-label="Refresh now"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit wall mode' : 'Wall mode (fullscreen)'}
            aria-label={isFullscreen ? 'Exit wall mode' : 'Wall mode'}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
