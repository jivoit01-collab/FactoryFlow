import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ReportPeriodControls } from '../hooks';
import type { ReportView } from '../types';

const VIEWS: { value: ReportView; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'month', label: 'Monthly' },
];

const INPUT_CLASSES =
  'h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground';

/**
 * Daily or monthly, which one, and a step either side.
 *
 * The view is a segmented pair rather than a dropdown so the one in force is
 * readable at a glance. The arrows step a day or a month; forward stops at the
 * latest day, because nothing after it has figures.
 */
export function ReportPeriodBar({
  period,
  isFetching,
}: {
  period: ReportPeriodControls;
  isFetching?: boolean;
}) {
  const unit = period.view === 'day' ? 'day' : 'month';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div
        className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
        role="group"
        aria-label="Report view"
      >
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => period.setView(option.value)}
            aria-pressed={period.view === option.value}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              period.view === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={period.previous}
          aria-label={`Previous ${unit}`}
          title={`Previous ${unit}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {period.view === 'day' ? (
          <input
            type="date"
            aria-label="Day"
            value={period.date}
            max={period.latest}
            onChange={(event) => event.target.value && period.setDate(event.target.value)}
            className={INPUT_CLASSES}
          />
        ) : (
          <input
            type="month"
            aria-label="Month"
            value={period.month}
            max={period.latest.slice(0, 7)}
            onChange={(event) => event.target.value && period.setMonth(event.target.value)}
            className={INPUT_CLASSES}
          />
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={period.next}
          disabled={!period.canGoForward}
          aria-label={`Next ${unit}`}
          title={`Next ${unit}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!period.isLatest && (
        <Button type="button" variant="ghost" size="sm" onClick={period.toLatest}>
          <CalendarDays className="mr-2 h-4 w-4" />
          {period.view === 'day' ? 'Latest day' : 'This month'}
        </Button>
      )}

      {isFetching && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </span>
      )}
    </div>
  );
}
