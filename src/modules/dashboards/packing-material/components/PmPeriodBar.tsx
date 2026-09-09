import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  monthAnchor,
  monthLabel,
  monthValue,
  PACKING_MATERIAL_TOP_OPTIONS,
  shiftMonth,
} from '../constants';

export interface PmPeriodBarProps {
  /** First of the month being shown, in UTC. */
  month: Date;
  onMonthChange: (month: Date) => void;
  top: number;
  onTopChange: (top: number) => void;
  /** First of the current month, so the board cannot walk into the future. */
  latestMonth: Date;
  isFetching: boolean;
  onRefresh: () => void;
}

/**
 * The period both sections are read over.
 *
 * A month at a time, because that is the question — "top ten of the month" —
 * and a free date range invites a five-week window that reads as a month and
 * is not one. Forward is stopped at the current month: there is nothing to
 * report from a month that has not happened, and an empty board is
 * indistinguishable from a broken one.
 */
export function PmPeriodBar({
  month,
  onMonthChange,
  top,
  onTopChange,
  latestMonth,
  isFetching,
  onRefresh,
}: PmPeriodBarProps) {
  const atLatest = month.getTime() >= latestMonth.getTime();
  const isCurrentMonth = atLatest;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 sm:p-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          disabled={atLatest}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0">
        <Input
          type="month"
          aria-label="Month"
          className="w-[10.5rem]"
          value={monthValue(month)}
          max={monthValue(latestMonth)}
          onChange={(event) => {
            const value = event.target.value;
            if (value) onMonthChange(monthAnchor(value));
          }}
        />
      </div>

      <p className="min-w-0 truncate text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{monthLabel(month)}</span>
        {/* Said out loud, because "September" on the 9th is nine days and the
            two sections would otherwise read as a full month's figures. */}
        {isCurrentMonth && <span> · month to date</span>}
      </p>

      <div className="ml-auto flex items-center gap-2">
        <NativeSelect
          aria-label="How many items each list shows"
          className="w-[7.5rem]"
          value={String(top)}
          onChange={(event) => onTopChange(Number(event.target.value))}
        >
          {PACKING_MATERIAL_TOP_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={String(option.value)}>
              {option.label}
            </SelectOption>
          ))}
        </NativeSelect>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
