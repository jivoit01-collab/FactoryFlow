import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { columnLetter, rangeAddress, useSheetSelection } from '../useSheetSelection';

interface Row {
  litres: number | null;
  freight: number | null;
  party: string;
}

const ROWS: Row[] = [
  { litres: 100, freight: 10, party: 'A' },
  { litres: 200, freight: 20, party: 'B' },
  { litres: 300, freight: null, party: 'C' },
];

const COLUMNS = ['litres', 'freight', 'party'];

function setup(rows: Row[] = ROWS, reset?: unknown) {
  return renderHook(
    (props: { rows: Row[]; reset?: unknown }) =>
      useSheetSelection({
        rows: props.rows,
        columnKeys: COLUMNS,
        numberAt: (row, key) =>
          key === 'litres' ? row.litres : key === 'freight' ? row.freight : null,
        textAt: (row, key) =>
          key === 'party' ? row.party : String(row[key as 'litres' | 'freight'] ?? ''),
        reset: props.reset,
      }),
    { initialProps: { rows, reset } },
  );
}

describe('a cell’s address', () => {
  it('names columns the way a spreadsheet does', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(columnLetter(27)).toBe('AB');
  });

  it('writes one cell as a cell and a block as a block', () => {
    expect(rangeAddress({ top: 3, left: 2, bottom: 3, right: 2 })).toBe('C4');
    expect(rangeAddress({ top: 2, left: 1, bottom: 11, right: 5 })).toBe('B3:F12');
  });
});

describe('selecting cells', () => {
  it('picks the one cell pressed on', () => {
    const { result } = setup();
    act(() => result.current.startCell(1, 1));

    expect(result.current.address).toBe('B2');
    expect(result.current.describe()).toBe('1 cell');
    expect(result.current.isCellPicked(1, 1)).toBe(true);
    expect(result.current.isCellPicked(1, 0)).toBe(false);
    expect(result.current.figures).toMatchObject({ cells: 1, numbers: 1, sum: 20 });
  });

  it('takes the block dragged across, whichever way the drag goes', () => {
    const { result } = setup();
    act(() => result.current.startCell(2, 1));
    act(() => result.current.extendCell(0, 0));

    // Dragged up and left, so the block is still written top-left first.
    expect(result.current.address).toBe('A1:B3');
    expect(result.current.describe()).toBe('3 rows × 2 columns');
    expect(result.current.figures).toMatchObject({ cells: 6, numbers: 5, sum: 630 });
  });

  it('ignores a drag that never began', () => {
    const { result } = setup();
    act(() => result.current.extendCell(2, 2));

    expect(result.current.figures).toBeNull();
  });

  it('shift-clicking a cell extends from where the selection began', () => {
    const { result } = setup();
    act(() => result.current.startCell(0, 0));
    act(() => result.current.startCell(1, 1, true));

    expect(result.current.address).toBe('A1:B2');
    expect(result.current.figures).toMatchObject({ cells: 4, sum: 330 });
  });

  it('copies the block out tab-separated, so it pastes as cells', () => {
    const { result } = setup();
    act(() => result.current.startCell(0, 0));
    act(() => result.current.extendCell(1, 2));

    expect(result.current.selectionText()).toBe('100\t10\tA\n200\t20\tB');
  });

  it('hands over nothing to copy when nothing is picked', () => {
    const { result } = setup();
    expect(result.current.selectionText()).toBeNull();
  });
});

describe('selecting from the margins', () => {
  it('picks a whole row from its number, and totals it', () => {
    const { result } = setup();
    act(() => result.current.pickRow(0));

    expect(result.current.address).toBe('A1:C1');
    expect(result.current.isRowPicked(0)).toBe(true);
    expect(result.current.isRowPicked(1)).toBe(false);
    expect(result.current.figures).toMatchObject({ cells: 3, numbers: 2, sum: 110 });
  });

  it('shift-clicking a second row number takes the rows between', () => {
    const { result } = setup();
    act(() => result.current.pickRow(0));
    act(() => result.current.pickRow(2, true));

    expect(result.current.describe()).toBe('3 rows × 3 columns');
    expect(result.current.figures?.sum).toBe(630);
  });

  it('grows the block to take in the row clicked, however it was built', () => {
    // Pick 1, shift 3 -> rows 1..3. Shift 2 again and it must still be 1..3,
    // not 3..2: the block grows to what was clicked, it does not pivot on
    // whichever end happened to be clicked first.
    const { result } = setup();
    act(() => result.current.pickRow(0));
    act(() => result.current.pickRow(2, true));
    expect(result.current.address).toBe('A1:C3');
  });

  it('keeps the far end when the block was built upwards', () => {
    // The one that was wrong on screen: pick row 3, shift row 1 (block is
    // 1..3), then shift row 3 of a longer sheet. An anchor would pivot on the
    // row first clicked and lose the top.
    const { result } = setup();
    act(() => result.current.pickRow(2));
    act(() => result.current.pickRow(0, true));
    expect(result.current.address).toBe('A1:C3');

    act(() => result.current.pickRow(2, true));
    // Still anchored on the top of the block, not on row 3 where it began.
    expect(result.current.address).toBe('A1:C3');
  });

  it('shrinks from the far side when the click lands inside the block', () => {
    const { result } = setup();
    act(() => result.current.pickRow(0));
    act(() => result.current.pickRow(2, true));
    act(() => result.current.pickRow(1, true));

    expect(result.current.address).toBe('A1:C2');
  });

  it('picks a whole column from its letter, and totals it down the sheet', () => {
    const { result } = setup();
    act(() => result.current.pickColumn(0));

    expect(result.current.address).toBe('A1:A3');
    expect(result.current.isColumnPicked(0)).toBe(true);
    expect(result.current.figures).toMatchObject({ cells: 3, numbers: 3, sum: 600 });
  });

  it('shift-clicking a second letter takes the columns between', () => {
    const { result } = setup();
    act(() => result.current.pickColumn(0));
    act(() => result.current.pickColumn(2, true));

    expect(result.current.describe()).toBe('3 rows × 3 columns');
    expect(result.current.figures).toMatchObject({ numbers: 5, sum: 630 });
  });

  it('the corner takes the sheet, and shades every cell', () => {
    const { result } = setup();
    act(() => result.current.pickAll());

    expect(result.current.isRowPicked(2)).toBe(true);
    expect(result.current.isColumnPicked(2)).toBe(true);
    expect(result.current.cellClass(2, 2)).toContain('bg-primary');
    expect(result.current.figures).toMatchObject({ cells: 9, numbers: 5, sum: 630 });
  });

  it('does not call a part-width block a picked row', () => {
    const { result } = setup();
    act(() => result.current.startCell(0, 0));
    act(() => result.current.extendCell(0, 1));

    expect(result.current.isCellPicked(0, 1)).toBe(true);
    // The margin is lit faintly -- the block reaches into the row -- but not
    // solidly, because it stops short of C.
    expect(result.current.isRowTouched(0)).toBe(true);
    expect(result.current.isRowPicked(0)).toBe(false);
  });
});

describe('the sequence that was wrong on screen', () => {
  /** Eight lines, so a block can be built upwards and then grown downwards. */
  function eightRows() {
    const rows = Array.from({ length: 8 }, (_, n) => ({
      litres: n + 1,
      freight: null,
      party: String(n + 1),
    }));
    return renderHook(() =>
      useSheetSelection({
        rows,
        columnKeys: COLUMNS,
        numberAt: (row) => row.litres,
        textAt: (row) => row.party,
      }),
    );
  }

  it('row 5, shift row 3, shift row 8 covers rows 3 to 8', () => {
    const { result } = eightRows();
    act(() => result.current.pickRow(4));
    act(() => result.current.pickRow(2, true));
    expect(result.current.address).toBe('A3:C5');

    act(() => result.current.pickRow(7, true));

    // Not A5:C8, which is what pivoting on the first row clicked would give.
    expect(result.current.address).toBe('A3:C8');
    expect(result.current.describe()).toBe('6 rows × 3 columns');
  });
});

describe('when the sheet underneath changes', () => {
  it('lets go when the rows become a different set', () => {
    const { result, rerender } = setup(ROWS, 'april');
    act(() => result.current.pickRow(0));
    expect(result.current.figures).not.toBeNull();

    rerender({ rows: ROWS.slice(0, 1), reset: 'may' });

    expect(result.current.figures).toBeNull();
  });

  it('never reads past the end when the same window loses rows', () => {
    const { result, rerender } = setup(ROWS, 'same');
    act(() => result.current.pickAll());

    // A column filter narrowed it without the window changing.
    rerender({ rows: ROWS.slice(0, 2), reset: 'same' });

    expect(result.current.figures).toMatchObject({ cells: 6, sum: 330 });
    expect(result.current.selectionText()).toBe('100\t10\tA\n200\t20\tB');
  });
});
