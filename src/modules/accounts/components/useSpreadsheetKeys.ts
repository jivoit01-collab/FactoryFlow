import { type KeyboardEvent,useCallback, useEffect, useRef } from 'react';

/**
 * Move around a table with the keyboard, the way a spreadsheet does.
 *
 * The people who keep this book have kept it in Excel for years, so the
 * register is read the way a sheet is read: click a cell, then walk it with
 * the arrow keys.
 *
 * THE SELECTED CELL IS THE FOCUSED CELL
 * There is no "selected cell" state anywhere. The browser already tracks
 * exactly one focused element, moves it, scrolls it into view and tells a
 * screen reader about it — so the cursor is simply DOM focus, and the
 * highlight is a `:focus` rule. State would have to be kept in step with
 * focus on every click, page change, filter and re-sort, and would be wrong
 * the first time they disagreed.
 *
 * WHY THE CELLS ARE MADE FOCUSABLE IN AN EFFECT
 * A `<td>` is not focusable, and this hook does not own the cells — the page
 * writes them, a dozen of them per row. Rather than thread a prop through
 * every one, the effect sets `tabIndex` on the body cells after each render,
 * which is ordinary DOM work on an element React has already put on screen.
 * It runs on every render deliberately: rows come and go with paging,
 * filtering and sorting, and a new row's cells would otherwise be dead.
 *
 * `-1` and not `0`: Tab should step over the table to the next control, as it
 * does in a sheet, rather than walk five hundred cells one press at a time.
 */

/** How far PageUp and PageDown jump. A screenful, roughly. */
const PAGE_JUMP = 10;

export function useSpreadsheetKeys({
  onCopy,
}: {
  /** Called with the cell's text when it is copied, for whatever feedback. */
  onCopy?: (text: string) => void;
} = {}) {
  const gridRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const body = gridRef.current?.tBodies?.[0];
    if (!body) return;
    for (const row of Array.from(body.rows)) {
      for (const cell of Array.from(row.cells)) {
        cell.tabIndex = -1;
      }
    }
  });

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableElement>) => {
      const body = gridRef.current?.tBodies?.[0];
      if (!body) return;

      // Only when the cell itself holds focus. A button or a checkbox inside
      // one is its own control, and arrow keys pressed there belong to it --
      // stealing them would break the tick boxes on the register.
      const cell = event.target as HTMLElement;
      if (cell.tagName !== 'TD') return;

      const rows = Array.from(body.rows);
      const row = cell.parentElement as HTMLTableRowElement | null;
      if (!row) return;
      const r = row.sectionRowIndex;
      const c = (cell as HTMLTableCellElement).cellIndex;

      const jump = (nextRow: number, nextCol: number) => {
        const target = rows[Math.max(0, Math.min(rows.length - 1, nextRow))];
        if (!target) return;
        const cells = target.cells;
        const landing =
          cells[Math.max(0, Math.min(cells.length - 1, nextCol))];
        if (!landing) return;
        event.preventDefault();
        landing.focus();
      };

      const key = event.key;
      const step = event.ctrlKey || event.metaKey;

      if (key === 'ArrowUp') return jump(r - 1, c);
      if (key === 'ArrowDown') return jump(r + 1, c);
      if (key === 'ArrowLeft') return jump(r, c - 1);
      if (key === 'ArrowRight') return jump(r, c + 1);
      // Enter walks down the column, which is how a sheet is filled in.
      if (key === 'Enter') return jump(event.shiftKey ? r - 1 : r + 1, c);
      if (key === 'PageUp') return jump(r - PAGE_JUMP, c);
      if (key === 'PageDown') return jump(r + PAGE_JUMP, c);
      if (key === 'Home') return jump(step ? 0 : r, 0);
      if (key === 'End') {
        return step
          ? jump(rows.length - 1, Number.MAX_SAFE_INTEGER)
          : jump(r, Number.MAX_SAFE_INTEGER);
      }

      if (step && (key === 'c' || key === 'C')) {
        // innerText where there is a layout to ask (it keeps the line
        // breaks a cell shows); textContent everywhere else.
        const text = (cell.innerText ?? cell.textContent ?? '').trim();
        if (!text) return;
        event.preventDefault();
        void navigator.clipboard
          ?.writeText(text)
          .then(() => onCopy?.(text))
          .catch(() => {
            /* A browser that refuses the clipboard is not worth a dialog. */
          });
      }
    },
    [onCopy],
  );

  /**
   * Spread onto the `<table>`.
   *
   * The focus ring is written as a descendant variant rather than a class on
   * every cell, for the same reason `tabIndex` is: the cells belong to the
   * page, not to this hook.
   */
  const gridProps = {
    ref: gridRef,
    onKeyDown,
    className:
      '[&_tbody_td:focus]:outline-none [&_tbody_td:focus]:ring-2 ' +
      '[&_tbody_td:focus]:ring-inset [&_tbody_td:focus]:ring-primary ' +
      '[&_tbody_td:focus]:bg-primary/5',
  };

  return { gridRef, gridProps };
}
