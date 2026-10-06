import { describe, expect, it } from 'vitest';

import { debtAge, longDate, managerList, quantity, shareOf } from './amounts';

describe('shareOf', () => {
  it('is a percentage of the whole', () => {
    expect(shareOf(25, 200)).toBe(12.5);
  });

  it('has no share without a positive whole', () => {
    expect(shareOf(25, 0)).toBeNull();
    expect(shareOf(25, -10)).toBeNull();
    expect(shareOf(null, 100)).toBeNull();
  });
});

describe('debtAge', () => {
  const today = new Date('2026-10-06T10:00:00');

  it('counts the days and colours by age', () => {
    expect(debtAge('2026-09-06', today)).toEqual({ days: 30, label: '30 days', tone: 'ok' });
    expect(debtAge('2026-03-01', today)?.tone).toBe('warn');
    expect(debtAge('2024-09-30', today)).toEqual({ days: 736, label: '736 days', tone: 'bad' });
  });

  it('has no age without a date', () => {
    expect(debtAge(null, today)).toBeNull();
    expect(debtAge('not a date', today)).toBeNull();
  });
});

describe('longDate', () => {
  it('reads as a date, not an ISO string', () => {
    expect(longDate('2024-09-30')).toBe('30 Sept 2024');
  });

  it('draws a rule for no date', () => {
    expect(longDate(null)).toBe('—');
  });
});

describe('managerList', () => {
  it('names two and counts the rest', () => {
    expect(managerList(['A', 'B', 'C', 'D'])).toBe('A, B +2');
    expect(managerList(['A'])).toBe('A');
    expect(managerList([])).toBe('none assigned');
  });
});

describe('quantity', () => {
  it('keeps the decimals only where they matter', () => {
    expect(quantity(120000)).toBe('1,20,000');
    expect(quantity(0.4)).toBe('0.4');
    expect(quantity(2.456)).toBe('2.46');
    expect(quantity(null)).toBe('—');
  });
});
