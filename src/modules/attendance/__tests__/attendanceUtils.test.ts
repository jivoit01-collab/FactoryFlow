/**
 * Tests for the daily sheet's pure helpers.
 *
 * One rule carries almost all of the risk here: the status filter and the count
 * tiles must read the *same* side of the row. The page has two views of one
 * dataset — what the punch machine said, and what stands after corrections —
 * and if the filter followed one while the tiles followed the other, a day with
 * corrections would show a total above a table that did not contain that many
 * rows. Nobody looking at it could tell which number was wrong.
 */
import { describe, expect, it } from 'vitest';

import type { AttendanceSummary, DailyAttendanceRow } from '../api/attendance.api';
import { countsInView, rowMatches, statusInView, todayLocal } from '../utils';

type Row = Pick<
  DailyAttendanceRow,
  'employee_name' | 'employee_code' | 'machine_status' | 'effective_status'
>;

/** Somebody the machine saw once, corrected to Present by HR. */
const corrected: Row = {
  employee_name: 'Vishal Tyagi',
  employee_code: 'JWPL0593',
  machine_status: 'MISSING_PUNCH',
  effective_status: 'PRESENT',
};

/** Somebody nobody has touched. */
const untouched: Row = {
  employee_name: 'Ram Lal',
  employee_code: 'TP080',
  machine_status: 'ABSENT',
  effective_status: 'ABSENT',
};

const view = (over: Partial<Parameters<typeof rowMatches>[1]> = {}) => ({
  search: '',
  statusFilter: '' as const,
  showCorrections: false,
  ...over,
});

describe('statusInView', () => {
  it('reads the machine status while corrections are hidden', () => {
    expect(statusInView(corrected, false)).toBe('MISSING_PUNCH');
  });

  it('reads the effective status once corrections are shown', () => {
    expect(statusInView(corrected, true)).toBe('PRESENT');
  });

  it('is the same either way for a row nobody corrected', () => {
    expect(statusInView(untouched, false)).toBe('ABSENT');
    expect(statusInView(untouched, true)).toBe('ABSENT');
  });
});

describe('rowMatches — the filter follows the view', () => {
  it('matches the machine status in the default (machine-only) view', () => {
    expect(rowMatches(corrected, view({ statusFilter: 'MISSING_PUNCH' }))).toBe(true);
    expect(rowMatches(corrected, view({ statusFilter: 'PRESENT' }))).toBe(false);
  });

  it('matches the corrected status once corrections are shown', () => {
    const shown = view({ showCorrections: true });
    expect(rowMatches(corrected, { ...shown, statusFilter: 'PRESENT' })).toBe(true);
    expect(rowMatches(corrected, { ...shown, statusFilter: 'MISSING_PUNCH' })).toBe(false);
  });

  it('keeps everything when no status filter is set', () => {
    expect(rowMatches(corrected, view())).toBe(true);
    expect(rowMatches(untouched, view())).toBe(true);
  });

  it('searches the name and the JWPL code, case-insensitively', () => {
    expect(rowMatches(corrected, view({ search: 'vishal' }))).toBe(true);
    expect(rowMatches(corrected, view({ search: 'jwpl0593' }))).toBe(true);
    expect(rowMatches(corrected, view({ search: 'TP080' }))).toBe(false);
  });

  it('applies search and status together', () => {
    expect(
      rowMatches(corrected, view({ search: 'vishal', statusFilter: 'MISSING_PUNCH' })),
    ).toBe(true);
    expect(rowMatches(corrected, view({ search: 'ram', statusFilter: 'MISSING_PUNCH' }))).toBe(
      false,
    );
  });
});

describe('countsInView', () => {
  const summary: AttendanceSummary = {
    total: 2,
    overridden: 1,
    machine: { MISSING_PUNCH: 1, ABSENT: 1 },
    effective: { PRESENT: 1, ABSENT: 1 },
  };

  it('counts the machine readings by default, so the tiles match the table', () => {
    expect(countsInView(summary, false)).toEqual({ MISSING_PUNCH: 1, ABSENT: 1 });
  });

  it('counts what stands once corrections are shown', () => {
    expect(countsInView(summary, true)).toEqual({ PRESENT: 1, ABSENT: 1 });
  });

  it('survives the summary not having loaded yet', () => {
    expect(countsInView(undefined, false)).toEqual({});
  });

  it('agrees with rowMatches — the tile count equals the filtered row count', () => {
    const rows = [corrected, untouched];
    for (const showCorrections of [false, true]) {
      const counts = countsInView(summary, showCorrections);
      for (const status of Object.keys(counts) as (keyof typeof counts)[]) {
        const matched = rows.filter((row) =>
          rowMatches(row, view({ statusFilter: status, showCorrections })),
        );
        expect(matched.length).toBe(counts[status]);
      }
    }
  });
});

describe('todayLocal', () => {
  it('returns a YYYY-MM-DD date', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is the local date, not the UTC one', () => {
    // IST is UTC+5:30, so after 18:30 local the UTC date is already tomorrow.
    // Asking the machine's own date is the only answer that matches the sheet
    // the factory is looking at.
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    expect(todayLocal()).toBe(expected);
  });
});
