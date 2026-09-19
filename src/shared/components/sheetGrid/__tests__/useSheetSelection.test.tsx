import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { columnLetter, useSheetSelection } from '../useSheetSelection';

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
        reset: props.reset,
      }),
    { initialProps: { rows, reset } },
  );
}

describe('columnLetter', () => {
  it('names columns the way a spreadsheet does', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(columnLetter(27)).toBe('AB');
  });
});

describe('useSheetSelection', () => {
  it('picks a row, and totals every number on it', () => {
    const { result } = setup();
    act(() => result.current.pickRow(0));

    expect(result.current.isRowPicked(0)).toBe(true);
    expect(result.current.isRowPicked(1)).toBe(false);
    // Three cells on the row; two of them hold numbers.
    expect(result.current.figures).toMatchObject({
      cells: 3,
      numbers: 2,
      sum: 110,
      average: 55,
    });
  });

  it('shift-clicking a second row takes the block between them', () => {
    const { result } = setup();
    act(() => result.current.pickRow(0));
    act(() => result.current.pickRow(2, true));

    expect(result.current.selection.rows).toEqual(new Set([0, 1, 2]));
    expect(result.current.figures?.sum).toBe(630); // 100+10 + 200+20 + 300
  });

  it('picks a column, and totals it down every row', () => {
    const { result } = setup();
    act(() => result.current.pickColumn('litres'));

    expect(result.current.isColumnPicked('litres')).toBe(true);
    expect(result.current.figures).toMatchObject({ cells: 3, numbers: 3, sum: 600 });
  });

  it('shift-clicking a second column takes the columns between them', () => {
    const { result } = setup();
    act(() => result.current.pickColumn('litres'));
    act(() => result.current.pickColumn('party', true));

    expect(result.current.selection.columns).toEqual(new Set(COLUMNS));
    // A blank freight is not counted as a zero.
    expect(result.current.figures).toMatchObject({ numbers: 5, sum: 630 });
  });

  it('clicking the one picked row again lets go of it', () => {
    const { result } = setup();
    act(() => result.current.pickRow(1));
    act(() => result.current.pickRow(1));

    expect(result.current.selection.kind).toBe('none');
    expect(result.current.figures).toBeNull();
  });

  it('the corner takes the whole sheet, and shades every cell', () => {
    const { result } = setup();
    act(() => result.current.pickAll());

    expect(result.current.isRowPicked(2)).toBe(true);
    expect(result.current.isColumnPicked('party')).toBe(true);
    expect(result.current.cellClass(2, 'party')).toContain('bg-primary');
    expect(result.current.figures).toMatchObject({ cells: 9, numbers: 5, sum: 630 });
  });

  it('lets go when the rows underneath become a different set', () => {
    const { result, rerender } = setup(ROWS, 'april');
    act(() => result.current.pickRow(0));
    expect(result.current.selection.kind).toBe('rows');

    rerender({ rows: ROWS.slice(0, 1), reset: 'may' });

    expect(result.current.selection.kind).toBe('none');
  });

  it('ignores a picked row that is no longer on the sheet', () => {
    const { result, rerender } = setup(ROWS, 'same');
    act(() => result.current.pickRow(0));
    act(() => result.current.pickRow(2, true));

    // Same window, fewer rows (a column filter narrowed it): the figures must
    // not read off the end of the array.
    rerender({ rows: ROWS.slice(0, 2), reset: 'same' });

    expect(result.current.figures?.sum).toBe(330);
  });
});
