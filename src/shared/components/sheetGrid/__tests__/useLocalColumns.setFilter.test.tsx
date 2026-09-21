import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BLANK, useLocalColumns } from '../useLocalColumns';

/**
 * Driving a column's filter from outside its header.
 *
 * The approvals screen shows a tile per approver above the table, and clicking
 * one means the same thing as ticking that name in the With filter. Both go
 * through the same state, so the header's tick and the tile agree.
 */
type Payment = { with: string | null; amount: number };

const PAYMENTS: Payment[] = [
  { with: 'Shunty VG', amount: 500 },
  { with: 'Shunty VG', amount: 1500 },
  { with: 'Arvinder Singh', amount: 300 },
  // Off the sheet, addressed to nobody.
  { with: null, amount: 750 },
];

function grid() {
  return renderHook(() =>
    useLocalColumns(
      PAYMENTS,
      {
        with: { value: (row) => row.with },
        amount: { value: (row) => String(row.amount), total: (row) => row.amount },
      },
      { key: 'with', direction: 'asc' },
    ),
  );
}

describe('useLocalColumns setFilter', () => {
  it('narrows the rows the way ticking the header would', () => {
    const { result } = grid();
    act(() => result.current.setFilter('with', ['Shunty VG']));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.totals.amount).toBe(2000);
  });

  it('shows in the header, so the tick and the tile agree', () => {
    const { result } = grid();
    act(() => result.current.setFilter('with', ['Arvinder Singh']));

    expect(result.current.column('with', 'With').selected).toEqual(['Arvinder Singh']);
    expect(result.current.filters.with).toEqual(['Arvinder Singh']);
    expect(result.current.filteredColumns).toEqual(['with']);
  });

  it('can pick out the rows addressed to nobody', () => {
    // They read blank in the column, so BLANK is what selects them -- the
    // point being that "nobody has been asked yet" is a group worth seeing.
    const { result } = grid();
    act(() => result.current.setFilter('with', [BLANK]));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.totals.amount).toBe(750);
  });

  it('puts the whole queue back when the filter is emptied', () => {
    const { result } = grid();
    act(() => result.current.setFilter('with', ['Shunty VG']));
    act(() => result.current.setFilter('with', []));

    expect(result.current.rows).toHaveLength(4);
    expect(result.current.filteredColumns).toEqual([]);
  });
});
