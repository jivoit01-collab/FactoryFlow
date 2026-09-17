import { describe, expect, it } from 'vitest';

import { describeRange, rangeFor } from './span';

const SEPT_12 = new Date('2026-09-12T09:30:00');

describe('rangeFor', () => {
  it('makes a single day of "today"', () => {
    expect(rangeFor('today', SEPT_12)).toEqual({ from: '2026-09-12', to: '2026-09-12' });
  });

  it('counts "7 days" inclusively at both ends', () => {
    // Today plus the six before it. An exclusive start would ask the server for
    // eight days and label them seven, and every per-day figure would be wrong.
    expect(rangeFor('week', SEPT_12)).toEqual({ from: '2026-09-06', to: '2026-09-12' });
  });

  it('runs the month from its first day to today, not to its end', () => {
    expect(rangeFor('month', SEPT_12)).toEqual({ from: '2026-09-01', to: '2026-09-12' });
  });

  it('falls back to the month for a span it does not recognise', () => {
    expect(rangeFor('quarter' as never, SEPT_12)).toEqual({
      from: '2026-09-01',
      to: '2026-09-12',
    });
  });
});

describe('describeRange', () => {
  it('names a single day without a day count', () => {
    expect(describeRange('2026-09-12', '2026-09-12', 1)).toBe('12 September 2026');
  });

  it('drops the repeated month inside one month', () => {
    expect(describeRange('2026-09-01', '2026-09-12', 12)).toBe(
      '1 – 12 September 2026 · 12 days',
    );
  });

  it('keeps both months when the span crosses one', () => {
    expect(describeRange('2026-08-30', '2026-09-05', 7)).toBe(
      '30 Aug 2026 – 5 September 2026 · 7 days',
    );
  });
});
