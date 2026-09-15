import { describe, expect, it } from 'vitest';

import {
  barPct,
  daysSince,
  fillCondition,
  money,
  moneyParts,
  NO_VALUE,
  num,
  pct,
  tons,
  trendHeights,
  whole,
} from './format';

describe('num', () => {
  it('rejects everything that is not a finite number', () => {
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(Number.NaN)).toBeNull();
    expect(num(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('keeps zero, which is a real figure', () => {
    expect(num(0)).toBe(0);
  });
});

describe('the no-source rule', () => {
  // The whole point of this module: null is "nobody rated this" and must never
  // be shown as zero, because an unrated warehouse and an empty one are
  // different answers and only one of them needs acting on.
  it('renders a rule for a missing figure, never a zero', () => {
    expect(tons(null)).toBe(NO_VALUE);
    expect(money(null)).toBe(NO_VALUE);
    expect(pct(null)).toBe(NO_VALUE);
    expect(whole(null)).toBe(NO_VALUE);
  });

  it('still renders a real zero as zero', () => {
    expect(tons(0)).toBe('0.0');
    expect(money(0)).toBe('₹0');
    expect(pct(0)).toBe('0.0%');
  });
});

describe('tons', () => {
  it('keeps one decimal where a tenth of a day matters', () => {
    expect(tons(444.47)).toBe('444.5');
  });

  it('drops the decimal above ten thousand, where nobody reads it', () => {
    expect(tons(12_345.6)).toBe('12,346');
  });
});

describe('money', () => {
  it('switches to lakhs and crores where an Indian reader already does', () => {
    expect(money(99_999)).toBe('₹99,999');
    expect(money(671_400)).toBe('₹6.71 L');
    expect(money(33_878_784)).toBe('₹3.39 Cr');
  });

  it('splits the figure from its unit for a tile headline', () => {
    expect(moneyParts(33_878_784)).toEqual({ value: '₹3.39', unit: 'Cr' });
    expect(moneyParts(null)).toEqual({ value: NO_VALUE, unit: '' });
  });
});

describe('barPct', () => {
  it('clamps an overrun to the track rather than overflowing it', () => {
    expect(barPct(118)).toBe(100);
    expect(barPct(-4)).toBe(0);
  });

  it('draws nothing for a figure that does not exist', () => {
    expect(barPct(null)).toBe(0);
  });
});

describe('fillCondition', () => {
  // Must agree with admin_board/alerts.py. A tile wearing the bad tint and an
  // action centre saying nothing is a board contradicting itself.
  it('matches the server thresholds at the boundaries', () => {
    expect(fillCondition(79.9)).toBe('ok');
    expect(fillCondition(80)).toBe('warn');
    expect(fillCondition(89.9)).toBe('warn');
    expect(fillCondition(90)).toBe('bad');
  });

  it('does not report a condition for a warehouse nobody rated', () => {
    expect(fillCondition(null)).toBe('ok');
  });
});

describe('daysSince', () => {
  it('counts whole days back from a given today', () => {
    expect(daysSince('2026-08-02', new Date('2026-09-15T10:00:00'))).toBe(44);
  });

  it('returns null rather than a number for an absent or broken date', () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince('not-a-date')).toBeNull();
  });
});

describe('trendHeights', () => {
  it('scales to the tallest day in the window', () => {
    expect(trendHeights([50, 100, 25])).toEqual([50, 100, 25]);
  });

  it('draws a day of nothing as nothing', () => {
    // A floor here would render a shut line as a small amount produced, which
    // is the opposite of what happened.
    expect(trendHeights([0, 80])).toEqual([0, 100]);
  });

  it('survives a window in which nothing was produced at all', () => {
    expect(trendHeights([0, 0, 0])).toEqual([0, 0, 0]);
  });
});
