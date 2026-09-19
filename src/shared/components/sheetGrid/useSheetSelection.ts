import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Selecting cells, the way a spreadsheet does.
 *
 * One rectangle, held as the four edges it covers. Everything that can be
 * picked is that rectangle in some shape: drag across cells and it is the
 * block you dragged; click a row number and it is that row, full width; click
 * a column letter and it is that column, full height; click the corner and it
 * is the sheet. Shift extends from where the last one started, exactly as it
 * does in Excel — which is why there is one model here and not three.
 *
 * Coordinates are positions in what is ON SCREEN — row 0 is the top line as
 * currently sorted and filtered, not a record id. Picking B3:F12 means that
 * block where it lies now; re-sorting makes it a different twelve rows, which
 * is what a sheet does and what anyone dragging down a column of freight
 * expects. When the rows underneath become a different set the selection is
 * dropped rather than left pointing at lines that are gone — the caller says
 * when by changing `reset`.
 *
 * WHY THIS IS NOT THE ARROW-KEY CURSOR
 * `useSpreadsheetKeys` deliberately keeps no state: the cursor IS the focused
 * cell, and the browser already tracks that. A selection outlives focus, can
 * be five hundred cells, and exists to be totalled and copied — so it is
 * state. The two never fight: one is where you are, the other is what you have
 * picked, and in a sheet those are also two different things.
 */

export interface CellRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

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

/** "C4", or "B3:F12" for a block — the address Excel puts in its name box. */
export function rangeAddress(range: CellRange): string {
  const from = `${columnLetter(range.left)}${range.top + 1}`;
  const to = `${columnLetter(range.right)}${range.bottom + 1}`;
  return from === to ? from : `${from}:${to}`;
}

/** What the status bar says about a picked block of numbers. */
export interface SelectionFigures {
  /** Cells in the block, blank ones included — Excel's "Count". */
  cells: number;
  /** Of those, the ones holding a number — Excel's "Numerical count". */
  numbers: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

function span(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Which edge of a block a shift-click holds on to.
 *
 * Shift-click GROWS the block to take in what was clicked: click below it and
 * the top stays put, click above it and the bottom does. Click inside and it
 * shrinks from the far side.
 *
 * A spreadsheet does this from a hidden anchor -- the cell you first clicked --
 * which is the same thing until you extend twice. Pick row 5, shift-click row
 * 3 (block is 3 to 5), then shift-click row 8: an anchor says 5 to 8, because
 * the anchor is still at 5. What anyone watching expects is 3 to 8, and that
 * is what holding the far edge gives.
 */
function farEdge(at: number, lo: number, hi: number): number {
  return at < lo ? hi : lo;
}

export function useSheetSelection<T>({
  rows,
  columnKeys,
  numberAt,
  textAt,
  reset,
}: {
  /** The rows as displayed, after filtering and sorting. */
  rows: T[];
  /** Every column key, left to right. */
  columnKeys: string[];
  /** What one cell is worth as a number, or null where it is text or blank. */
  numberAt: (row: T, columnKey: string) => number | null;
  /** What one cell reads as, for copying a block out to the clipboard. */
  textAt?: (row: T, columnKey: string) => string;
  /** Changes when the rows underneath become a different set. */
  reset?: unknown;
}) {
  const [range, setRange] = useState<CellRange | null>(null);
  /** Where the current selection started, so shift and drag extend from it. */
  const [anchor, setAnchor] = useState<{ row: number; column: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resetKey, setResetKey] = useState(reset);

  // Cleared during render, not in an effect: an effect would paint one frame
  // of a selection belonging to rows that are already gone.
  if (resetKey !== reset) {
    setResetKey(reset);
    if (range) setRange(null);
    setAnchor(null);
  }

  const lastRow = rows.length - 1;
  const lastColumn = columnKeys.length - 1;

  const to = useCallback(
    (row: number, column: number, from: { row: number; column: number }): CellRange => {
      const [top, bottom] = span(from.row, row);
      const [left, right] = span(from.column, column);
      return { top, left, bottom, right };
    },
    [],
  );

  /** Mouse down on a cell: a new selection, or shift to extend the one held. */
  const startCell = useCallback(
    (row: number, column: number, extend = false) => {
      if (extend && range) {
        setRange(
          to(row, column, {
            row: farEdge(row, range.top, range.bottom),
            column: farEdge(column, range.left, range.right),
          }),
        );
      } else {
        setAnchor({ row, column });
        setRange({ top: row, left: column, bottom: row, right: column });
      }
      setDragging(true);
    },
    [range, to],
  );

  /** Dragged onto a cell: the block from where the drag began to here. */
  const extendCell = useCallback(
    (row: number, column: number) => {
      if (!dragging || !anchor) return;
      setRange(to(row, column, anchor));
    },
    [dragging, anchor, to],
  );

  // The mouse is let go anywhere, including outside the table, so the drag
  // ends on the window rather than on a cell.
  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [dragging]);

  const pickRow = useCallback(
    (row: number, extend = false) => {
      const from = extend && range ? farEdge(row, range.top, range.bottom) : row;
      const [top, bottom] = span(from, row);
      setRange({ top, bottom, left: 0, right: Math.max(0, lastColumn) });
      setAnchor({ row: extend ? from : row, column: 0 });
    },
    [range, lastColumn],
  );

  const pickColumn = useCallback(
    (column: number, extend = false) => {
      const from = extend && range ? farEdge(column, range.left, range.right) : column;
      const [left, right] = span(from, column);
      setRange({ left, right, top: 0, bottom: Math.max(0, lastRow) });
      setAnchor({ row: 0, column: extend ? from : column });
    },
    [range, lastRow],
  );

  const pickAll = useCallback(() => {
    setRange({ top: 0, left: 0, bottom: Math.max(0, lastRow), right: Math.max(0, lastColumn) });
    setAnchor({ row: 0, column: 0 });
  }, [lastRow, lastColumn]);

  const clear = useCallback(() => {
    setRange(null);
    setAnchor(null);
  }, []);

  const isCellPicked = (row: number, column: number) =>
    !!range &&
    row >= range.top &&
    row <= range.bottom &&
    column >= range.left &&
    column <= range.right;

  /**
   * A margin lights up two ways, as a sheet's do: faintly for a row the block
   * merely reaches into, solidly for one it spans end to end.
   */
  const isRowTouched = (row: number) => !!range && row >= range.top && row <= range.bottom;
  const isColumnTouched = (column: number) =>
    !!range && column >= range.left && column <= range.right;

  const isRowPicked = (row: number) =>
    isRowTouched(row) && !!range && range.left === 0 && range.right >= lastColumn;

  const isColumnPicked = (column: number) =>
    isColumnTouched(column) && !!range && range.top === 0 && range.bottom >= lastRow;

  /** The shading one cell gets. */
  const cellClass = (row: number, column: number) =>
    isCellPicked(row, column) ? 'bg-primary/10' : '';

  const figures = useMemo<SelectionFigures | null>(() => {
    if (!range) return null;

    const values: number[] = [];
    let cells = 0;
    for (let r = range.top; r <= Math.min(range.bottom, lastRow); r += 1) {
      for (let c = range.left; c <= Math.min(range.right, lastColumn); c += 1) {
        cells += 1;
        const value = numberAt(rows[r], columnKeys[c]);
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
    // render, so naming it would never hit the cache; the block and the rows
    // are what change the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, rows, columnKeys, lastRow, lastColumn]);

  /**
   * The picked cells as text, row by row, with the keys of the columns they
   * came from — enough for a caller to put the block on the clipboard in
   * whatever forms it wants (see `copyBlock`).
   */
  const selectionGrid = useCallback((): { cells: string[][]; columns: string[] } | null => {
    if (!range || !textAt) return null;
    const picked = columnKeys.slice(range.left, Math.min(range.right, lastColumn) + 1);
    const cells: string[][] = [];
    for (let r = range.top; r <= Math.min(range.bottom, lastRow); r += 1) {
      cells.push(picked.map((key) => textAt(rows[r], key)));
    }
    return { cells, columns: picked };
  }, [range, rows, columnKeys, textAt, lastRow, lastColumn]);

  /** The same block as tab-separated text, for anything that wants just that. */
  const selectionText = useCallback((): string | null => {
    const grid = selectionGrid();
    return grid ? grid.cells.map((line) => line.join('\t')).join('\n') : null;
  }, [selectionGrid]);

  /** "12 rows × 3 columns", or "1 cell" — what is picked, in words. */
  const describe = useCallback((): string => {
    if (!range) return '';
    const height = Math.min(range.bottom, lastRow) - range.top + 1;
    const width = Math.min(range.right, lastColumn) - range.left + 1;
    if (height === 1 && width === 1) return '1 cell';
    const rowPart = `${height} ${height === 1 ? 'row' : 'rows'}`;
    const columnPart = `${width} ${width === 1 ? 'column' : 'columns'}`;
    return `${rowPart} × ${columnPart}`;
  }, [range, lastRow, lastColumn]);

  return {
    range,
    address: range ? rangeAddress(range) : '',
    figures,
    dragging,
    startCell,
    extendCell,
    pickRow,
    pickColumn,
    pickAll,
    clear,
    isCellPicked,
    isRowTouched,
    isColumnTouched,
    isRowPicked,
    isColumnPicked,
    cellClass,
    selectionGrid,
    selectionText,
    describe,
  };
}
