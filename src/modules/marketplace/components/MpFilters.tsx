/**
 * Shared filter controls for the marketplace pages, so every screen filters the
 * same way: a clearable search box, segmented status chips with counts, and a
 * toolbar to lay them out.
 */
import { Search, X } from 'lucide-react';

import { Badge, Input } from '@/shared/components/ui';

export function MpSearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-8 pr-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface MpChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Segmented filter chips — one active at a time. */
export function MpFilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: MpChipOption<T>[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
            {o.count !== undefined ? (
              <Badge
                variant={active ? 'default' : 'secondary'}
                className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              >
                {o.count}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Toolbar row: search on the left, chips/actions on the right. */
export function MpFilterBar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}>
      {children}
    </div>
  );
}

/** "Showing X of Y" hint — tells the user a filter is hiding rows. */
export function MpResultCount({ shown, total, noun = 'item' }: { shown: number; total: number; noun?: string }) {
  if (shown === total) return <span className="text-xs text-muted-foreground tabular-nums">{total} {noun}{total === 1 ? '' : 's'}</span>;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      Showing <strong className="text-foreground">{shown}</strong> of {total} {noun}s
    </span>
  );
}
