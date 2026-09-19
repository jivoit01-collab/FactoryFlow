import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLocalColumns } from '../useLocalColumns';

/**
 * A card statement in miniature: one amount, shown under Paid on or Drawn off
 * depending on which way the money went, and a running balance beside them.
 */
type Movement = { kind: 'RECEIPT' | 'WITHDRAWAL'; amount: number; balance: number };

const MOVEMENTS: Movement[] = [
  { kind: 'RECEIPT', amount: 100, balance: 100 },
  { kind: 'WITHDRAWAL', amount: 30, balance: 70 },
  { kind: 'RECEIPT', amount: 50, balance: 120 },
  { kind: 'WITHDRAWAL', amount: 20, balance: 100 },
];

function grid(rows: Movement[] = MOVEMENTS) {
  return renderHook(() =>
    useLocalColumns(
      rows,
      {
        kind: { value: (row) => row.kind },
        paidOn: {
          value: (row) => String(row.amount),
          blankWhen: (row) => row.kind !== 'RECEIPT',
          total: (row) => row.amount,
        },
        drawnOff: {
          value: (row) => String(row.amount),
          blankWhen: (row) => row.kind === 'RECEIPT',
          total: (row) => row.amount,
        },
        // A running figure. Declares no total on purpose.
        balance: { value: (row) => String(row.balance) },
      },
      { key: 'kind', direction: 'asc' },
    ),
  );
}

describe('useLocalColumns totals', () => {
  it('adds up a column', () => {
    const { result } = grid();
    expect(result.current.totals.paidOn).toBe(150);
  });

  it('leaves out the rows a column shows nothing in', () => {
    // The whole point: a receipt's Drawn off cell is empty, so its 100 must
    // not land in the Drawn off total. Summing the field rather than the
    // column would give 200 here.
    const { result } = grid();
    expect(result.current.totals.drawnOff).toBe(50);
  });

  it('gives no total to a column that did not ask for one', () => {
    // Balance is a running figure; its sum is a number the card never held.
    const { result } = grid();
    expect(result.current.totals.balance).toBeUndefined();
  });

  it('follows the filters', () => {
    const { result } = grid();
    act(() => result.current.column('kind', 'Movement').onSelect(['RECEIPT']));
    expect(result.current.totals.paidOn).toBe(150);
    expect(result.current.totals.drawnOff).toBe(0);
  });

  it('is zero when everything is filtered away', () => {
    const { result } = grid();
    act(() => result.current.column('kind', 'Movement').onSelect(['NOTHING']));
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.totals.paidOn).toBe(0);
  });

  it('copes with an empty table', () => {
    const { result } = grid([]);
    expect(result.current.totals.paidOn).toBe(0);
  });

  it('ignores a figure that is not one', () => {
    const rows = [
      { kind: 'RECEIPT' as const, amount: Number.NaN, balance: 0 },
      { kind: 'RECEIPT' as const, amount: 40, balance: 40 },
    ];
    const { result } = grid(rows);
    expect(result.current.totals.paidOn).toBe(40);
  });
});
