/**
 * Calendar months for the dashboards, in local time throughout.
 *
 * A month is carried as its `YYYY-MM` key, never as a `Date`: a key cannot
 * drift across a time zone, and every endpoint these boards read takes plain
 * `YYYY-MM-DD` dates. Local time on purpose — the boards that used
 * `toISOString()` or a `Date`'s UTC parts read the previous month until 05:30
 * on the 1st, which in IST is exactly the morning somebody asks for last
 * month's figures.
 */

/** A month key: `YYYY-MM`. */
export type MonthKey = string;

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local `YYYY-MM-DD` of a date. */
export function localISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The month a local date falls in. */
export function monthOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** True for a well-formed `YYYY-MM`. */
export function isMonthKey(raw: string | null | undefined): raw is MonthKey {
  return Boolean(raw && MONTH_KEY.test(raw));
}

function parts(month: MonthKey): { year: number; month: number } {
  const [year, value] = month.split('-').map(Number);
  return { year, month: value };
}

/** The month `by` months away: -1 is the one before. */
export function shiftMonth(month: MonthKey, by: number): MonthKey {
  const { year, month: value } = parts(month);
  const index = year * 12 + (value - 1) + by;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Days in a month. */
export function daysInMonth(month: MonthKey): number {
  const { year, month: value } = parts(month);
  // Day 0 of the next month is the last day of this one.
  return new Date(year, value, 0).getDate();
}

/** `2026-09-01`. */
export function monthFirstDay(month: MonthKey): string {
  return `${month}-01`;
}

/** `2026-09-30`. */
export function monthLastDay(month: MonthKey): string {
  return `${month}-${pad(daysInMonth(month))}`;
}

/** "September 2026". */
export function monthLabel(month: MonthKey): string {
  const { year, month: value } = parts(month);
  return new Date(year, value - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/** "Sep". */
export function monthShortLabel(month: MonthKey): string {
  const { year, month: value } = parts(month);
  return new Date(year, value - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

/** The dates a month is read over, as of `today`. */
export interface MonthWindow {
  month: MonthKey;
  /** First day of the month. */
  from: string;
  /**
   * The last day the month's figures run to: today for the current month, the
   * month's own last day for one that has ended.
   */
  to: string;
  /** The month `today` is in. */
  isCurrent: boolean;
  daysInMonth: number;
  /** Days of the month inside the window — all of them for an ended month. */
  daysElapsed: number;
}

/**
 * The window a month is read over.
 *
 * An ended month runs to its last day, so a board showing September on the
 * 1st of October shows all thirty days rather than September up to a date that
 * is not in it. A month that has not started is not a window at all; callers
 * are expected to have refused it, and it is clamped to the current one here.
 */
export function monthWindow(month: MonthKey, today: string): MonthWindow {
  const current = today.slice(0, 7);
  const shown = month > current ? current : month;
  const isCurrent = shown === current;
  const days = daysInMonth(shown);
  return {
    month: shown,
    from: monthFirstDay(shown),
    to: isCurrent ? today : monthLastDay(shown),
    isCurrent,
    daysInMonth: days,
    daysElapsed: isCurrent ? Number(today.slice(8, 10)) : days,
  };
}
