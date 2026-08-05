import { RefreshCw } from 'lucide-react';

import type { BlowingMachine } from '@/modules/production/blowing/types';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { currentMonth, defaultDayFor, monthBounds, todayISO } from '../constants';
import type { BlowingDashboardFilters } from '../types';

interface BlowingFiltersProps {
  filters: BlowingDashboardFilters;
  machines: BlowingMachine[];
  isFetching?: boolean;
  onChange: (next: BlowingDashboardFilters) => void;
  onRefresh: () => void;
}

/**
 * Month + day + machine controls.
 *
 * Month is the spine: totals, the day-wise trend, make-vs-buy and variances all
 * follow it. Day picks the single date the by-machine / by-preform breakdown
 * shows (the daily report endpoint is single-date only) and is kept inside the
 * selected month. Machine narrows the runs table — the report endpoints take no
 * machine parameter.
 */
export function BlowingFilters({
  filters,
  machines,
  isFetching,
  onChange,
  onRefresh,
}: BlowingFiltersProps) {
  const { from, to } = monthBounds(filters.month);

  const onMonth = (month: string) => {
    if (!month) return;
    // Snap the day back inside the new month.
    onChange({ ...filters, month, day: defaultDayFor(month) });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Month
        <input
          type="month"
          value={filters.month}
          max={currentMonth()}
          onChange={(e) => onMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Day
        <input
          type="date"
          value={filters.day}
          min={from}
          max={to < todayISO() ? to : todayISO()}
          onChange={(e) => e.target.value && onChange({ ...filters, day: e.target.value })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Machine
        <select
          value={filters.machineId ?? ''}
          onChange={(e) =>
            onChange({ ...filters, machineId: e.target.value ? Number(e.target.value) : undefined })
          }
          className="min-w-[150px] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        >
          <option value="">All machines</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching} className="bg-background">
        <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  );
}
