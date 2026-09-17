import { useState } from 'react';

import type { ColumnValue } from './ColumnFilter';
import type { SortState } from './sorting';

/**
 * Excel-style column filters for a table that arrives whole.
 *
 * The register has to ask the server for its value lists, because it is paged
 * and only the server can see the whole book. Everything else in the module —
 * a card statement, a person's ledger, the branch list — arrives complete, so
 * the same lists can be built here from the rows themselves.
 *
 * The behaviour is deliberately identical to the server's, including the part
 * that is easy to get wrong: **a column's own filter does not narrow its own
 * list**. Tick two branches, reopen the filter, and all four are still there,
 * so a third can be added without clearing the first two. Every other column's
 * list is narrowed by it, which is what makes them worth having.
 *
 * Nothing here is memoised, deliberately. `columns` is defined inline by every
 * caller, so it is a new object on every render and any dependency array that
 * named it honestly would never hit. These tables are a few hundred rows at
 * most — the work is a couple of passes over an array, far cheaper than the
 * bookkeeping needed to skip it, and cheaper still than a stale cache.
 */
export interface ColumnSpec<T> {
  value: (row: T) => string | null | undefined;
  /** Used for sorting when the displayed text would sort wrongly. */
  sortValue?: (row: T) => string | number | null | undefined;
  /**
   * Rows this column shows nothing in, even though the field behind it has a
   * value.
   *
   * These tables put one amount under two headings and let the movement
   * decide which: Paid on or Drawn off, Taken or Cleared. A withdrawal's
   * "Paid on" cell is empty, so its figure must not be offered on that
   * column's filter -- ticking 50,000 under Paid on and getting back a row
   * whose Paid on cell is blank is worse than having no filter, because the
   * blank one at least does not lie about what it did.
   */
  blankWhen?: (row: T) => boolean;
}

/** Stands for an empty cell, so "no branch" can be ticked like any other value. */
export const BLANK = '—';

export function useLocalColumns<T>(
  rows: T[],
  columns: Record<string, ColumnSpec<T>>,
  initialSort: SortState,
) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<SortState>(initialSort);

  const read = (row: T, key: string) => {
    const spec = columns[key];
    if (spec?.blankWhen?.(row)) return BLANK;
    const raw = spec?.value(row);
    return raw === null || raw === undefined || raw === '' ? BLANK : String(raw);
  };

  /** Rows surviving every filter except the one named. */
  const survivors = (except: string | null) =>
    rows.filter((row) =>
      Object.entries(filters).every(([key, picked]) => {
        if (key === except || picked.length === 0) return true;
        return picked.includes(read(row, key));
      }),
    );

  const factor = sort.direction === 'asc' ? 1 : -1;
  const spec = columns[sort.key];
  const sortValueOf = (row: T) =>
    spec?.sortValue ? spec.sortValue(row) : (spec?.value(row) ?? null);

  const sorted = [...survivors(null)].sort((a, b) => {
    const left = sortValueOf(a);
    const right = sortValueOf(b);
    const leftBlank = left === null || left === undefined || left === '';
    const rightBlank = right === null || right === undefined || right === '';
    // Blanks sink whichever way the column points: "no branch" is not smaller
    // than "Beverage", it is absent, and absent rows are the ones to get out
    // of the way.
    if (leftBlank && rightBlank) return 0;
    if (leftBlank) return 1;
    if (rightBlank) return -1;
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * factor;
    }
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor;
  });

  /** The values one column offers, counted over everything its own filter hides. */
  const valuesFor = (key: string): ColumnValue[] => {
    const counts = new Map<string, number>();
    for (const row of survivors(key)) {
      const value = read(row, key);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: value === BLANK ? '(blank)' : value,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  };

  const filteredColumns = Object.entries(filters)
    .filter(([, picked]) => picked.length > 0)
    .map(([key]) => key);

  /** Everything a `<ColumnFilter>` needs for one column. */
  const column = (key: string, label: string, align: 'left' | 'right' = 'left') => ({
    label,
    columnKey: key,
    sort,
    onSort: setSort,
    selected: filters[key] ?? [],
    onSelect: (picked: string[]) => setFilters((f) => ({ ...f, [key]: picked })),
    values: valuesFor(key),
    align,
  });

  return {
    rows: sorted,
    column,
    filteredColumns,
    clearFilters: () => setFilters({}),
    sort,
    setSort,
  };
}
