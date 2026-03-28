import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Input, Label, NativeSelect as Select, SelectOption } from '@/shared/components/ui';

import { AGE_FILTER_OPTIONS } from '../constants';
import type { InventoryAgeFilterOptions, InventoryAgeFilters as FiltersType } from '../types';

const TEXT_DEBOUNCE_MS = 500;

interface InventoryAgeFiltersProps {
  onFiltersChange: (filters: FiltersType) => void;
  isFetching?: boolean;
  filterOptions?: InventoryAgeFilterOptions;
}

interface FiltersForm {
  search: string;
  warehouse: string;
  item_group: string;
  sub_group: string;
  variety: string;
  min_age: string;
}

function buildFilters(values: Partial<FiltersForm>): FiltersType {
  const filters: FiltersType = {};
  if (values.item_group) filters.item_group = values.item_group;
  if (values.search) filters.search = values.search;
  if (values.warehouse) filters.warehouse = values.warehouse;
  if (values.sub_group) filters.sub_group = values.sub_group;
  if (values.variety) filters.variety = values.variety;
  if (values.min_age && values.min_age !== '0') filters.min_age = Number(values.min_age);
  return filters;
}

export function InventoryAgeFilters({
  onFiltersChange,
  isFetching,
  filterOptions,
}: InventoryAgeFiltersProps) {
  const { register, watch, reset } = useForm<FiltersForm>({
    defaultValues: {
      search: '',
      warehouse: '',
      item_group: '',
      sub_group: '',
      variety: '',
      min_age: '0',
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      const isTextField = name === 'search';

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
    reset({ search: '', warehouse: '', item_group: '', sub_group: '', variety: '', min_age: '0' });
    onFiltersChange({});
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Item Group — primary filter */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-item-group" className="text-xs font-semibold">
          Item Group *
        </Label>
        <Select id="inv-age-item-group" className="w-52" {...register('item_group')}>
          <SelectOption value="">-- Select Group --</SelectOption>
          {filterOptions?.item_groups.map((g) => (
            <SelectOption key={g.item_group_code} value={g.item_group_name}>
              {g.item_group_name}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-search" className="text-xs">Search</Label>
        <Input
          id="inv-age-search"
          type="text"
          placeholder="Item code or name"
          className="w-56"
          {...register('search')}
        />
      </div>

      {/* Warehouse */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-warehouse" className="text-xs">Warehouse</Label>
        <Select id="inv-age-warehouse" className="w-36" {...register('warehouse')}>
          <SelectOption value="">All</SelectOption>
          {filterOptions?.warehouses.map((w) => (
            <SelectOption key={w} value={w}>{w}</SelectOption>
          ))}
        </Select>
      </div>

      {/* Sub Group */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-sub-group" className="text-xs">Sub Group</Label>
        <Select id="inv-age-sub-group" className="w-40" {...register('sub_group')}>
          <SelectOption value="">All</SelectOption>
          {filterOptions?.sub_groups.map((s) => (
            <SelectOption key={s} value={s}>{s}</SelectOption>
          ))}
        </Select>
      </div>

      {/* Variety */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-variety" className="text-xs">Variety</Label>
        <Select id="inv-age-variety" className="w-36" {...register('variety')}>
          <SelectOption value="">All</SelectOption>
          {filterOptions?.varieties.map((v) => (
            <SelectOption key={v} value={v}>{v}</SelectOption>
          ))}
        </Select>
      </div>

      {/* Age */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv-age-min-age" className="text-xs">Min Age</Label>
        <Select id="inv-age-min-age" className="w-32" {...register('min_age')}>
          {AGE_FILTER_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={opt.value}>
              {opt.label}
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
