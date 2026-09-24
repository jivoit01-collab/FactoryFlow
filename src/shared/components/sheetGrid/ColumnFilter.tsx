import { ArrowDown, ArrowUp, Filter, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui';

import type { SortState } from './sorting';

export interface ColumnValue {
  value: string;
  label: string;
  count: number;
}

/**
 * A spreadsheet's filter button, on a table column.
 *
 * Click the header to sort it; click the funnel to pick which of its values to
 * keep. The list is the values that column actually holds, each with how many
 * rows carry it, searchable because a G/L column has three hundred of them.
 *
 * Two behaviours are worth stating because they are what make it feel like a
 * spreadsheet rather than a checkbox list:
 *
 * * **Nothing ticked means everything shown.** An empty selection is not an
 *   empty table — it is a filter that has not been used. Otherwise opening a
 *   filter and closing it again would blank the page.
 * * **A column's own filter does not narrow its own list.** Tick two branches
 *   and reopen it: all four are still there, so you can add a third without
 *   first clearing what you have. The other columns' lists DO narrow, which is
 *   what makes them useful.
 *
 * The popover is portalled, so it escapes any scrolling ancestor rather than
 * being clipped by one.
 */
export function ColumnFilter({
  label,
  columnKey,
  sort,
  onSort,
  selected,
  onSelect,
  values,
  isLoading = false,
  onOpen,
  align = 'left',
  sortable = true,
  truncated = false,
  total,
}: {
  label: string;
  columnKey: string;
  sort?: SortState;
  onSort?: (next: SortState) => void;
  /** Ticked values. Empty means "everything", not "nothing". */
  selected: string[];
  onSelect: (next: string[]) => void;
  values: ColumnValue[];
  isLoading?: boolean;
  /** Called when the popover opens, so the values can be fetched on demand. */
  onOpen?: () => void;
  align?: 'left' | 'right';
  sortable?: boolean;
  /**
   * True when the column holds more distinct values than `values` carries.
   *
   * A list that quietly stops at its cap is the one thing worse than no
   * filter: you tick what you can see, and the rows behind the values it left
   * out vanish without saying why. Said in the footer instead, with how many
   * there really are, so an invoice-number column reads as a list that has
   * been cut rather than as the whole of it.
   */
  truncated?: boolean;
  /** How many distinct values the column really holds. */
  total?: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const active = sort?.key === columnKey;
  const filtered = selected.length > 0;

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return values;
    return values.filter((row) => row.label.toLowerCase().includes(needle));
  }, [values, search]);

  const allShownTicked =
    shown.length > 0 && shown.every((row) => selected.includes(row.value));

  function toggle(value: string) {
    onSelect(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function toggleAllShown() {
    if (allShownTicked) {
      const shownValues = new Set(shown.map((row) => row.value));
      onSelect(selected.filter((v) => !shownValues.has(v)));
    } else {
      onSelect([...new Set([...selected, ...shown.map((row) => row.value)])]);
    }
  }

  return (
    // `whitespace-nowrap`: a heading sets the column's width, it does not wrap
    // to fit one. "Jivo Mart Invoice" stacked three lines high and took the
    // whole header row with it, on every column. Wider is cheap -- the sheet
    // scrolls sideways already -- and a tall header band is not.
    <th
      className={`whitespace-nowrap px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div
        className={`flex items-center gap-1 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        {sortable && onSort ? (
          <button
            type="button"
            onClick={() =>
              onSort({
                key: columnKey,
                direction: active && sort?.direction === 'asc' ? 'desc' : 'asc',
              })
            }
            className={`inline-flex items-center gap-1 hover:text-foreground ${
              active ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label={`Sort by ${label}`}
          >
            {label}
            {active &&
              (sort?.direction === 'asc' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              ))}
          </button>
        ) : (
          <span className="text-muted-foreground">{label}</span>
        )}

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) onOpen?.();
            if (!next) setSearch('');
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Filter ${label}`}
              className={`rounded p-0.5 hover:bg-muted ${
                filtered ? 'text-primary' : 'text-muted-foreground/60'
              }`}
            >
              <Filter
                className="h-3 w-3"
                // Filled in when the column is doing something, so a filtered
                // column is obvious without opening it.
                fill={filtered ? 'currentColor' : 'none'}
              />
            </button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-0">
            <div className="border-b p-2">
              <Input
                autoFocus
                className="h-8"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : values.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing to filter on.
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                  <Checkbox checked={allShownTicked} onCheckedChange={toggleAllShown} />
                  {search ? 'Select these' : 'Select all'}
                </label>

                <div className="max-h-56 overflow-y-auto">
                  {shown.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No value matches that.
                    </p>
                  ) : (
                    shown.map((row) => (
                      <label
                        key={row.value}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selected.includes(row.value)}
                          onCheckedChange={() => toggle(row.value)}
                        />
                        <span className="min-w-0 flex-1 truncate">{row.label}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {row.count}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-t p-2">
              <span className="text-xs text-muted-foreground">
                {truncated
                  ? `First ${values.length} of ${total ?? values.length}`
                  : filtered
                    ? `${selected.length} picked`
                    : 'Showing all'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!filtered}
                onClick={() => onSelect([])}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </th>
  );
}
