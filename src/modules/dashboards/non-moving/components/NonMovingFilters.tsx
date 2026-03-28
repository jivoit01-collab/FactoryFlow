import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Input, Label, NativeSelect as Select, SelectOption } from '@/shared/components/ui';

import { NON_MOVING_AGE_OPTIONS } from '../constants';
import type { ItemGroup, NonMovingFilters as NonMovingFiltersType } from '../types';

const TEXT_DEBOUNCE_MS = 500;

interface NonMovingFiltersProps {
  onFiltersChange: (filters: NonMovingFiltersType) => void;
  isFetching?: boolean;
  defaultValues: NonMovingFiltersType;
  itemGroups: ItemGroup[];
  isLoadingGroups?: boolean;
}

interface FiltersForm {
  age: string;
  item_group: string;
  search: string;
}

function buildFilters(values: Partial<FiltersForm>): NonMovingFiltersType {
  return {
    age: Number(values.age) || 45,
    item_group: Number(values.item_group) || 0,
    search: values.search || undefined,
  };
}

export function NonMovingFilters({
  onFiltersChange,
  isFetching,
  defaultValues,
  itemGroups,
  isLoadingGroups,
}: NonMovingFiltersProps) {
  const { register, watch, reset, setValue } = useForm<FiltersForm>({
    defaultValues: {
      age: String(defaultValues.age),
      item_group: String(defaultValues.item_group),
      search: defaultValues.search ?? '',
    },
  });

  // Sync form when parent resolves the default item group
  useEffect(() => {
    if (defaultValues.item_group !== 0) {
      setValue('item_group', String(defaultValues.item_group));
    }
  }, [defaultValues.item_group, setValue]);

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
    const rawMaterial = itemGroups.find(
      (g) => g.item_group_name.toLowerCase() === 'raw material',
    );
    const defaultGroup = rawMaterial?.item_group_code ?? itemGroups[0]?.item_group_code ?? 0;
    reset({ age: '45', item_group: String(defaultGroup), search: '' });
    onFiltersChange({ age: 45, item_group: defaultGroup });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Age (Days) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-age" className="text-xs">Age (Days)</Label>
        <Select id="nm-filter-age" className="w-32" {...register('age')}>
          {NON_MOVING_AGE_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Item Group */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-group" className="text-xs">Item Group</Label>
        <Select
          id="nm-filter-group"
          className="w-56"
          disabled={isLoadingGroups}
          {...register('item_group')}
        >
          {isLoadingGroups ? (
            <SelectOption value="0">Loading…</SelectOption>
          ) : (
            itemGroups.map((g) => (
              <SelectOption key={g.item_group_code} value={String(g.item_group_code)}>
                {g.item_group_name}
              </SelectOption>
            ))
          )}
        </Select>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-search" className="text-xs">Search</Label>
        <Input
          id="nm-filter-search"
          type="text"
          placeholder="Item code, name, or branch"
          className="w-64"
          {...register('search')}
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
