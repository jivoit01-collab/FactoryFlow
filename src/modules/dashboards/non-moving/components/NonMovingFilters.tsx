import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import {
  Button,
  Input,
  Label,
  MultiSelect,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import { findDefaultMaterialGroup } from '../../utils/itemGroupDefaults';
import {
  DEFAULT_NON_MOVING_AGE,
  DEFAULT_NON_MOVING_STATUS_FILTER,
  NON_MOVING_AGE_OPTIONS,
  NON_MOVING_STATUS_FILTER_OPTIONS,
} from '../constants';
import type { ItemGroup, NonMovingFilters as NonMovingFiltersType } from '../types';
import type { MovementStatus } from '../utils/movementStatus';
import { defaultWarehouseSelection } from '../utils/nonMovingRows';

const TEXT_DEBOUNCE_MS = 500;

/** Stable identity, so an omitted preset cannot re-fire the effect below. */
const EMPTY_PRESET: string[] = [];

function normalizeSearch(value?: string): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

interface NonMovingFiltersProps {
  onFiltersChange: (filters: NonMovingFiltersType) => void;
  isFetching?: boolean;
  defaultValues: NonMovingFiltersType;
  itemGroups: ItemGroup[];
  isLoadingGroups?: boolean;
  warehouses?: string[];
  /** Warehouses to select once, when the report first says which exist. */
  warehousePreset?: string[];
  subGroups?: string[];
  externalResetSignal?: number;
}

interface FiltersForm {
  age: string;
  item_group: string;
  warehouse: string[];
  status: string[];
  sub_group: string[];
  search: string;
}

/** What `watch()` hands back: every field optional, arrays possibly sparse. */
type WatchedForm = {
  [K in keyof FiltersForm]?: FiltersForm[K] extends string[]
    ? (string | undefined)[]
    : FiltersForm[K];
};

function selected(values?: (string | undefined)[]): string[] {
  return (values ?? []).filter((value): value is string => Boolean(value));
}

function buildFilters(values: WatchedForm): NonMovingFiltersType {
  const age =
    values.age !== undefined && values.age !== '' ? Number(values.age) : DEFAULT_NON_MOVING_AGE;
  const warehouse = selected(values.warehouse);
  const subGroup = selected(values.sub_group);

  return {
    age: Number.isFinite(age) ? age : DEFAULT_NON_MOVING_AGE,
    item_group: Number(values.item_group) || 0,
    warehouse: warehouse.length ? warehouse : undefined,
    status: selected(values.status) as MovementStatus[],
    sub_group: subGroup.length ? subGroup : undefined,
    search: normalizeSearch(values.search),
  };
}

function formDefaultsFromFilters(defaultValues: NonMovingFiltersType): FiltersForm {
  return {
    age: String(defaultValues.age),
    item_group: String(defaultValues.item_group),
    warehouse: defaultValues.warehouse ?? [],
    status: defaultValues.status ?? [...DEFAULT_NON_MOVING_STATUS_FILTER],
    sub_group: defaultValues.sub_group ?? [],
    search: defaultValues.search ?? '',
  };
}

export function NonMovingFilters({
  onFiltersChange,
  isFetching,
  defaultValues,
  itemGroups,
  isLoadingGroups,
  warehouses = [],
  warehousePreset = EMPTY_PRESET,
  subGroups = [],
  externalResetSignal = 0,
}: NonMovingFiltersProps) {
  const { register, watch, reset, setValue, control } = useForm<FiltersForm>({
    defaultValues: formDefaultsFromFilters(defaultValues),
  });
  const latestFormDefaultsRef = useRef<FiltersForm>(formDefaultsFromFilters(defaultValues));

  useEffect(() => {
    latestFormDefaultsRef.current = formDefaultsFromFilters(defaultValues);
  }, [defaultValues]);

  useEffect(() => {
    if (externalResetSignal === 0) return;
    reset(latestFormDefaultsRef.current);
  }, [externalResetSignal, reset]);

  // Sync form when parent resolves the default item group
  useEffect(() => {
    setValue('item_group', String(defaultValues.item_group));
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

  /**
   * Select the stores the page opens on, once the report has said which of
   * them this company has.
   *
   * Keyed on the preset's CONTENT, not on the array it arrives in. The parent
   * derives it from the report rows, so every refetch — every click on the day
   * buttons or on Material Type — hands over a fresh array saying the same
   * thing. Depending on that identity re-applied the four stores each time and
   * undid the user's own warehouse choice mid-session. This is the opening
   * selection, applied once per distinct set, and clearable.
   *
   * Declared AFTER the `watch` subscription above on purpose: effects run in
   * declaration order, so a preset applied before the subscription exists would
   * fill the chips in without ever reaching the table.
   */
  const warehousePresetKey = warehousePreset.join('|');

  useEffect(() => {
    if (!warehousePresetKey) return;
    setValue('warehouse', warehousePresetKey.split('|'));
  }, [warehousePresetKey, setValue]);

  function handleReset() {
    const defaultGroup =
      findDefaultMaterialGroup(itemGroups, (group) => group.item_group_name)?.item_group_code ?? 0;
    const resetValues: FiltersForm = {
      age: String(DEFAULT_NON_MOVING_AGE),
      item_group: String(defaultGroup),
      // Reset goes back to how the page opens, not to an empty filter bar.
      warehouse: defaultWarehouseSelection(warehouses),
      status: [...DEFAULT_NON_MOVING_STATUS_FILTER],
      sub_group: [],
      search: '',
    };
    reset(resetValues);
    onFiltersChange(buildFilters(resetValues));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-search" className="text-xs">
          Search
        </Label>
        <Input
          id="nm-filter-search"
          type="text"
          placeholder="Item code, name, or warehouse"
          className="w-64"
          {...register('search')}
        />
      </div>

      {/* Material Type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-group" className="text-xs">
          Material Type
        </Label>
        <Select
          id="nm-filter-group"
          className="w-44"
          disabled={isLoadingGroups}
          {...register('item_group')}
        >
          {isLoadingGroups ? (
            <SelectOption value="0">Loading…</SelectOption>
          ) : (
            <>
              <SelectOption value="0">All (RM &amp; PM)</SelectOption>
              {itemGroups.map((g) => (
                <SelectOption key={g.item_group_code} value={String(g.item_group_code)}>
                  {g.item_group_name}
                </SelectOption>
              ))}
            </>
          )}
        </Select>
      </div>

      {/* Warehouse */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-warehouse" className="text-xs">
          Warehouse
        </Label>
        <Controller
          name="warehouse"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="nm-filter-warehouse"
              options={warehouses.map((w) => ({ label: w, value: w }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-44"
            />
          )}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-status" className="text-xs">
          Status
        </Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="nm-filter-status"
              options={NON_MOVING_STATUS_FILTER_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-40"
            />
          )}
        />
      </div>

      {/* Sub Group */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-subgroup" className="text-xs">
          Sub Group
        </Label>
        <Controller
          name="sub_group"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="nm-filter-subgroup"
              options={subGroups.map((sg) => ({ label: sg, value: sg }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-44"
            />
          )}
        />
      </div>

      {/* Age (Days) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nm-filter-age" className="text-xs">
          Idle At Least
        </Label>
        <Select id="nm-filter-age" className="w-36" {...register('age')}>
          {NON_MOVING_AGE_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={String(opt.value)}>
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
