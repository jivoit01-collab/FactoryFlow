import { useMemo, useState } from 'react';

/**
 * Picking whole rows and whole columns, the way a spreadsheet does.
 *
 * A sheet has two margins you can click: the numbers down the left and the
 * letters across the top. Click a number and the row is picked; click a letter
 * and the column is; shift-click extends from the last one; the corner takes
 * everything. This hook is that, and the figures the status bar shows for
 * whatever is picked.
 *
 * WHY THIS IS NOT THE ARROW-KEY CURSOR
 * `useSpreadsheetKeys` deliberately keeps no state: the cursor IS the focused
 * cell, and the browser already tracks that. A selection is a different thing
 * — it outlives focus, it can be a hundred rows, and its whole point is the
 * total at the bottom — so it is state, and the two never fight because one is
 * about where you are and the other about what you have picked.
 *
 * ROWS ARE PICKED BY INDEX INTO WHAT IS ON SCREEN
 * Not by id. Picking rows 3 to 10 means those seven lines as they are laid out
 * now; re-sorting or filtering makes "rows 3 to 10" a different seven lines,
 * which is exactly what a spreadsheet does and what anyone dragging down a
 * column of freight expects. The selection is therefore cleared when the rows
 * underneath change identity — the caller does that by passing a new `reset`
 * key.
 */

export type SelectionKind = 'none' | 'rows' | 'columns' | 'all';

export interface SheetSelection {
  kind: SelectionKind;
  /** Row indexes (into the displayed order) when `kind` is 'rows'. */
  rows: Set<number>;
  /** Column keys when `kind` is 'columns'. */
  columns: Set<string>;
}

const EMPTY: SheetSelection = { kind: 'none', rows: new Set(), columns: new Set() };

/** Excel's own column names: A, B, … Z, AA, AB, … */
export function columnLetter(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** What the status bar says about a picked block of numbers. */
export interface SelectionFigures {
  /** Cells in the selection, blank ones included — Excel's "Count". */
  cells: number;
  /** Of those, the ones that hold a number — Excel's "Numerical count". */
  numbers: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

export function useSheetSelection<T>({
  rows,
  columnKeys,
  numberAt,
  reset,
}: {
  /** The rows as displayed, after filtering and sorting. */
  rows: T[];
  /** Every column key, left to right — the order the letters follow. */
  columnKeys: string[];
  /** What one cell is worth as a number, or null where it is text or blank. */
  numberAt: (row: T, columnKey: string) => number | null;
  /**
   * Changes whenever the rows underneath become a different set (a new
   * window, another sheet). The selection is dropped rather than left pointing
   * at lines that are no longer there.
   */
  reset?: unknown;
}) {
  const [selection, setSelection] = useState<SheetSelection>(EMPTY);
  const [anchor, setAnchor] = useState<{ row?: number; column?: string }>({});
  const [resetKey, setResetKey] = useState(reset);

  // Cleared in render rather than in an effect: an effect would paint one
  // frame of a selection that belongs to rows that are already gone.
  if (resetKey !== reset) {
    setResetKey(reset);
    if (selection.kind !== 'none') setSelection(EMPTY);
  }

  function pickRow(index: number, extend = false) {
    setSelection((current) => {
      if (extend && current.kind === 'rows' && anchor.row !== undefined) {
        const [lo, hi] = [anchor.row, index].sort((a, b) => a - b);
        const next = new Set<number>();
        for (let i = lo; i <= hi; i += 1) next.add(i);
        return { kind: 'rows', rows: next, columns: new Set() };
      }
      // Clicking the row already picked on its own clears it, so there is a
      // way back out that is not hunting for a Clear button.
      if (current.kind === 'rows' && current.rows.size === 1 && current.rows.has(index)) {
        return EMPTY;
      }
      return { kind: 'rows', rows: new Set([index]), columns: new Set() };
    });
    setAnchor({ row: index });
  }

  function pickColumn(key: string, extend = false) {
    setSelection((current) => {
      if (extend && current.kind === 'columns' && anchor.column !== undefined) {
        const from = columnKeys.indexOf(anchor.column);
        const to = columnKeys.indexOf(key);
        if (from >= 0 && to >= 0) {
          const [lo, hi] = [from, to].sort((a, b) => a - b);
          return {
            kind: 'columns',
            rows: new Set(),
            columns: new Set(columnKeys.slice(lo, hi + 1)),
          };
        }
      }
      if (
        current.kind === 'columns' &&
        current.columns.size === 1 &&
        current.columns.has(key)
      ) {
        return EMPTY;
      }
      return { kind: 'columns', rows: new Set(), columns: new Set([key]) };
    });
    setAnchor({ column: key });
  }

  function pickAll() {
    setSelection((current) =>
      current.kind === 'all'
        ? EMPTY
        : { kind: 'all', rows: new Set(), columns: new Set() },
    );
    setAnchor({});
  }

  const isRowPicked = (index: number) =>
    selection.kind === 'all' || (selection.kind === 'rows' && selection.rows.has(index));
  const isColumnPicked = (key: string) =>
    selection.kind === 'all' ||
    (selection.kind === 'columns' && selection.columns.has(key));

  /** The shading one cell gets. Rows and columns are never picked at once. */
  const cellClass = (index: number, key: string) =>
    isRowPicked(index) || isColumnPicked(key) ? 'bg-primary/10' : '';

  const figures = useMemo<SelectionFigures | null>(() => {
    if (selection.kind === 'none') return null;

    const pickedRows =
      selection.kind === 'rows'
        ? [...selection.rows].filter((i) => i < rows.length).map((i) => rows[i])
        : rows;
    const pickedColumns =
      selection.kind === 'columns' ? columnKeys.filter((k) => selection.columns.has(k)) : columnKeys;

    const values: number[] = [];
    let cells = 0;
    for (const row of pickedRows) {
      for (const key of pickedColumns) {
        cells += 1;
        const value = numberAt(row, key);
        if (value !== null && Number.isFinite(value)) values.push(value);
      }
    }

    const sum = values.reduce((total, value) => total + value, 0);
    return {
      cells,
      numbers: values.length,
      sum,
      average: values.length ? sum / values.length : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
    // `numberAt` is written inline by callers and is a new function every
    // render, so naming it here would never hit the cache; the selection and
    // the rows are what actually change the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, rows, columnKeys]);

  return {
    selection,
    figures,
    pickRow,
    pickColumn,
    pickAll,
    clear: () => setSelection(EMPTY),
    isRowPicked,
    isColumnPicked,
    cellClass,
  };
}
