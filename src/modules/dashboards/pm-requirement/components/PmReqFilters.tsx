import { Search, X } from 'lucide-react';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { PM_REQ_FILTERS } from '../constants';
import type { PmReqFilter } from '../types';

export interface PmReqFiltersProps {
  filter: PmReqFilter;
  onFilterChange: (filter: PmReqFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  family: string;
  onFamilyChange: (family: string) => void;
  families: string[];
  /** Row counts per filter, so a chip can say how much it would show. */
  counts: Record<PmReqFilter, number>;
}

/**
 * Which of the 196 components the table shows.
 *
 * The counts sit on the chips rather than being left to discover by clicking.
 * "Still short 14" and "Everything 196" is the shape of the month at a
 * glance, and it stops the default view from looking like the whole plan.
 */
export function PmReqFilters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  family,
  onFamilyChange,
  families,
  counts,
}: PmReqFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border p-0.5">
        {PM_REQ_FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? 'secondary' : 'ghost'}
            className="h-7 px-2.5 text-xs"
            title={option.hint}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
            <span
              className={cn(
                'ml-1.5 tabular-nums',
                filter === option.value ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {counts[option.value]}
            </span>
          </Button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Code or description…"
          className="h-9 pl-8 pr-8"
          aria-label="Search components"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <NativeSelect
        aria-label="Packaging family"
        className="h-9 w-full sm:w-44"
        value={family}
        onChange={(event) => onFamilyChange(event.target.value)}
      >
        <SelectOption value="">All families</SelectOption>
        {families.map((name) => (
          <SelectOption key={name} value={name}>
            {name}
          </SelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
