/**
 * Tests for the monthly register's pure helpers.
 *
 * One rule carries the risk here, and it is not cosmetic: **a day nobody synced
 * must never read as an absence.** The API sends three different things — a
 * cell, an explicit `null`, and no key at all — and the grid draws three
 * different things. Collapse the first two and a fortnight when the LAN to the
 * punch box was down becomes three hundred people marked absent, on the sheet
 * payroll is run from.
 */
import { describe, expect, it } from 'vitest';

import { cellKind, cellLetter, monthLabel } from '../utils';

describe('cellKind', () => {
  const days = { '1': { id: 1, m: 'PRESENT' }, '2': null };

  it('reads a present cell as synced', () => {
    expect(cellKind(days, 1)).toBe('synced');
  });

  it('reads an explicit null as not synced, which is not an absence', () => {
    expect(cellKind(days, 2)).toBe('missing');
  });

  it('reads a missing key as outside the employment window', () => {
    expect(cellKind(days, 3)).toBe('outside');
  });

  it('never confuses the two empty states with each other', () => {
    expect(cellKind(days, 2)).not.toBe(cellKind(days, 3));
  });
});

describe('cellLetter', () => {
  it('gives each status its own letter', () => {
    expect(cellLetter('PRESENT')).toBe('P');
    expect(cellLetter('ABSENT')).toBe('A');
    expect(cellLetter('HALF_DAY')).toBe('H');
    expect(cellLetter('MISSING_PUNCH')).toBe('M');
    expect(cellLetter('WEEKLY_OFF')).toBe('W');
    expect(cellLetter('ON_LEAVE')).toBe('L');
  });

  it('never maps two statuses to one letter', () => {
    const statuses = [
      'PRESENT', 'ABSENT', 'HALF_DAY', 'MISSING_PUNCH',
      'WEEKLY_OFF', 'ON_LEAVE', 'ON_DUTY', 'HOLIDAY',
    ];
    const letters = statuses.map(cellLetter);
    expect(new Set(letters).size).toBe(statuses.length);
  });

  it('falls back to an initial for a status the backend adds later', () => {
    // Better a stray letter than silently drawing it as something it is not.
    expect(cellLetter('SABBATICAL')).toBe('S');
  });
});

describe('monthLabel', () => {
  it('names the month', () => {
    expect(monthLabel('2026-09')).toContain('2026');
    expect(monthLabel('2026-09')).toMatch(/Sep/i);
  });

  it('passes junk through rather than inventing a date', () => {
    expect(monthLabel('nonsense')).toBe('nonsense');
  });
});
