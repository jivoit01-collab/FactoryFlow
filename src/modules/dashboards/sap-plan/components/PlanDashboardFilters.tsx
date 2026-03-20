import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Checkbox, Input, Label, NativeSelect as Select, SelectOption } from '@/shared/components/ui';

import { STATUS_FILTER_OPTIONS } from '../constants';
import type { PlanDashboardFilters } from '../types';

const TEXT_DEBOUNCE_MS = 500;

interface PlanDashboardFiltersProps {
  onFiltersChange: (filters: PlanDashboardFilters) => void;
  defaultValues?: PlanDashboardFilters;
  isFetching?: boolean;
}

interface FiltersForm {
  status: 'all' | 'planned' | 'released';
  due_date_from: string;
  due_date_to: string;
  warehouse: string;
  sku: string;
  show_shortfall_only: boolean;
}

function buildFilters(values: Partial<FiltersForm>): PlanDashboardFilters {
  const filters: PlanDashboardFilters = {};
  if (values.status && values.status !== 'all') filters.status = values.status;
  if (values.due_date_from) filters.due_date_from = values.due_date_from;
  if (values.due_date_to) filters.due_date_to = values.due_date_to;
  if (values.warehouse) filters.warehouse = values.warehouse;
  if (values.sku) filters.sku = values.sku;
  if (values.show_shortfall_only) filters.show_shortfall_only = true;
  return filters;
}

export function PlanDashboardFilters({ onFiltersChange, defaultValues, isFetching }: PlanDashboardFiltersProps) {
  const { register, watch, reset, getValues } = useForm<FiltersForm>({
    defaultValues: {
      status: defaultValues?.status ?? 'all',
      due_date_from: defaultValues?.due_date_from ?? '',
      due_date_to: defaultValues?.due_date_to ?? '',
      warehouse: defaultValues?.warehouse ?? '',
      sku: defaultValues?.sku ?? '',
      show_shortfall_only: defaultValues?.show_shortfall_only ?? false,
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      // Text fields are debounced; all other fields (select, date, checkbox) fire immediately
      const isTextField = name === 'warehouse' || name === 'sku';

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
    reset({
      status: 'all',
      due_date_from: '',
      due_date_to: '',
      warehouse: '',
      sku: '',
      show_shortfall_only: false,
    });
    onFiltersChange({});
  }

  const showShortfallOnly = watch('show_shortfall_only');

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status" className="text-xs">Status</Label>
        <Select id="filter-status" className="w-36" {...register('status')}>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Due Date From */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from" className="text-xs">Due Date From</Label>
        <Input
          id="filter-from"
          type="date"
          className="w-36"
          {...register('due_date_from')}
        />
      </div>

      {/* Due Date To */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to" className="text-xs">Due Date To</Label>
        <Input
          id="filter-to"
          type="date"
          className="w-36"
          {...register('due_date_to')}
        />
      </div>

      {/* Warehouse */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-warehouse" className="text-xs">Warehouse</Label>
        <Input
          id="filter-warehouse"
          type="text"
          placeholder="e.g. WH-01"
          className="w-28"
          {...register('warehouse')}
        />
      </div>

      {/* SKU */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-sku" className="text-xs">SKU</Label>
        <Input
          id="filter-sku"
          type="text"
          placeholder="e.g. FG-001"
          className="w-28"
          {...register('sku')}
        />
      </div>

      {/* Shortfall Only */}
      <div className="flex items-center gap-2 pb-0.5">
        <Checkbox
          id="filter-shortfall"
          checked={showShortfallOnly}
          onCheckedChange={(checked) => {
            const current = getValues();
            reset({ ...current, show_shortfall_only: !!checked });
          }}
        />
        <Label htmlFor="filter-shortfall" className="cursor-pointer text-xs">
          Shortfall only
        </Label>
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
