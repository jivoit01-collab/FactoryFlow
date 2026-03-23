import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui';
import type { ProductionRunDetail } from '../types';

interface RunSummaryCardsProps {
  run: ProductionRunDetail;
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

function minutesSince(isoString: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(isoString).getTime()) / 60_000));
}

export function RunSummaryCards({ run }: RunSummaryCardsProps) {
  const isCompleted = run.status === 'COMPLETED';
  const ratedSpeed = run.rated_speed ? parseFloat(run.rated_speed) : null;

  const hasActiveSegment = run.segments?.some((s) => s.is_active) ?? false;
  const hasActiveBreakdown = run.breakdowns?.some((b) => b.is_active) ?? false;
  const now = useLiveTick(!isCompleted && (hasActiveSegment || hasActiveBreakdown));

  // Calculate running time from all segments
  let runningMinutes = 0;
  let segmentProduction = 0;
  for (const seg of run.segments ?? []) {
    if (seg.end_time) {
      runningMinutes += Math.floor(
        (new Date(seg.end_time).getTime() - new Date(seg.start_time).getTime()) / 60_000
      );
    } else if (seg.is_active) {
      runningMinutes += minutesSince(seg.start_time, now);
    }
    segmentProduction += parseFloat(seg.produced_cases || '0');
  }

  // Calculate breakdown time from all breakdowns
  let breakdownMinutes = 0;
  for (const bd of run.breakdowns ?? []) {
    if (bd.end_time) {
      breakdownMinutes += bd.breakdown_minutes;
    } else if (bd.is_active) {
      breakdownMinutes += minutesSince(bd.start_time, now);
    }
  }

  // Expected = sum of (each segment's duration * ratedSpeed), including live for active
  // Actual = sum of all closed segment produced_cases
  let expectedProduction: number | null = null;
  if (ratedSpeed != null) {
    expectedProduction = Math.round((runningMinutes / 60) * ratedSpeed);
  }

  // For completed runs, use the run total; otherwise sum from segments
  const actualProduction = isCompleted
    ? parseFloat(run.total_production || '0')
    : segmentProduction;

  const hasProduction = actualProduction > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Production */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Package className="h-4 w-4 text-green-600" />
            {hasProduction || isCompleted ? 'Total Produced' : 'Expected Production'}
          </div>
          {hasProduction || isCompleted ? (
            <>
              <p className="text-2xl font-bold">{actualProduction} cases</p>
              {expectedProduction != null && (
                <p className="text-sm text-muted-foreground">
                  (expected: ~{expectedProduction.toLocaleString()})
                </p>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold">
              {expectedProduction != null
                ? `~${expectedProduction.toLocaleString()} cases`
                : 'N/A'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Rated Speed */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Activity className="h-4 w-4 text-blue-600" />
            Rated Speed
          </div>
          <p className="text-2xl font-bold">
            {ratedSpeed != null ? `${run.rated_speed} cases/hr` : 'N/A'}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Running Time */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4 text-purple-600" />
            Running Time
          </div>
          <p className="text-2xl font-bold">{runningMinutes} min</p>
        </CardContent>
      </Card>

      {/* Card 4: Breakdown Time */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Breakdown Time
          </div>
          <p className="text-2xl font-bold">{breakdownMinutes} min</p>
        </CardContent>
      </Card>
    </div>
  );
}
