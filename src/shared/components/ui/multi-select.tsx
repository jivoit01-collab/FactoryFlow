import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/shared/utils';

import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Show a search box that filters options by label (case-insensitive). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Allow adding a free-text value that is not in the options list. */
  creatable?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'All',
  className,
  id,
  searchable = false,
  searchPlaceholder = 'Search…',
  creatable = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const trimmed = query.trim();
  const canCreate =
    creatable &&
    trimmed.length > 0 &&
    !options.some(
      (o) =>
        o.label.toLowerCase() === trimmed.toLowerCase() ||
        o.value.toLowerCase() === trimmed.toLowerCase(),
    ) &&
    !selected.some((v) => v.toLowerCase() === trimmed.toLowerCase());

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function addCustom() {
    if (!canCreate) return;
    onChange([...selected, trimmed]);
    setQuery('');
  }

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-9 items-center justify-between gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[240px] p-1" align="start">
        {searchable && (
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-input bg-background py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
        <div className="max-h-60 overflow-y-auto">
          {canCreate && (
            <button
              type="button"
              onClick={addCustom}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">
                Add “<span className="font-medium">{trimmed}</span>”
              </span>
            </button>
          )}
          {visibleOptions.length === 0 && !canCreate && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
          )}
          {visibleOptions.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleValue(option.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
