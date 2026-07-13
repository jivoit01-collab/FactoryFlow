import { Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
  Switch,
} from '@/shared/components/ui';

import { BOOKING_STATUS_OPTIONS, createDefaultDispatchPlanFilters } from '../constants';
import type { DispatchPlanFilters } from '../types';

const SEARCH_DEBOUNCE_MS = 450;

interface DispatchPlanFiltersProps {
  filters: DispatchPlanFilters;
  onFiltersChange: (filters: DispatchPlanFilters) => void;
  isFetching?: boolean;
}

export function DispatchPlanFilters({
  filters,
  onFiltersChange,
  isFetching,
}: DispatchPlanFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

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
          From
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
          To
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
          onFiltersChange(createDefaultDispatchPlanFilters());
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
