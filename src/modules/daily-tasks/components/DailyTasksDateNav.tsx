import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { shiftLocalISO, todayLocalISO } from '../utils';

export interface DailyTasksDateNavProps {
  /** Local `YYYY-MM-DD`. */
  date: string;
  onChange: (date: string) => void;
  /** Blocks stepping back when the viewer lacks the reports permission. */
  canGoBack?: boolean;
}

/** `‹ Today ›` day stepper. Forward is disabled at today — there is no future sheet. */
export function DailyTasksDateNav({ date, onChange, canGoBack = true }: DailyTasksDateNavProps) {
  const today = todayLocalISO();
  const isToday = date === today;

  const label = isToday
    ? 'Today'
    : new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous day"
        disabled={!canGoBack}
        title={canGoBack ? undefined : 'Viewing earlier days needs the activity reports permission'}
        onClick={() => onChange(shiftLocalISO(date, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[7.5rem] text-center text-sm font-medium">{label}</div>

      <Button
        variant="outline"
        size="icon"
        aria-label="Next day"
        disabled={isToday}
        onClick={() => onChange(shiftLocalISO(date, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
