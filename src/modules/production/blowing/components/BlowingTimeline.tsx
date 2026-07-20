import { Clock, MessageSquareText, Wrench, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui';

import type { BlowingBreakdown, BlowingSegment } from '../types';

interface BlowingTimelineProps {
  segments: BlowingSegment[];
  breakdowns: BlowingBreakdown[];
  isCompleted: boolean;
  onAddBreakdown: () => void;
  onStopProduction: () => void;
  onResolveBreakdown: (
    breakdownId: number,
    action: 'start_production' | 'stop_production' | 'stop_unrecovered',
  ) => void;
}

type TimelineItem =
  | { type: 'segment'; data: BlowingSegment }
  | { type: 'breakdown'; data: BlowingBreakdown };

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} hr. ${mins} min.` : `${hrs} hr.`;
  }
  return `${minutes} min.`;
}
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const minutesSince = (start: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(start).getTime()) / 60_000));

function useLiveTick(enabled: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export function BlowingTimeline({
  segments,
  breakdowns,
  isCompleted,
  onAddBreakdown,
  onStopProduction,
  onResolveBreakdown,
}: BlowingTimelineProps) {
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...segments.map((s) => ({ type: 'segment' as const, data: s })),
      ...breakdowns.map((b) => ({ type: 'breakdown' as const, data: b })),
    ];
    items.sort((a, b) => new Date(a.data.start_time).getTime() - new Date(b.data.start_time).getTime());
    return items;
  }, [segments, breakdowns]);

  const hasActiveSegment = segments.some((s) => s.is_active);
  const hasActiveBreakdown = breakdowns.some((b) => b.is_active);
  const now = useLiveTick(!isCompleted && (hasActiveSegment || hasActiveBreakdown));

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Production Timeline</h3>
        {!isCompleted && hasActiveSegment && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onStopProduction}>
              <Clock className="mr-1.5 h-4 w-4" /> Stop Production
            </Button>
            <Button variant="destructive" size="sm" onClick={onAddBreakdown}>
              <Wrench className="mr-1.5 h-4 w-4" /> Add Breakdown
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {timeline.map((item) =>
          item.type === 'segment' ? (
            <SegmentCard key={`seg-${item.data.id}`} segment={item.data} now={now} />
          ) : (
            <BreakdownCard key={`bd-${item.data.id}`} breakdown={item.data} now={now} onResolve={onResolveBreakdown} />
          ),
        )}
      </div>
    </div>
  );
}

function SegmentCard({ segment, now }: { segment: BlowingSegment; now: number }) {
  const duration = segment.is_active ? minutesSince(segment.start_time, now) : segment.duration_minutes;
  const produced = parseFloat(segment.produced_pcs || '0');
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Play className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <span className="text-lg font-bold text-green-800 dark:text-green-200">Running</span>
          {segment.is_active && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">{formatDuration(duration)}</span>
      </div>
      {!segment.is_active && (
        <div className="mt-1 text-sm text-green-700 dark:text-green-300">
          {produced.toLocaleString('en-IN')} bottles produced
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-green-700 dark:text-green-300">
        <span className="whitespace-nowrap">Start: {formatTime(segment.start_time)}</span>
        <span className="whitespace-nowrap">End: {segment.end_time ? formatTime(segment.end_time) : '--:--'}</span>
      </div>
      {segment.remarks?.trim() && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-white/70 px-2.5 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-words">{segment.remarks}</span>
        </div>
      )}
    </div>
  );
}

function BreakdownCard({
  breakdown,
  now,
  onResolve,
}: {
  breakdown: BlowingBreakdown;
  now: number;
  onResolve: BlowingTimelineProps['onResolveBreakdown'];
}) {
  const duration = breakdown.is_active ? minutesSince(breakdown.start_time, now) : breakdown.breakdown_minutes;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Wrench className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-lg font-bold text-red-800 dark:text-red-200">Breakdown</span>
        </div>
        <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">{formatDuration(duration)}</span>
      </div>
      <p className="mt-1 break-words text-sm text-red-700 dark:text-red-300">
        {breakdown.breakdown_category_name && (
          <span className="font-bold uppercase">{breakdown.breakdown_category_name} </span>
        )}
        {breakdown.reason}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-red-700 dark:text-red-300">
        <span className="whitespace-nowrap">Start: {formatTime(breakdown.start_time)}</span>
        <span className="whitespace-nowrap">End: {breakdown.end_time ? formatTime(breakdown.end_time) : '--:--'}</span>
      </div>
      {breakdown.is_active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onResolve(breakdown.id, 'start_production')}>Fixed, Start Production</Button>
          <Button variant="outline" size="sm" onClick={() => onResolve(breakdown.id, 'stop_production')}>Fixed, Stop Production</Button>
          <Button variant="outline" size="sm" onClick={() => onResolve(breakdown.id, 'stop_unrecovered')}>Not Fixed, Stop</Button>
        </div>
      )}
    </div>
  );
}
