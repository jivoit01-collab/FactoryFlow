/**
 * The sorting the module's tables share.
 *
 * Two flavours, because the tables are not the same shape. The cash register
 * is paged, so it has to be sorted by the server -- ordering fifty rows in the
 * browser only shuffles the ones that happened to land on the page, which
 * reads as a sort and is not one. Everything else (a card statement, a
 * person's ledger, the branch list) arrives whole and is sorted here.
 *
 * `SortHeader` is the same button either way, so a column header behaves
 * identically whichever side is doing the work.
 */
import { useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

/** `-amount` / `amount`, which is what the API takes. */
export function toSortParam(sort: SortState): string {
  return sort.direction === 'desc' ? `-${sort.key}` : sort.key;
}

/**
 * Sort rows in the browser, for the tables that arrive whole.
 *
 * `getValue` returns what a column is worth for a row — a number, a string, or
 * null for a blank. Blanks always sink to the bottom whichever way the column
 * is pointing, because "no branch" is not smaller than "Beverage"; it is
 * absent, and absent rows are the ones you want out of the way.
 */
export function useClientSort<T>(
  rows: T[],
  sort: SortState,
  getValue: (row: T, key: string) => string | number | null | undefined,
) {
  return useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = getValue(a, sort.key);
      const right = getValue(b, sort.key);

      const leftBlank = left === null || left === undefined || left === '';
      const rightBlank = right === null || right === undefined || right === '';
      if (leftBlank && rightBlank) return 0;
      if (leftBlank) return 1;
      if (rightBlank) return -1;

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * factor;
      }
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor;
    });
  }, [rows, sort, getValue]);
}
