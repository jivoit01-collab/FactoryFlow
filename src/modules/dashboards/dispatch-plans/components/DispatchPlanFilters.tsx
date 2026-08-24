import { format } from 'date-fns';
import { CalendarCheck, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
  Switch,
} from '@/shared/components/ui';

import {
  BOOKING_STATUS_OPTIONS,
  createDefaultDispatchPlanFilters,
  defaultDateRange,
} from '../constants';
import type { DispatchPlanFilters } from '../types';

const SEARCH_DEBOUNCE_MS = 450;

/** Which date the window means — the labels have to say so, because the two
 *  answer different questions: "when was the bill raised" vs "when does it go out". */
const DATE_LABELS = {
  invoice: { from: 'Bill Created From', to: 'Bill Created To' },
  dispatch: { from: 'Dispatch Date From', to: 'Dispatch Date To' },
} as const;

interface DispatchPlanFiltersProps {
  filters: DispatchPlanFilters;
  onFiltersChange: (filters: DispatchPlanFilters) => void;
  isFetching?: boolean;
  /** What the From/To window filters on. Defaults to the SAP bill creation date
   *  (Bill Selection); the Plans page passes 'dispatch'. */
  dateBasis?: keyof typeof DATE_LABELS;
  /** Restores this page's own defaults. Falls back to the shared invoice-date ones. */
  onReset?: () => void;
}

export function DispatchPlanFilters({
  filters,
  onFiltersChange,
  isFetching,
  dateBasis = 'invoice',
  onReset,
}: DispatchPlanFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  // The range the Today toggle replaced, so switching it back off restores the
  // dates that were on screen rather than guessing a window.
  const [rangeBeforeToday, setRangeBeforeToday] = useState<{ from: string; to: string } | null>(
    null,
  );
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = filters.date_from === today && filters.date_to === today;
  // On the Plan page a search reaches every bill in planning, whatever the dates
  // say — otherwise a bill scheduled outside the window could not be found to
  // re-date it. Say so, so the dates above don't look broken.
  const searchIgnoresDates =
    dateBasis === 'dispatch' && !!filters.selected_only && !!filters.search;

  function toggleToday() {
    if (isToday) {
      const restored = rangeBeforeToday ?? defaultDateRange();
      setRangeBeforeToday(null);
      onFiltersChange({ ...filters, date_from: restored.from, date_to: restored.to });
      return;
    }
    setRangeBeforeToday({ from: filters.date_from, to: filters.date_to });
    onFiltersChange({ ...filters, date_from: today, date_to: today });
  }

  useEffect(() => {
    if ((filters.search ?? '') === searchDraft.trim()) return;
    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchDraft.trim() || undefined,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters, onFiltersChange, searchDraft]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex w-full flex-col gap-1.5 sm:w-auto">
        <Label htmlFor="dispatch-plan-date-from" className="text-xs font-semibold">
          {DATE_LABELS[dateBasis].from}
        </Label>
        <Input
          id="dispatch-plan-date-from"
          type="date"
          value={filters.date_from}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              date_from: event.target.value,
            })
          }
          className="w-full sm:w-40"
        />
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-auto">
        <Label htmlFor="dispatch-plan-date-to" className="text-xs font-semibold">
          {DATE_LABELS[dateBasis].to}
        </Label>
        <Input
          id="dispatch-plan-date-to"
          type="date"
          value={filters.date_to}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              date_to: event.target.value,
            })
          }
          className="w-full sm:w-40"
        />
      </div>

      {/* One click for the everyday question — "what is going out today" — so
          nobody has to type the same date into both boxes. Clicking again puts
          the earlier range back. */}
      <Button
        type="button"
        variant={isToday ? 'default' : 'outline'}
        size="sm"
        aria-pressed={isToday}
        title={isToday ? 'Back to the earlier date range' : 'Show only today'}
        onClick={toggleToday}
        className="mb-0.5 w-full sm:w-auto"
      >
        <CalendarCheck className="mr-2 h-4 w-4" />
        Today
      </Button>

      <div className="flex w-full flex-col gap-1.5 sm:w-auto">
        <Label htmlFor="dispatch-plan-search" className="text-xs">
          Search
        </Label>
        <Input
          id="dispatch-plan-search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Bill, party, vehicle"
          className="w-full sm:w-60"
        />
        {searchIgnoresDates && (
          <p className="text-[11px] leading-tight text-muted-foreground">
            Searching every planned bill — the dates above are ignored
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-auto">
        <Label htmlFor="dispatch-plan-status" className="text-xs">
          Status
        </Label>
        <Select
          id="dispatch-plan-status"
          value={filters.booking_status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              booking_status: event.target.value as DispatchPlanFilters['booking_status'],
            })
          }
          className="w-full sm:w-36"
        >
          {BOOKING_STATUS_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 sm:w-auto">
        <Switch
          id="dispatch-plan-show-jivo-mart"
          checked={!filters.exclude_jivo_mart_transfer}
          onChange={(checked) =>
            onFiltersChange({
              ...filters,
              exclude_jivo_mart_transfer: !checked,
            })
          }
        />
        <Label htmlFor="dispatch-plan-show-jivo-mart" className="cursor-pointer text-xs">
          Show Jivo Mart bills
        </Label>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setSearchDraft('');
          if (onReset) onReset();
          else onFiltersChange(createDefaultDispatchPlanFilters());
        }}
        className="mb-0.5 w-full sm:w-auto"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>

      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
