import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Filter,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useColumnValues } from '../api';
import type { BudgetApprovalFilters, SortDirection } from '../types';

interface ColumnFilterHeaderProps {
  label: string;
  /** Backend field name; undefined renders a plain, non-interactive header. */
  field?: string;
  /** Field the column sorts by; defaults to `field`. */
  sortField?: string;
  filterable?: boolean;
  filters: BudgetApprovalFilters;
  onFiltersChange: (filters: BudgetApprovalFilters) => void;
  align?: 'left' | 'right';
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

/**
 * Excel/DBeaver-style table header: click the label to sort, click the funnel
 * to pick from the column's distinct values (searchable checkbox list, with
 * row counts computed under every other active filter).
 */
export function ColumnFilterHeader({
  label,
  field,
  sortField,
  filterable = true,
  filters,
  onFiltersChange,
  align = 'left',
}: ColumnFilterHeaderProps) {
  const effectiveSortField = sortField ?? field;
  const [open, setOpen] = useState(false);
  const [valueSearch, setValueSearch] = useState('');
  const [draft, setDraft] = useState<string[]>([]);

  const selected = (field && filters.column_filters[field]) || [];
  const isFiltered = selected.length > 0;
  const isSorted = Boolean(effectiveSortField) && filters.sort_by === effectiveSortField;

  const valuesQuery = useColumnValues(field ?? '', filters, open && Boolean(field));

  const visibleValues = useMemo(() => {
    const values = valuesQuery.data?.values ?? [];
    const term = valueSearch.trim().toLowerCase();
    if (!term) return values;
    return values.filter((v) => v.value.toLowerCase().includes(term));
  }, [valuesQuery.data, valueSearch]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(selected);
      setValueSearch('');
    }
  }

  function toggleSort() {
    if (!effectiveSortField) return;
    const dir: SortDirection =
      filters.sort_by === effectiveSortField && filters.sort_dir === 'asc' ? 'desc' : 'asc';
    onFiltersChange({ ...filters, sort_by: effectiveSortField, sort_dir: dir, page: 1 });
  }

  function toggleValue(value: string) {
    setDraft((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  function applyDraft(values: string[]) {
    if (!field) return;
    const column_filters = { ...filters.column_filters };
    if (values.length) {
      column_filters[field] = values;
    } else {
      delete column_filters[field];
    }
    onFiltersChange({ ...filters, column_filters, page: 1 });
    setOpen(false);
  }

  const canFilter = filterable && Boolean(field);

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        align === 'right' && 'justify-end',
      )}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center whitespace-nowrap',
          effectiveSortField && 'cursor-pointer hover:text-foreground',
        )}
        onClick={toggleSort}
        disabled={!effectiveSortField}
      >
        {label}
        {effectiveSortField && <SortIcon active={isSorted} dir={filters.sort_dir} />}
      </button>

      {canFilter && (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Filter ${label}`}
              className={cn(
                'rounded p-0.5 hover:bg-muted',
                isFiltered ? 'text-primary' : 'text-muted-foreground/60',
              )}
            >
              <Filter className={cn('h-3.5 w-3.5', isFiltered && 'fill-current')} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <div className="space-y-2">
              <Input
                autoFocus
                placeholder="Search values…"
                className="h-8 text-sm"
                value={valueSearch}
                onChange={(e) => setValueSearch(e.target.value)}
              />

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setDraft(visibleValues.map((v) => v.value))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setDraft([])}
                >
                  Clear
                </button>
              </div>

              <div className="max-h-56 space-y-0.5 overflow-y-auto rounded border p-1">
                {valuesQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading values…
                  </div>
                ) : visibleValues.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">No values</p>
                ) : (
                  visibleValues.map((v) => (
                    <label
                      key={v.value}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm normal-case hover:bg-muted"
                    >
                      <Checkbox
                        checked={draft.includes(v.value)}
                        onCheckedChange={() => toggleValue(v.value)}
                      />
                      <span className="min-w-0 flex-1 truncate" title={v.value}>
                        {v.value || '(blank)'}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {v.count.toLocaleString('en-IN')}
                      </span>
                    </label>
                  ))
                )}
              </div>

              {valuesQuery.data?.meta.truncated && (
                <p className="text-xs text-muted-foreground">
                  Too many values to list — search to narrow down.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => applyDraft([])}
                >
                  Clear filter
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => applyDraft(draft)}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
