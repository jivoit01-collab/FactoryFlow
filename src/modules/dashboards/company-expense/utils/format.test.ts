import { describe, expect, it } from 'vitest';

import { amount, companyLabel, money, share, whole } from './format';

describe('money', () => {
  it('compacts into the units the board is read in', () => {
    expect(money(2_53_67_380)).toBe('₹2.54 Cr');
    expect(money(13_64_524)).toBe('₹13.65 L');
    expect(money(69_000)).toBe('₹69.0k');
    expect(money(940)).toBe('₹940');
  });

  it('groups the rupee case the Indian way', () => {
    expect(money(999)).toBe('₹999');
  });

  it('keeps the sign on a credit', () => {
    // A credit cost type (scrap recovery and its kin) is negative money, and a
    // board that dropped the minus would read as spend.
    expect(money(-13_64_524)).toBe('₹-13.65 L');
  });

  it('does not dress up a non-number as zero', () => {
    expect(money(Number.NaN)).toBe('—');
  });
});

describe('whole', () => {
  it('groups and rounds', () => {
    expect(whole(1308)).toBe('1,308');
    expect(whole(194_949.4)).toBe('1,94,949');
  });
});

describe('amount', () => {
  it('parses the decimal strings DRF sends', () => {
    expect(amount('1364524.00')).toBe(1364524);
  });

  it('reads an absent figure as zero rather than NaN', () => {
    expect(amount(null)).toBe(0);
    expect(amount(undefined)).toBe(0);
    expect(amount('')).toBe(0);
  });
});

describe('share', () => {
  it('measures a square against its own column', () => {
    expect(share(13_64_524, 19_86_738)).toBeCloseTo(68.68, 1);
  });

  it('is zero on an empty column rather than NaN', () => {
    // The normal state of the maintenance column, not an edge case: a bar
    // drawn at NaN% silently collapses to the full width in some browsers.
    expect(share(0, 0)).toBe(0);
  });

  it('never draws wider than its track', () => {
    expect(share(200, 100)).toBe(100);
    expect(share(-50, 100)).toBe(0);
  });
});

describe('companyLabel', () => {
  it('drops the prefix every row shares', () => {
    expect(companyLabel('Jivo Oil')).toBe('Oil');
    expect(companyLabel('Jivo Beverages')).toBe('Beverages');
  });

  it('leaves a name that is only the prefix alone', () => {
    expect(companyLabel('Jivo')).toBe('Jivo');
  });
});
