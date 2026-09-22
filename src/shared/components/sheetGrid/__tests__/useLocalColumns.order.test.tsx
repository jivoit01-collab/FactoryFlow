import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLocalColumns } from '../useLocalColumns';

/**
 * A card statement whose Date cell reads dd-mm-yyyy, as every date in this app
 * now does.
 *
 * That text sorts by its DAY, so the register once opened on 01-08 → 01-09 →
 * 02-07 → 03-07 → 04-06 and the custodian could not read a running balance
 * down the page. `sortValue` carries the ISO the server sent, and BOTH the
 * rows and the column's filter list are ordered by it.
 */
type Movement = { date: string; amount: number };

/** Deliberately out of order, and deliberately day-ambiguous. */
const MOVEMENTS: Movement[] = [
  { date: '2026-06-04', amount: 100_000 },
  { date: '2026-09-01', amount: 1_406 },
  { date: '2026-07-02', amount: 100_000 },
  { date: '2026-08-01', amount: 70_000 },
];

const ddmmyyyy = (iso: string) => iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4);

function grid(spec: { sorted: boolean }) {
  return renderHook(() =>
    useLocalColumns(
      MOVEMENTS,
      {
        date: {
          value: (row) => ddmmyyyy(row.date),
          sortValue: spec.sorted ? (row) => row.date : undefined,
        },
        amount: { value: (row) => row.amount.toLocaleString('en-IN') },
      },
      { key: 'date', direction: 'asc' },
    ),
  );
}

describe('useLocalColumns ordering', () => {
  it('sorts the rows by the ISO behind the cell, not by the dd-mm-yyyy in it', () => {
    const { result } = grid({ sorted: true });
    expect(result.current.rows.map((row) => row.date)).toEqual([
      '2026-06-04',
      '2026-07-02',
      '2026-08-01',
      '2026-09-01',
    ]);
  });

  it('shows the day-first order this guards against, when nothing declares one', () => {
    // Not an endorsement — it pins the bug, so a future edit that drops the
    // `sortValue` from a date column fails the test above rather than shipping.
    const { result } = grid({ sorted: false });
    expect(result.current.rows.map((row) => row.date)).toEqual([
      '2026-08-01', // 01-08
      '2026-09-01', // 01-09
      '2026-07-02', // 02-07
      '2026-06-04', // 04-06
    ]);
  });

  it('lists the filter values in that same order', () => {
    // The drop-down must not disagree with the rows behind it.
    const { result } = grid({ sorted: true });
    expect(result.current.column('date', 'Date').values.map((v) => v.value)).toEqual([
      '04-06-2026',
      '02-07-2026',
      '01-08-2026',
      '01-09-2026',
    ]);
  });

  it('leaves a column with no sortValue on its text order, untouched', () => {
    // And that order is wrong, which is the point: lakh-grouped text collates
    // 1,00,000 first because it reads the leading "1". Every real amount
    // column declares a `sortValue` for this reason, and now gets the benefit
    // in its filter list as well as in its rows.
    const { result } = grid({ sorted: true });
    expect(result.current.column('amount', 'Amount').values.map((v) => v.value)).toEqual([
      '1,00,000',
      '1,406',
      '70,000',
    ]);
  });
});
