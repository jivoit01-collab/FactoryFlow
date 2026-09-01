import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LogIn, LogOut, Truck } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { dispatchTrackingApi } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';
import { DISPATCH_TRACKING_QUERY_KEYS } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { cn } from '@/shared/utils';

import { DISPATCH_DAY_REFRESH_MS, DOCKING_STATUS_LABEL } from '../constants/dispatch-day.constants';
import { useWallPalette } from '../constants/wall.palette';
import type { DayTruck, DispatchDayVehicles } from '../hooks';
import { useAutoScroll, useBoardDay, useNow } from '../hooks';
import { clockTime, count, since } from '../utils/format';
import { BoardPanel, PanelBadge, PanelEmpty } from './BoardPanel';

const AUTO_SCROLL_FROM = 6;

/** Past this long inside, a truck stops being "loading" and starts being a
 *  question. Three hours is a shift's worth of dock time. */
const STUCK_MINUTES = 180;

/**
 * Every truck the day has touched, each stamped IN or OUT on the left.
 *
 * IN means the truck was still standing in the plant when the shown day ended
 * -- on today, that is "right now", and a load at the dock since Tuesday is
 * exactly what a wall board exists to make impossible to ignore. OUT means it
 * cleared the gate on that day. Trucks still inside sort first, longest-waiting
 * at the top; the ones that left follow, most recent first.
 *
 * Dwell is measured to the END of the shown day, not to the wall clock. On a
 * back-date "inside 4h 20m" has to mean four hours on that Tuesday, not the six
 * days that have passed since.
 */
export function DispatchVehiclesPanel({
  vehicles,
  /** The viewer can see post-dispatch tracking, so the late count is worth a chip. */
  canSeeTracking,
}: {
  vehicles: DispatchDayVehicles;
  canSeeTracking: boolean;
}) {
  const navigate = useNavigate();
  const day = useBoardDay();
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);
  // Clamped to the day's close: on today this is simply now, and on a finished
  // day every dwell figure freezes at what it was when the gate shut.
  const now = Math.min(useNow(30_000).getTime(), day.endOfDay);
  // "Late on road" is a fact about this minute, not about a finished Tuesday,
  // so the chip is only offered while the board is live.
  const lateCount = useLateOnRoad(canSeeTracking && day.isToday);

  const rows = [...vehicles.inside, ...vehicles.out];
  useAutoScroll(listRef, rows.length >= AUTO_SCROLL_FROM);

  return (
    <BoardPanel
      title={day.isToday ? "Today's vehicles" : 'Vehicles that day'}
      icon={Truck}
      hex={palette.hue('invoices')}
      flush
      aside={
        lateCount > 0 ? (
          <PanelBadge tone="bad">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {count(lateCount)} late on road
            </span>
          </PanelBadge>
        ) : null
      }
    >
      {/* total / in / out */}
      <div className="grid shrink-0 grid-cols-3 gap-2 px-4 pb-3">
        <VehicleStat
          label="Total vehicles"
          value={vehicles.totalCount}
          hex={palette.hue('neutral')}
          loading={vehicles.isLoading}
        />
        <VehicleStat
          label={day.isToday ? 'In vehicles' : 'In at day end'}
          value={vehicles.inCount}
          hex={palette.hue('volume')}
          icon={LogIn}
          loading={vehicles.isLoading}
        />
        <VehicleStat
          label="Out vehicles"
          value={vehicles.outCount}
          hex={palette.hue('trucks')}
          icon={LogOut}
          loading={vehicles.isLoading}
        />
      </div>

      {vehicles.isError ? (
        <PanelEmpty>The docking register could not be read.</PanelEmpty>
      ) : rows.length === 0 ? (
        <PanelEmpty>
          {vehicles.isLoading ? 'Reading the gate...' : 'No vehicle came in or went out that day.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] dark:divide-white/5 overflow-y-auto border-t border-black/[0.06] dark:border-white/5"
        >
          {rows.map((truck) => (
            <VehicleRow
              key={truck.key}
              truck={truck}
              now={now}
              onOpen={() =>
                navigate(
                  truck.presence === 'IN'
                    ? '/dispatch/docking'
                    : `/dispatch/tracking?search=${encodeURIComponent(truck.vehicleNo)}`,
                )
              }
            />
          ))}
        </ul>
      )}
    </BoardPanel>
  );
}

function VehicleRow({ truck, now, onOpen }: { truck: DayTruck; now: number; onOpen: () => void }) {
  const isIn = truck.presence === 'IN';
  const waited = isIn && truck.inAt ? (now - new Date(truck.inAt).getTime()) / 60_000 : 0;
  const isStuck = waited >= STUCK_MINUTES;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.035] dark:hover:bg-white/[0.05] focus:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
      >
        {/* the IN / OUT stamp, on the left where the eye lands first */}
        <span
          className={cn(
            'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg border py-1.5',
            isIn
              ? 'border-amber-600/40 dark:border-amber-400/40 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300'
              : 'border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          {isIn ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
          <span className="text-[11px] font-black uppercase tracking-[0.12em]">
            {truck.presence}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold tracking-wide text-foreground">
            {truck.vehicleNo || truck.arrivalNo || 'Vehicle not recorded'}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {truck.companies.join(' + ') || '—'}
            {truck.transporters.length > 0 ? ` · ${truck.transporters[0]}` : ''}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground/80">
            {truck.customers[0] || 'Customer not recorded'}
            {truck.bills > 1 ? ` · ${truck.bills} bills` : ''}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              isIn
                ? 'border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 text-foreground/75'
                : 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
            )}
          >
            {isIn ? (DOCKING_STATUS_LABEL[truck.status] ?? truck.status) : clockTime(truck.outAt)}
          </span>
          <span
            className={cn(
              'text-[11px] tabular-nums',
              isStuck
                ? 'font-semibold text-amber-700 dark:text-amber-300'
                : 'text-muted-foreground/80',
            )}
          >
            {isIn ? `inside ${since(truck.inAt, now)}` : 'left the gate'}
          </span>
        </span>
      </button>
    </li>
  );
}

function VehicleStat({
  label,
  value,
  hex,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  hex: string;
  icon?: typeof LogIn;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/[0.09] dark:border-white/10 bg-black/[0.018] dark:bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: hex }} />}
        <span
          className={cn(
            'text-2xl font-bold tabular-nums leading-none',
            loading && 'animate-pulse text-muted-foreground/60',
          )}
          style={loading ? undefined : { color: hex }}
        >
          {loading ? '--' : count(value)}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}

/**
 * How many dispatched trucks are running late right now. One number, but the one
 * the board would otherwise lose when the tracking panel gave way to this list —
 * so it is kept as a header chip rather than dropped.
 */
function useLateOnRoad(enabled: boolean): number {
  const day = useBoardDay();
  const filters = { from_date: day.trackingFrom, to_date: day.date };

  const query = useQuery({
    queryKey: DISPATCH_TRACKING_QUERY_KEYS.summary(filters),
    queryFn: () => dispatchTrackingApi.summary(filters),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    enabled,
  });

  return query.data?.late.count ?? 0;
}
