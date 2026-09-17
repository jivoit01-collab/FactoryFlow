import { describe, expect, it } from 'vitest';

import { compactQty, dayLabel, sellableSplit, trendLabel, windowDates } from '../format';

describe('windowDates', () => {
  it('counts the window inclusive of today', () => {
    // 7 days ending Wed 10 Sep starts on Thu 4 Sep, not 3 Sep.
    expect(windowDates(7, new Date(2026, 8, 10))).toEqual({
      from: '2026-09-04',
      to: '2026-09-10',
    });
  });

  it('crosses a month and a year boundary', () => {
    expect(windowDates(30, new Date(2026, 0, 5))).toEqual({
      from: '2025-12-07',
      to: '2026-01-05',
    });
  });

  it('builds the dates from local parts, not an ISO string', () => {
    // `toISOString` on a local midnight east of Greenwich prints the previous
    // day, which would quietly shift every window by one.
    const { to } = windowDates(1, new Date(2026, 5, 1, 0, 30));
    expect(to).toBe('2026-06-01');
  });
});

describe('trendLabel', () => {
  it('reads a daily bucket in local terms', () => {
    expect(trendLabel('2026-03-09', 'day')).toBe('9 Mar');
  });

  it('reads a monthly bucket', () => {
    expect(trendLabel('2026-03', 'month')).toBe('Mar 26');
  });
});

describe('dayLabel', () => {
  it('renders a date the API sent with a time on it', () => {
    expect(dayLabel('2026-03-09T18:30:00Z')).toBe('9 Mar 2026');
  });

  it('renders an em dash rather than "Invalid Date" for a missing date', () => {
    expect(dayLabel(null)).toBe('—');
    expect(dayLabel('')).toBe('—');
  });
});

describe('compactQty', () => {
  it('leaves a readable number alone and abbreviates a large one', () => {
    expect(compactQty(940)).toBe('940');
    expect(compactQty(12_500)).toBe('12.5K');
    expect(compactQty(250_000)).toBe('2.50 L');
  });

  it('keeps one decimal on a fractional quantity rather than rounding it away', () => {
    expect(compactQty(12.5)).toBe('12.5');
  });
});

describe('sellableSplit', () => {
  const point = { bucket: '2026-03-09', returns: 2, quantity: 100, damaged_quantity: 30 };

  it('takes the still-good part as the remainder', () => {
    expect(sellableSplit([point])[0].good_quantity).toBe(70);
  });

  it('flattens rather than inverts if damaged ever exceeds the total', () => {
    const broken = { ...point, quantity: 10, damaged_quantity: 40 };
    expect(sellableSplit([broken])[0].good_quantity).toBe(0);
  });
});
