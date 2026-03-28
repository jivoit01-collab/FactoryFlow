import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Input, Label, MultiSelect } from '@/shared/components/ui';

import { STOCK_STATUS_FILTER_OPTIONS } from '../constants';
import type { StockDashboardFilters } from '../types';

const TEXT_DEBOUNCE_MS = 500;

interface StockLevelFiltersProps {
  onFiltersChange: (filters: StockDashboardFilters) => void;
  isFetching?: boolean;
  defaultValues?: StockDashboardFilters;
}

interface FiltersForm {
  search: string;
  warehouse: string;
  status: string[];
}

function buildFilters(values: Partial<FiltersForm>): StockDashboardFilters {
  const filters: StockDashboardFilters = {};
  if (values.search) filters.search = values.search;
  if (values.warehouse) filters.warehouse = values.warehouse;
  if (values.status?.length) filters.status = values.status as StockDashboardFilters['status'];
  return filters;
}

export function StockLevelFilters({ onFiltersChange, isFetching, defaultValues }: StockLevelFiltersProps) {
  const { register, watch, reset, control } = useForm<FiltersForm>({
    defaultValues: {
      search: defaultValues?.search ?? '',
      warehouse: defaultValues?.warehouse ?? '',
      status: defaultValues?.status ?? [],
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      const isTextField = name === 'search' || name === 'warehouse';

      if (isTextField) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onFiltersChange(buildFilters(values));
        }, TEXT_DEBOUNCE_MS);
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onFiltersChange(buildFilters(values));
      }
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, onFiltersChange]);

  function handleReset() {
    reset({ search: '', warehouse: '', status: [] });
    onFiltersChange({});
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-search" className="text-xs">Search</Label>
        <Input
          id="stock-filter-search"
          type="text"
          placeholder="Item code, name, or warehouse"
          className="w-64"
          {...register('search')}
        />
      </div>

      {/* Warehouse */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-warehouse" className="text-xs">Warehouse</Label>
        <Input
          id="stock-filter-warehouse"
          type="text"
          placeholder="e.g. WH-01"
          className="w-28"
          {...register('warehouse')}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-status" className="text-xs">Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="stock-filter-status"
              options={STOCK_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-36"
            />
          )}
        />
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
