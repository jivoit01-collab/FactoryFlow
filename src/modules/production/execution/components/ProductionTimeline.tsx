import { useEffect, useMemo, useState } from 'react';
import { Play, Wrench, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import type { ProductionSegment, MachineBreakdown } from '../types';

// ============================================================================
// Types
// ============================================================================

interface ProductionTimelineProps {
  segments: ProductionSegment[];
  breakdowns: MachineBreakdown[];
  isCompleted: boolean;
  ratedSpeed: number | null;
  onAddBreakdown: () => void;
  onStopProduction: () => void;
  onResolveBreakdown: (
    breakdownId: number,
    action: 'start_production' | 'stop_production' | 'stop_unrecovered'
  ) => void;
  onSegmentClick: (segment: ProductionSegment) => void;
  onBreakdownClick: (breakdown: MachineBreakdown) => void;
}

type TimelineItem =
  | { type: 'segment'; data: ProductionSegment }
  | { type: 'breakdown'; data: MachineBreakdown };

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} hr. ${mins} min.` : `${hrs} hr.`;
  }
  return `${minutes} min.`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function minutesSince(startTime: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(startTime).getTime()) / 60_000));
}

function useLiveTick(enabled: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

// ============================================================================
// Component
// ============================================================================

export function ProductionTimeline({
  segments,
  breakdowns,
  isCompleted,
  ratedSpeed,
  onAddBreakdown,
  onStopProduction,
  onResolveBreakdown,
  onSegmentClick,
  onBreakdownClick,
}: ProductionTimelineProps) {
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...segments.map(
        (s) => ({ type: 'segment' as const, data: s }),
      ),
      ...breakdowns.map(
        (b) => ({ type: 'breakdown' as const, data: b }),
      ),
    ];
    items.sort(
      (a, b) =>
        new Date(a.data.start_time).getTime() -
        new Date(b.data.start_time).getTime(),
    );
    return items;
  }, [segments, breakdowns]);

  const hasActiveSegment = segments.some((s) => s.is_active);
  const hasActiveBreakdown = breakdowns.some((b) => b.is_active);
  const showAddBreakdown = !isCompleted && hasActiveSegment;
  const now = useLiveTick(!isCompleted && (hasActiveSegment || hasActiveBreakdown));

  // Empty state
  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-muted-foreground">
        <Clock className="mb-2 h-8 w-8" />
        <p>Production has not started yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Production Timeline</h3>
        {showAddBreakdown && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onStopProduction}>
              <Clock className="mr-1.5 h-4 w-4" />
              Stop Production
            </Button>
            <Button variant="destructive" size="sm" onClick={onAddBreakdown}>
              <Wrench className="mr-1.5 h-4 w-4" />
              Add Breakdown
            </Button>
          </div>
        )}
      </div>

      {/* Timeline items */}
      <div className="space-y-3">
        {timeline.map((item) =>
          item.type === 'segment' ? (
            <SegmentCard key={`seg-${item.data.id}`} segment={item.data} now={now} ratedSpeed={ratedSpeed} onClick={() => onSegmentClick(item.data)} />
          ) : (
            <BreakdownCard
              key={`bd-${item.data.id}`}
              breakdown={item.data}
              now={now}
              onResolve={onResolveBreakdown}
              onClick={() => onBreakdownClick(item.data)}
            />
          ),
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Segment Card
// ============================================================================

function SegmentCard({ segment, now, ratedSpeed, onClick }: { segment: ProductionSegment; now: number; ratedSpeed: number | null; onClick: () => void }) {
  const duration = segment.is_active
    ? minutesSince(segment.start_time, now)
    : segment.duration_minutes;
  const expectedUnits = ratedSpeed != null ? Math.round((duration / 60) * ratedSpeed) : null;
  const produced = parseFloat(segment.produced_cases || '0');

  return (
    <div className="rounded-lg border bg-green-50 border-green-200 p-4 dark:bg-green-950/30 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {/* Row 1: Title + duration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-lg font-bold text-green-800 dark:text-green-200">
            Running
          </span>
          {segment.is_active && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Row 2: Production info */}
      <div className="mt-1 text-sm text-green-700 dark:text-green-300">
        {segment.is_active ? (
          expectedUnits != null && (
            <span>Expected: ~{expectedUnits} units</span>
          )
        ) : (
          <span>
            {produced} units produced
            {expectedUnits != null && expectedUnits > 0 && (
              <span className="text-muted-foreground ml-2">(expected: ~{expectedUnits})</span>
            )}
          </span>
        )}
      </div>

      {/* Row 3: Times */}
      <div className="mt-2 flex items-center justify-between text-sm text-green-700 dark:text-green-300">
        <span>Start Time: {formatTime(segment.start_time)}</span>
        <span>
          End Time:{' '}
          {segment.end_time ? formatTime(segment.end_time) : '--:--'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Breakdown Card
// ============================================================================

function BreakdownCard({
  breakdown,
  now,
  onResolve,
  onClick,
}: {
  breakdown: MachineBreakdown;
  now: number;
  onResolve: ProductionTimelineProps['onResolveBreakdown'];
  onClick: () => void;
}) {
  const duration = breakdown.is_active
    ? minutesSince(breakdown.start_time, now)
    : breakdown.breakdown_minutes;

  return (
    <div className="rounded-lg border bg-red-50 border-red-200 p-4 dark:bg-red-950/30 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {/* Row 1: Title + duration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-lg font-bold text-red-800 dark:text-red-200">
            Breakdown
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Row 2: Machine + Category + reason */}
      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
        <span className="font-semibold">{breakdown.machine_name}</span>
        {' — '}
        <span className="font-bold uppercase">
          {breakdown.breakdown_category_name}
        </span>{' '}
        {breakdown.reason}
      </p>

      {/* Row 3: Times */}
      <div className="mt-2 flex items-center justify-between text-sm text-red-700 dark:text-red-300">
        <span>Start Time: {formatTime(breakdown.start_time)}</span>
        <span>
          End Time:{' '}
          {breakdown.end_time ? formatTime(breakdown.end_time) : '--:--'}
        </span>
      </div>

      {/* Actions for active breakdowns */}
      {breakdown.is_active && (
        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(breakdown.id, 'start_production')}
          >
            Fixed, Start Production
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(breakdown.id, 'stop_production')}
          >
            Fixed, Stop Production
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(breakdown.id, 'stop_unrecovered')}
          >
            Not Fixed, Stop Production
          </Button>
        </div>
      )}
    </div>
  );
}
