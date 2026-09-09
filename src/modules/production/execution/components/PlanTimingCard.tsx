import { Clock, Info } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from '@/shared/components/ui';

import type { PlanCheckTiming } from '../types';
import { formatClock, formatDuration } from '../utils';

interface PlanTimingCardProps {
  date: string;
  startTime: string;
  endTime: string;
  endIsManual: boolean;
  timing?: PlanCheckTiming;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onEndIsManualChange: (value: boolean) => void;
  endTimeError?: string;
  dateError?: string;
}

/**
 * When the run is meant to start, and how long the line's rated speed says it
 * will take. The finish time is derived unless the supervisor overrides it —
 * they are the ones who know about the changeover the speed sheet omits.
 */
export function PlanTimingCard({
  date,
  startTime,
  endTime,
  endIsManual,
  timing,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onEndIsManualChange,
  endTimeError,
  dateError,
}: PlanTimingCardProps) {
  const derivedDuration = formatDuration(timing?.derived_duration_minutes);
  const derivedEnd = formatClock(timing?.derived_end_at);
  const shownDuration = formatDuration(timing?.duration_minutes);
  const missing = timing?.undecidable_because ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Schedule
          {shownDuration && (
            <Badge variant="secondary" className="text-xs font-normal">
              {shownDuration} on the line
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="plan-date">
              Production date <span className="text-destructive">*</span>
            </Label>
            <Input id="plan-date" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
            {dateError && <p className="text-sm text-red-500 mt-1">{dateError}</p>}
          </div>
          <div>
            <Label htmlFor="plan-start">Planned start</Label>
            <Input
              id="plan-start"
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Clock time the line is meant to begin.
            </p>
          </div>
          <div>
            <Label htmlFor="plan-end">Expected finish</Label>
            <Input
              id="plan-end"
              type="time"
              value={endIsManual ? endTime : (derivedEnd ?? '')}
              onChange={(e) => onEndTimeChange(e.target.value)}
              readOnly={!endIsManual}
              className={endIsManual ? undefined : 'bg-muted/50 cursor-not-allowed'}
              placeholder="--:--"
            />
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="plan-end-manual"
                checked={endIsManual}
                onCheckedChange={(checked) => onEndIsManualChange(checked === true)}
              />
              <Label htmlFor="plan-end-manual" className="text-xs font-normal cursor-pointer">
                Set the finish time myself
              </Label>
            </div>
            {endTimeError && <p className="text-sm text-red-500 mt-1">{endTimeError}</p>}
          </div>
        </div>

        {timing && (derivedDuration || missing.length > 0) && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            {derivedDuration ? (
              <p className="text-muted-foreground">
                At {timing.rated_speed?.toLocaleString()} bottles/hr,{' '}
                {timing.bottles?.toLocaleString()} bottles ({timing.pieces_per_case} per case) take{' '}
                <span className="font-medium text-foreground">{derivedDuration}</span>
                {derivedEnd && startTime ? ` — finishing about ${derivedEnd}` : ''}.
                {endIsManual && ' Your own finish time is being used instead.'}
              </p>
            ) : (
              <p className="text-muted-foreground">
                The finish time cannot be worked out yet — {missing.join(', ')} still missing. Set
                it by hand if you need a window on the schedule.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
