import { LogIn, LogOut, Maximize2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { cn } from '@/shared/utils';

import { useFullscreen } from '../../dispatch/hooks';
import {
  GateFlowPanel,
  GatePeoplePanel,
  GateVehicleJourney,
  GateWallHeader,
  GateWallKpis,
} from '../components';
import { GATE_ACTIVITIES, type GateRange, todayISO } from '../constants/gate-dashboard.constants';
import { useGateBoard } from '../hooks/useGateBoard';

/** Whole days between two YYYY-MM-DD dates, inclusive of both ends. */
function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * The gate, today, on a wall.
 *
 * Built for the screen in the security cabin rather than for a laptop: one
 * glance answers "what has come in, what has gone out, who is still inside, and
 * which vehicles are stuck between the barriers". Everything fits one viewport
 * — nothing below the fold exists on a wall — and every list creeps past on its
 * own, so the board is complete without anybody touching it.
 *
 * Three sources, and which one a number comes from decides how it behaves:
 *   - the activity counts are FactoryFlow's own registers, one query each, so a
 *     single broken endpoint costs one row's number rather than the board;
 *   - the person-gate register carries visitors, contractors and who is on site;
 *   - the vehicle journey borrows the dispatch pipeline, which needs its own
 *     permission — a gate operator without it sees the rest of the board and no
 *     road, rather than an empty screen.
 *
 * The date range widens the board to a week or a month, and everything on it
 * follows except "inside now", which is always this second. A board that let
 * that figure quietly become a historical count would be actively dangerous
 * during an evacuation, so the header labels it apart from the rest.
 */
export default function GateDashboardPage() {
  const { hasPermission, hasAnyPermission } = usePermission();
  const { currentCompany } = useAuth();
  const canViewJourney = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);

  const [range, setRange] = useState<GateRange>(() => {
    const today = todayISO();
    return { from: today, to: today };
  });

  /**
   * Moving From carries To with it while the board is on a single day, so
   * picking another day stays one click. Once a real range is open, From moves
   * on its own and only clamps if it would overtake To.
   */
  const onFrom = useCallback((from: string) => {
    if (!from) return;
    setRange((current) =>
      current.from === current.to
        ? { from, to: from }
        : { from, to: from > current.to ? from : current.to },
    );
  }, []);

  const onTo = useCallback((to: string) => {
    if (!to) return;
    setRange((current) => ({ from: to < current.from ? to : current.from, to }));
  }, []);

  const setToday = useCallback(() => {
    const today = todayISO();
    setRange({ from: today, to: today });
  }, []);

  const isSingleDay = range.from === range.to;
  const isToday = isSingleDay && range.to === todayISO();

  const board = useGateBoard(range, canViewJourney);

  // Only the activities this user can actually open — an activity they cannot
  // see has no count behind it either, so a row would be a permanent dash.
  const inbound = useMemo(
    () =>
      GATE_ACTIVITIES.filter(
        (activity) => activity.flow === 'in' && hasAnyPermission([...activity.permissions]),
      ),
    [hasAnyPermission],
  );
  const outbound = useMemo(
    () =>
      GATE_ACTIVITIES.filter(
        (activity) => activity.flow === 'out' && hasAnyPermission([...activity.permissions]),
      ),
    [hasAnyPermission],
  );

  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden bg-background text-foreground',
        isFullscreen
          ? 'h-screen w-screen p-4'
          : 'h-[calc(100vh-11rem)] min-h-[880px] rounded-3xl border border-black/[0.09] p-3 dark:border-white/10',
      )}
    >
      {/* ambient wash — keeps a mostly-black board from looking switched off */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/[0.07] to-transparent"
      />

      <GateWallHeader
        range={range}
        isToday={isToday}
        isSingleDay={isSingleDay}
        days={daysBetween(range.from, range.to)}
        companyName={currentCompany?.company_name ?? 'No company selected'}
        onChangeFrom={onFrom}
        onChangeTo={onTo}
        onResetToToday={setToday}
        vehiclesIn={board.vehiclesIn}
        vehiclesOut={board.vehiclesOut}
        insideNow={board.insideNow}
        isFetching={board.isFetching}
        updatedAt={board.updatedAt}
        onRefresh={board.refetch}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
      />

      <GateWallKpis board={board} isToday={isToday} canViewJourney={canViewJourney} />

      {/* The road takes a fixed slice of the board; the lists share the rest. */}
      {canViewJourney && (
        <GateVehicleJourney
          journey={board.journey}
          isLoading={board.journeyLoading}
          className="h-[30%] min-h-[220px] shrink-0"
        />
      )}

      {/* Three panels across on a wall, one above the other on a laptop. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <GateFlowPanel
          title="Inbound"
          icon={LogIn}
          hue="gateIn"
          activities={inbound}
          counts={board.counts}
          isLoading={board.countsLoading}
          emptyText="You cannot see any inbound gate activity."
        />
        <GateFlowPanel
          title="Outbound"
          icon={LogOut}
          hue="gateOut"
          activities={outbound}
          counts={board.counts}
          isLoading={board.countsLoading}
          emptyText="You cannot see any outbound gate activity."
        />
        <GatePeoplePanel
          board={board}
          isSingleDay={isSingleDay}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      {!isFullscreen && (
        <p className="flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Maximize2 className="h-3 w-3" />
          Built for a wall screen &mdash; open wall mode for the full-height board.
        </p>
      )}
    </div>
  );
}
