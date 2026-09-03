import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import {
  BUDGET_APPROVAL_STATUS_OPTIONS,
  DEFAULT_BUDGET_APPROVAL_FILTERS,
} from '../constants';
import type { BudgetApprovalFilters as FiltersType, BudgetApprovalStatus } from '../types';
import type { ReportOptions } from '../types';

const TEXT_DEBOUNCE_MS = 500;

interface BudgetApprovalsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  options?: ReportOptions;
  isFetching?: boolean;
}

export function BudgetApprovalsFilters({
  filters,
  onFiltersChange,
  options,
  isFetching,
}: BudgetApprovalsFiltersProps) {
  const [searchText, setSearchText] = useState(filters.search);
  const [prevSearch, setPrevSearch] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the local search box in sync when filters change from outside
  // (e.g. a reset), reconciling during render instead of in an effect.
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setSearchText(filters.search);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function update(partial: Partial<FiltersType>) {
    onFiltersChange({ ...filters, ...partial, page: 1 });
  }

  function handleSearchChange(value: string) {
    setSearchText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      update({ search: value });
    }, TEXT_DEBOUNCE_MS);
  }

  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchText('');
    onFiltersChange({ ...DEFAULT_BUDGET_APPROVAL_FILTERS });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ba-filter-search" className="text-xs">
          Search
        </Label>
        <Input
          id="ba-filter-search"
          type="text"
          placeholder="Vendor, account, owner, remarks or doc no."
          className="w-72"
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ba-filter-status" className="text-xs">
          Status
        </Label>
        <Select
          id="ba-filter-status"
          className="w-36"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as BudgetApprovalStatus })}
        >
          {BUDGET_APPROVAL_STATUS_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Branch */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ba-filter-branch" className="text-xs">
          Branch
        </Label>
        <Select
          id="ba-filter-branch"
          className="w-36"
          value={filters.branch}
          onChange={(e) => update({ branch: e.target.value })}
        >
          <SelectOption value="">All Branches</SelectOption>
          {(options?.branches ?? []).map((branch) => (
            <SelectOption key={branch} value={branch}>
              {branch}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Effect Month */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ba-filter-month" className="text-xs">
          Effect Month
        </Label>
        <Select
          id="ba-filter-month"
          className="w-36"
          value={filters.effect_month}
          onChange={(e) => update({ effect_month: e.target.value })}
        >
          <SelectOption value="">All Months</SelectOption>
          {(options?.effect_months ?? []).map((month) => (
            <SelectOption key={month} value={month}>
              {month}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Reset */}
      <Button variant="outline" size="sm" onClick={handleReset} className="mb-0.5">
        Reset
      </Button>

      {/* Fetch indicator */}
      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}
