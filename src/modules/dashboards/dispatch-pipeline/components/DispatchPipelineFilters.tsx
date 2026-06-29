import { Loader2, RotateCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Input, Label } from '@/shared/components/ui';

import type { DispatchPipelineFilters as Filters } from '../types';

interface DispatchPipelineFiltersProps {
  filters: Filters;
  isFetching: boolean;
  onChange: (filters: Filters) => void;
  onRefresh: () => void;
}

export function DispatchPipelineFilters({
  filters,
  isFetching,
  onChange,
  onRefresh,
}: DispatchPipelineFiltersProps) {
  const [search, setSearch] = useState(filters.search ?? '');

  // Keep the local search box in sync if filters are reset elsewhere.
  useEffect(() => {
    setSearch(filters.search ?? '');
  }, [filters.search]);

  // Debounce search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if ((filters.search ?? '') === search) return;
    const handle = window.setTimeout(() => onChange({ ...filters, search }), 350);
    return () => window.clearTimeout(handle);
  }, [search, filters, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <div className="space-y-1">
        <Label htmlFor="pipeline-date-from" className="text-xs">
          From
        </Label>
        <Input
          id="pipeline-date-from"
          type="date"
          className="h-9 w-40"
          value={filters.date_from}
          max={filters.date_to || undefined}
          onChange={(event) => onChange({ ...filters, date_from: event.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="pipeline-date-to" className="text-xs">
          To
        </Label>
        <Input
          id="pipeline-date-to"
          type="date"
          className="h-9 w-40"
          value={filters.date_to}
          min={filters.date_from || undefined}
          onChange={(event) => onChange({ ...filters, date_to: event.target.value })}
        />
      </div>

      <div className="min-w-[220px] flex-1 space-y-1">
        <Label htmlFor="pipeline-search" className="text-xs">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pipeline-search"
            type="search"
            className="h-9 pl-8"
            placeholder="Vehicle, invoice, transporter, driver, customer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={onRefresh}
        disabled={isFetching}
      >
        {isFetching ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="mr-2 h-4 w-4" />
        )}
        Refresh
      </Button>
    </div>
  );
}
