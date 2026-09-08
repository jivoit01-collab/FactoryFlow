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
  Switch,
} from '@/shared/components/ui';

import { PM_DEMAND_SOURCES, PM_DEMAND_TOP_OPTIONS } from '../constants';
import type {
  PmDemandFilters as PmDemandFiltersType,
  PmDemandSource,
} from '../types';

const TEXT_DEBOUNCE_MS = 500;

/**
 * Separates the three things this bar controls: which records you are reading,
 * over what period, and how the rows are narrowed. Seven controls in one flat
 * row read as a wall; three groups read as three decisions.
 */
function Divider() {
  return <div className="mb-1.5 hidden h-9 w-px self-end bg-border lg:block" />;
}

interface PmDemandFiltersProps {
  onFiltersChange: (filters: PmDemandFiltersType) => void;
  defaultValues: PmDemandFiltersType;
  subGroups?: string[];
  isFetching?: boolean;
}

interface FiltersForm {
  date_from: string;
  date_to: string;
  source: PmDemandSource;
  top: string;
  include_intercompany: boolean;
  search: string;
  sub_group: string[];
}

function formDefaults(filters: PmDemandFiltersType): FiltersForm {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    source: filters.source,
    top: String(filters.top),
    include_intercompany: filters.include_intercompany,
    search: filters.search ?? '',
    sub_group: filters.sub_group ?? [],
  };
}

function buildFilters(values: Partial<FiltersForm>, fallback: PmDemandFiltersType): PmDemandFiltersType {
  const top = Number(values.top);
  return {
    date_from: values.date_from || fallback.date_from,
    date_to: values.date_to || fallback.date_to,
    source: values.source ?? fallback.source,
    top: Number.isFinite(top) && top > 0 ? top : fallback.top,
    include_intercompany: values.include_intercompany ?? true,
    search: values.search?.trim() ? values.search.trim() : undefined,
    sub_group: values.sub_group?.length ? values.sub_group : undefined,
  };
}

export function PmDemandFilters({
  onFiltersChange,
  defaultValues,
  subGroups = [],
  isFetching,
}: PmDemandFiltersProps) {
  const { register, watch, reset, control } = useForm<FiltersForm>({
    defaultValues: formDefaults(defaultValues),
  });

  // The app records a truck leaving, not who was invoiced, so it cannot split
  // group-company sales out. Disabling the switch is honest; leaving it live
  // would imply a filter that does nothing.
  const selectedSource = watch('source');
  const intercompanyAvailable = selectedSource !== 'app';

  const fallbackRef = useRef(defaultValues);
  useEffect(() => {
    fallbackRef.current = defaultValues;
  }, [defaultValues]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // A date half-typed into a date input is a valid change event with an
      // empty value, so the text fields wait; the selects and the switch fire
      // at once because each is one deliberate click.
      const isTextField = name === 'search' || name === 'date_from' || name === 'date_to';
      if (isTextField) {
        debounceRef.current = setTimeout(() => {
          onFiltersChange(buildFilters(values, fallbackRef.current));
        }, TEXT_DEBOUNCE_MS);
      } else {
        onFiltersChange(buildFilters(values, fallbackRef.current));
      }
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, onFiltersChange]);

  function handleReset() {
    reset(formDefaults(fallbackRef.current));
    onFiltersChange(fallbackRef.current);
  }

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      {/* First in the row on purpose: it changes what every other figure on
          the board means, so it should be read before the dates. */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Data from</Label>
        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <div
              className="flex gap-1 rounded-md border bg-muted/30 p-1"
              role="group"
              aria-label="Data source"
            >
              {PM_DEMAND_SOURCES.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={field.value === opt.value ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  aria-pressed={field.value === opt.value}
                  title={opt.hint}
                  onClick={() => field.onChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-from" className="text-xs">
          From
        </Label>
        <Input id="pm-filter-from" type="date" className="w-40" {...register('date_from')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-to" className="text-xs">
          To
        </Label>
        <Input id="pm-filter-to" type="date" className="w-40" {...register('date_to')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-top" className="text-xs">
          List length
        </Label>
        <Select id="pm-filter-top" className="w-28" {...register('top')}>
          {PM_DEMAND_TOP_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <Divider />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-subgroup" className="text-xs">
          Family
        </Label>
        <Controller
          name="sub_group"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="pm-filter-subgroup"
              options={subGroups.map((sg) => ({ label: sg, value: sg }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-44"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-search" className="text-xs">
          Search
        </Label>
        <Input
          id="pm-filter-search"
          type="text"
          placeholder="Item code, name or family"
          className="w-60"
          {...register('search')}
        />
      </div>

      {/* Two thirds of a month's finished goods can be invoiced to a group
          company, so this switch moves the dispatch figures a long way. It is
          on by default: the packaging physically left the factory either way. */}
      <div className="mb-1 flex flex-col gap-1.5">
        <Label htmlFor="pm-filter-intercompany" className="text-xs">
          Group-company sales
        </Label>
        <Controller
          name="include_intercompany"
          control={control}
          render={({ field }) => (
            <div
              className="flex h-9 items-center gap-2"
              title={
                intercompanyAvailable
                  ? undefined
                  : 'Unavailable on app data: the gate records a truck leaving, not who was invoiced'
              }
            >
              <Switch
                id="pm-filter-intercompany"
                checked={field.value}
                disabled={!intercompanyAvailable}
                onChange={field.onChange}
              />
              <span className="text-xs text-muted-foreground">
                {!intercompanyAvailable
                  ? 'SAP data only'
                  : field.value
                    ? 'Counted as dispatch'
                    : 'Third-party only'}
              </span>
            </div>
          )}
        />
      </div>

      <Button variant="outline" size="sm" onClick={handleReset} className="mb-0.5">
        Reset
      </Button>

      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}
