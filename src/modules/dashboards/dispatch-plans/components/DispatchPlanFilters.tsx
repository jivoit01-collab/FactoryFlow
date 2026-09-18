import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FilterAction, FilterBar, FilterField } from '@/shared/components/page';
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

  // Counted so the bar can say how much of the list the filters are hiding —
  // the dates are always set, so only the ones a user turns on are counted.
  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.booking_status && filters.booking_status !== 'all' ? 1 : 0) +
    (filters.exclude_jivo_mart_transfer ? 0 : 1) +
    (isToday ? 1 : 0);

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
    <FilterBar
      isFetching={isFetching}
      activeCount={activeCount}
      onReset={() => {
        setSearchDraft('');
        if (onReset) onReset();
        else onFiltersChange(createDefaultDispatchPlanFilters());
      }}
    >
      <FilterField label={DATE_LABELS[dateBasis].from} htmlFor="dispatch-plan-date-from">
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
      </FilterField>

      <FilterField label={DATE_LABELS[dateBasis].to} htmlFor="dispatch-plan-date-to">
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
      </FilterField>

      {/* One click for the everyday question — "what is going out today" — so
          nobody has to type the same date into both boxes. Clicking again puts
          the earlier range back. */}
      <FilterAction>
        <Button
          type="button"
          variant={isToday ? 'default' : 'outline'}
          size="sm"
          aria-pressed={isToday}
          title={isToday ? 'Back to the earlier date range' : 'Show only today'}
          onClick={toggleToday}
          className="h-10 w-full sm:w-auto"
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          Today
        </Button>
      </FilterAction>

      <FilterField
        label="Search"
        htmlFor="dispatch-plan-search"
        hint={searchIgnoresDates && 'Searching every planned bill — the dates above are ignored'}
      >
        <Input
          id="dispatch-plan-search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Bill, party, vehicle"
          className="w-full sm:w-60"
        />
      </FilterField>

      <FilterField label="Status" htmlFor="dispatch-plan-status">
        <Select
          id="dispatch-plan-status"
          value={filters.booking_status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              booking_status: event.target.value as DispatchPlanFilters['booking_status'],
            })
          }
          className="h-10 w-full sm:w-36"
        >
          {BOOKING_STATUS_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </FilterField>

      <FilterAction>
        <div className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 sm:w-auto">
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
      </FilterAction>
    </FilterBar>
  );
}
