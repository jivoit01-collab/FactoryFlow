import { describe, expect, it } from 'vitest';

import type { FunnelBill } from '../types';
import {
  ageInDays,
  bandCounts,
  buildFunnelColumn,
  buildFunnelColumnFromBuckets,
} from './funnel';

const BANDS = [15, 30, 45];

function bills(...ages: (number | null)[]): FunnelBill[] {
  return ages.map((ageDays, index) => ({ id: `B${index}`, ageDays }));
}

describe('bandCounts', () => {
  it('counts each bill into every band it clears', () => {
    const { cells } = bandCounts(bills(50), BANDS);

    // One bill, 50 days old, appears in all three bands. Matched loosely: the
    // cells carry money too, and this test is about the counting.
    expect(cells).toMatchObject([
      { band: 15, count: 1 },
      { band: 30, count: 1 },
      { band: 45, count: 1 },
    ]);
  });

  it('includes a bill sitting exactly on a band edge', () => {
    const { cells } = bandCounts(bills(30), BANDS);

    expect(cells).toMatchObject([
      { band: 15, count: 1 },
      { band: 30, count: 1 },
      { band: 45, count: 0 },
    ]);
  });

  it('excludes a bill younger than every band', () => {
    const { cells } = bandCounts(bills(3), BANDS);

    expect(cells.every((cell) => cell.count === 0)).toBe(true);
  });

  it('never lets a count fall as a bill ages', () => {
    // The property exclusive buckets break: ageing 29 → 31 must not reduce any
    // cell, because a wall reading a smaller number infers improvement.
    const before = bandCounts(bills(29), BANDS).cells;
    const after = bandCounts(bills(31), BANDS).cells;

    after.forEach((cell, index) => {
      expect(cell.count).toBeGreaterThanOrEqual(before[index].count);
    });
  });

  it('reports undated bills separately instead of aging them to zero', () => {
    const { cells, undated } = bandCounts(bills(60, null, null), BANDS);

    expect(undated).toBe(2);
    expect(cells[0].count).toBe(1);
  });

  it('treats a non-finite age as undated', () => {
    const { undated } = bandCounts([{ id: 'B', ageDays: Number.NaN }], BANDS);

    expect(undated).toBe(1);
  });
});

describe('buildFunnelColumn', () => {
  it('summarises a stage that has a feed', () => {
    const column = buildFunnelColumn('GRPO', bills(50, 20, 2, null), BANDS);

    expect(column.total).toBe(4);
    expect(column.undated).toBe(1);
    expect(column.cells[0].count).toBe(2);
    expect(column.unavailable).toBeUndefined();
  });

  it('states why a stage is blank rather than showing zero outstanding', () => {
    const column = buildFunnelColumn('PAYMENT', null, BANDS, 'Awaiting payment config');

    expect(column.unavailable).toBe('Awaiting payment config');
    expect(column.cells.map((cell) => cell.count)).toEqual([0, 0, 0]);
  });

  it('does not let real bills mask an unavailable stage', () => {
    const column = buildFunnelColumn('PAYMENT', bills(90), BANDS, 'Awaiting payment config');

    expect(column.unavailable).toBe('Awaiting payment config');
    expect(column.total).toBe(0);
  });
});

describe('ageInDays', () => {
  const asOf = new Date(2026, 8, 10, 9, 0, 0); // 10 Sep 2026, 09:00 local

  it('counts whole calendar days, not elapsed hours', () => {
    // Posted late the previous evening: one day old this morning, not zero.
    expect(ageInDays('2026-09-09T22:30:00', asOf)).toBe(1);
  });

  it('answers zero on the same day', () => {
    expect(ageInDays('2026-09-10T01:00:00', asOf)).toBe(0);
  });

  it('handles a plain date string', () => {
    expect(ageInDays('2026-08-11', asOf)).toBe(30);
  });

  it('returns null for a missing or unparseable stamp', () => {
    expect(ageInDays(null, asOf)).toBeNull();
    expect(ageInDays(undefined, asOf)).toBeNull();
    expect(ageInDays('', asOf)).toBeNull();
    expect(ageInDays('not a date', asOf)).toBeNull();
  });
});

describe('funnel amounts', () => {
  it('adds the money in every band a document clears', () => {
    const { cells } = bandCounts(
      [
        { id: 'a', ageDays: 50, amount: 10_000 },
        { id: 'b', ageDays: 20, amount: 4_000 },
      ],
      BANDS,
    );

    // Cumulative floors: the 50-day bill is in all three bands, the 20-day one
    // only in the first.
    expect(cells[0]).toMatchObject({ band: 15, count: 2, amount: 14_000 });
    expect(cells[1]).toMatchObject({ band: 30, count: 1, amount: 10_000 });
    expect(cells[2]).toMatchObject({ band: 45, count: 1, amount: 10_000 });
  });

  it('counts a document nobody has priced without inventing a value for it', () => {
    // A bilty queued before anybody typed a freight figure is still outstanding
    // — dropping it would understate the queue as well as the money.
    const { cells, unpriced } = bandCounts(
      [
        { id: 'a', ageDays: 50, amount: 10_000 },
        { id: 'b', ageDays: 50, amount: null },
      ],
      BANDS,
    );

    expect(cells[2]).toMatchObject({ count: 2, amount: 10_000, unpriced: 1 });
    expect(unpriced).toBe(1);
  });

  it('keeps an undatable document in the column total but out of every band', () => {
    const column = buildFunnelColumn(
      'GRPO',
      [
        { id: 'a', ageDays: null, amount: 5_000 },
        { id: 'b', ageDays: 60, amount: 1_000 },
      ],
      BANDS,
    );

    expect(column.total).toBe(2);
    expect(column.undated).toBe(1);
    // The money is owed whether or not the document can be aged.
    expect(column.amount).toBe(6_000);
    expect(column.cells[0].amount).toBe(1_000);
  });

  it('leaves a column with no feed at zero and says why', () => {
    const column = buildFunnelColumn('PAYMENT', null, BANDS, 'No source');

    expect(column.unavailable).toBe('No source');
    expect(column.amount).toBe(0);
    expect(column.cells.every((cell) => cell.amount === 0)).toBe(true);
  });
});

describe('buildFunnelColumnFromBuckets', () => {
  const buckets = [
    { band: 0, documents: 9, amount: 168_006 },
    { band: 15, documents: 4, amount: 134_981 },
    { band: 30, documents: 3, amount: 190_632 },
    { band: 45, documents: 148, amount: 4_393_297 },
  ];

  it('gives each band its own window, so no document is counted twice', () => {
    const column = buildFunnelColumnFromBuckets('PAYMENT', buckets, BANDS);

    // 15-29, 30-44, 45+ — each bucket lands in exactly one row.
    expect(column.cells[0]).toMatchObject({ band: 15, count: 4, amount: 134_981 });
    expect(column.cells[1]).toMatchObject({ band: 30, count: 3, amount: 190_632 });
    expect(column.cells[2]).toMatchObject({ band: 45, count: 148, amount: 4_393_297 });
  });

  it('adds the rows back up to everything old enough to age', () => {
    const column = buildFunnelColumnFromBuckets('PAYMENT', buckets, BANDS);

    const rows = column.cells.reduce((total, cell) => total + cell.count, 0);
    // The 9 documents below the first band are in the column total and in no
    // row — the headline counts everything, the table ages what can be aged.
    expect(rows).toBe(155);
    expect(column.total).toBe(164);
  });

  it('totals every bucket including the ones below the first band', () => {
    const column = buildFunnelColumnFromBuckets('PAYMENT', buckets, BANDS);

    // 9 fresh invoices are in the total and in no band — same rule the counted
    // columns follow for an undatable document.
    expect(column.total).toBe(164);
    expect(column.amount).toBe(4_886_916);
  });

  it('reports an unreadable feed as unavailable rather than as nothing owed', () => {
    const column = buildFunnelColumnFromBuckets('PAYMENT', null, BANDS, 'SAP unavailable');

    expect(column.unavailable).toBe('SAP unavailable');
    expect(column.total).toBe(0);
  });

  it('carries each bucket’s unpriced documents into its cell', () => {
    // The GRPO queue's shape: freight is typed on the post form afterwards, so
    // a band of fresh bilties has the documents and none of the money. Dropping
    // this made the wall show "170" over "₹0" — a cell that reads as settled
    // when nothing about it has been priced yet.
    const column = buildFunnelColumnFromBuckets(
      'GRPO',
      [
        { band: 0, documents: 170, amount: 0, unpriced: 170 },
        { band: 15, documents: 102, amount: 0, unpriced: 102 },
        { band: 45, documents: 319, amount: 910_000, unpriced: 40 },
      ],
      BANDS,
    );

    expect(column.cells[0]).toMatchObject({ band: 15, count: 102, unpriced: 102 });
    expect(column.cells[2]).toMatchObject({ band: 45, count: 319, unpriced: 40 });
    // Including the fresh bucket, which no rendered row owns.
    expect(column.unpriced).toBe(312);
  });

  it('reports no unpriced documents for a feed that does not count them', () => {
    // The SAP columns are built from invoices, where the amount IS the
    // document — absent means none, not unknown.
    const column = buildFunnelColumnFromBuckets('PAYMENT', buckets, BANDS);

    expect(column.unpriced).toBe(0);
    expect(column.cells.every((cell) => cell.unpriced === 0)).toBe(true);
  });
});
