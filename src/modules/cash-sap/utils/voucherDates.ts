/**
 * The voucher's dates: what is refused, and what is only worth a second look.
 *
 * A line-for-line mirror of `factory_app/cash_sap/voucher_dates.py` -- the same
 * codes, conditions and messages -- so the dialog can warn while the user
 * types, before the server is asked. The server stays the judge: the plan
 * carries its own `warnings`, and a future date is refused there too.
 *
 * Dates are ISO `YYYY-MM-DD` strings throughout, read and compared as plain
 * calendar days (no time of day, no time zone), which is what Python's `date`
 * is.
 *
 * TODAY IS THE LOCAL DAY. `today()` is built from the browser's own year,
 * month and date. The first ten characters of `new Date()`'s ISO string are
 * the UTC date, which in India is still yesterday until 05:30 -- the cash book's dialogs
 * carry that bug (CashEntryDialog.tsx:59, AdvancesPage.tsx:45, AtmPage.tsx:40;
 * not fixed on this branch, which may not edit them). The backend's `today` is
 * `timezone.localdate()`, Asia/Kolkata.
 *
 * REFUSED (`checkVoucherDates`)
 *   A voucher or bill dated in the future.
 *
 * WARNED (`voucherDateWarnings`), each `{code, field, message}`
 *   DATE_OLD          more than 45 days ago (only with `includeAge`)
 *   BILL_AFTER_ENTRY  the bill is dated after the voucher
 *   BILL_OTHER_MONTH  the bill and the voucher are in different months
 *   LOOKS_SWAPPED     day and month look transposed
 */
import type { DateWarning } from '../types';

/** `constants.VOUCHER_AGE_WARNING_DAYS`. */
export const VOUCHER_AGE_WARNING_DAYS = 45;

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface Day {
  year: number;
  month: number; // 1-12
  day: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the browser's own time zone, as `YYYY-MM-DD`. Never the UTC date. */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Parse `YYYY-MM-DD` (anything after the date is ignored); null when it is not a real date. */
export function parseDay(value: string | null | undefined): Day | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidDay(year, month, day)) return null;
  return { year, month, day };
}

function isValidDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  // Date.UTC rolls an impossible day over into the next month; a real one stays put.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** Whole days since 1970-01-01 -- what Python's `(a - b).days` subtracts. */
function ordinal(d: Day): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

function fromOrdinal(n: number): Day {
  const date = new Date(n * 86_400_000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function iso(d: Day): string {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

/** `03 Sep 2026` -- `voucher_dates.fmt`, independent of the browser's locale. */
export function fmt(value: string | Day): string {
  const d = typeof value === 'string' ? parseDay(value) : value;
  if (!d) return typeof value === 'string' ? value : '';
  return `${pad(d.day)} ${MONTHS[d.month - 1]} ${d.year}`;
}

/** `Tue 7 Oct 2026`, from the date's own parts (never shifted by a time zone). */
export function humanDate(value: string | null | undefined): string {
  const d = parseDay(value);
  if (!d) return '';
  const weekday = WEEKDAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()];
  return `${weekday} ${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
}

/** Is `value` after today? Blank is not. */
export function isFutureDate(value: string | null | undefined, now: string = today()): boolean {
  const d = parseDay(value);
  const t = parseDay(now);
  if (!d || !t) return false;
  return ordinal(d) > ordinal(t);
}

/**
 * `check_voucher_dates`: the refusals, keyed by the field they belong to.
 * `{}` when both dates are acceptable.
 */
export function checkVoucherDates(
  entryDate: string | null | undefined,
  billDate?: string | null,
  now: string = today(),
): { entry_date?: string; bill_date?: string } {
  if (entryDate && isFutureDate(entryDate, now)) {
    return { entry_date: 'The voucher date cannot be in the future.' };
  }
  if (billDate && isFutureDate(billDate, now)) {
    return { bill_date: 'The bill date cannot be in the future.' };
  }
  return {};
}

/** `_swapped`: the date with day and month exchanged, when that is a different real date. */
function swapped(d: Day): Day | null {
  if (d.day > 12 || d.day === d.month) return null;
  if (!isValidDay(d.year, d.day, d.month)) return null;
  return { year: d.year, month: d.day, day: d.month };
}

/** `_looks_swapped`: the transposed date when it is a far likelier reading than `d`. */
function looksSwapped(d: Day, now: Day): Day | null {
  const other = swapped(d);
  if (other === null) return null;
  const floor = ordinal(now) - VOUCHER_AGE_WARNING_DAYS;
  if (!(floor <= ordinal(other) && ordinal(other) <= ordinal(now))) return null;
  const far = ordinal(now) - ordinal(d) > VOUCHER_AGE_WARNING_DAYS;
  const otherMonth = d.year !== now.year || d.month !== now.month;
  return far || otherMonth ? other : null;
}

export interface VoucherDateWarningOptions {
  /** Defaults to the local `today()`. */
  today?: string;
  /** `DATE_OLD` on or off. The bunch plan turns it off: the backlog is old by design. */
  includeAge?: boolean;
}

/** `voucher_date_warnings`: everything about the two dates worth a second look; `[]` when clean. */
export function voucherDateWarnings(
  entryDate: string | null | undefined,
  billDate?: string | null,
  options: VoucherDateWarningOptions = {},
): DateWarning[] {
  const now = parseDay(options.today ?? today());
  if (!now) return [];
  const includeAge = options.includeAge ?? true;
  const entry = parseDay(entryDate);
  const bill = parseDay(billDate);
  const warnings: DateWarning[] = [];
  const dates: [string, string, Day | null][] = [['entry_date', 'Voucher', entry]];
  if (bill) dates.push(['bill_date', 'Bill', bill]);

  if (includeAge) {
    for (const [field, noun, day] of dates) {
      if (day && ordinal(now) - ordinal(day) > VOUCHER_AGE_WARNING_DAYS) {
        warnings.push({
          code: 'DATE_OLD',
          field,
          message:
            `${noun} date ${fmt(day)} is more than ` +
            `${VOUCHER_AGE_WARNING_DAYS} days ago — check it.`,
        });
      }
    }
  }

  if (bill && entry) {
    if (ordinal(bill) > ordinal(entry)) {
      warnings.push({
        code: 'BILL_AFTER_ENTRY',
        field: 'bill_date',
        message: `The bill is dated ${fmt(bill)} — after the voucher date ${fmt(entry)}.`,
      });
    }
    if (bill.year !== entry.year || bill.month !== entry.month) {
      warnings.push({
        code: 'BILL_OTHER_MONTH',
        field: 'bill_date',
        message:
          `The bill date ${fmt(bill)} is in a different month ` +
          `from the voucher date ${fmt(entry)}.`,
      });
    }
  }

  for (const [field, , day] of dates) {
    if (!day) continue;
    const other = looksSwapped(day, now);
    if (other !== null) {
      warnings.push({
        code: 'LOOKS_SWAPPED',
        field,
        message: `${fmt(day)} may have day and month swapped — did you mean ${fmt(other)}?`,
      });
    }
  }
  return warnings;
}

/** `ISO` +/- whole days, for tests and "N days ago" checks. */
export function addDays(value: string, days: number): string {
  const d = parseDay(value);
  if (!d) return value;
  return iso(fromOrdinal(ordinal(d) + days));
}
