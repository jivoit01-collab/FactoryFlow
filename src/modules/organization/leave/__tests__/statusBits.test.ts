import { describe, expect, it } from 'vitest';

import {
  authorityLabel,
  formatDate,
  formatRange,
  portionLabel,
  STATUS_STYLES,
  statusLabel,
  todayLocal,
} from '../components/statusBits';

describe('leave status presentation', () => {
  it('has a style for every request status', () => {
    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'] as const) {
      expect(STATUS_STYLES[status]).toBeTruthy();
      expect(statusLabel(status)).toBeTruthy();
    }
  });

  it('spells out the authority rather than showing the raw code', () => {
    expect(authorityLabel('manager')).toBe('You are their manager');
    expect(authorityLabel('skip_level')).toBe('You are above their manager');
    expect(authorityLabel('hr')).toBe('You are deciding as HR');
    // No entitlement at all must render as nothing, not as "undefined".
    expect(authorityLabel('')).toBe('');
  });

  it('labels the day portions', () => {
    expect(portionLabel('FULL')).toBe('Full day');
    expect(portionLabel('FIRST_HALF')).toBe('First half');
    expect(portionLabel('SECOND_HALF')).toBe('Second half');
  });
});

describe('date helpers', () => {
  it('formats an ISO date without a timezone shift', () => {
    expect(formatDate('2026-09-17')).toBe('17 Sep 2026');
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('rubbish')).toBe('rubbish');
  });

  it('collapses a single-day range', () => {
    expect(formatRange('2026-09-17', '2026-09-17')).toBe('17 Sep 2026');
  });

  it('shows both ends of a span', () => {
    expect(formatRange('2026-09-17', '2026-09-19')).toBe('17 Sep 2026 – 19 Sep 2026');
  });

  it('todayLocal uses the local date, never a UTC shift', () => {
    const value = todayLocal();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const now = new Date();
    const expected = [
      now.getFullYear(),
      `${now.getMonth() + 1}`.padStart(2, '0'),
      `${now.getDate()}`.padStart(2, '0'),
    ].join('-');
    expect(value).toBe(expected);
  });
});
