/**
 * Days and spans for the report, in local time and as `YYYY-MM-DD` strings
 * throughout — the same rule as `../../utils/month.ts`, for the same reason.
 */

import {
  daysInMonth,
  isMonthKey,
  localISODate,
  type MonthKey,
  monthLabel,
  monthLastDay,
  monthShortLabel,
  shiftMonth,
} from '../../utils/month';
import { DAY_VIEW_TREND_DAYS } from '../constants';
import type { ReportPeriod, ReportView } from '../types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isISODay(raw: string | null | undefined): raw is string {
  return Boolean(raw && ISO_DAY.test(raw) && !Number.isNaN(parseDay(raw).getTime()));
}

function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  // Noon, so no clock change can push the arithmetic across midnight.
  return new Date(year, month - 1, date, 12);
}

/** The day `by` days away: -1 is the day before. */
export function addDays(day: string, by: number): string {
  const date = parseDay(day);
  date.setDate(date.getDate() + by);
  return localISODate(date);
}

/** Every day from `from` to `to`, both included. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** "Thursday, 2 October 2026". */
export function longDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "2 Oct". */
export function shortDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Thu, 2 Oct". */
export function weekdayDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "1–2 Oct", or "2 Oct" for a single day. */
export function spanLabel(from: string, to: string): string {
  if (from === to) return shortDay(from);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8))}–${shortDay(to)}`;
  }
  return `${shortDay(from)} – ${shortDay(to)}`;
}

/** What the URL asked for, unvalidated. */
export interface PeriodParams {
  view: string | null;
  date: string | null;
  month: string | null;
}

/**
 * The period the page shows, from the URL and today's date.
 *
 * The report runs to YESTERDAY: today's figures are not in until the night
 * shift is booked, and a half-day sitting under a heading that reads like a
 * whole one is the commonest way a daily report misleads. So the latest day is
 * yesterday, the default view is that day, and anything later in the URL is
 * pulled back to it rather than shown empty.
 */
export function resolvePeriod(params: PeriodParams, today: string): ReportPeriod {
  const latest = addDays(today, -1);
  const latestMonth = latest.slice(0, 7);
  const view: ReportView = params.view === 'month' ? 'month' : 'day';

  const date = isISODay(params.date) && params.date < latest ? params.date : latest;
  const month = isMonthKey(params.month) && params.month < latestMonth ? params.month : latestMonth;

  if (view === 'day') {
    return {
      view,
      date,
      month,
      latest,
      from: date,
      to: date,
      label: longDay(date),
      sublabel: null,
      canGoForward: date < latest,
      isLatest: date === latest,
    };
  }

  const isRunning = month === latestMonth;
  const to = isRunning ? latest : monthLastDay(month);
  const from = `${month}-01`;
  return {
    view,
    date,
    month,
    latest,
    from,
    to,
    label: monthLabel(month),
    // Said only while the month is still running, when "October" would
    // otherwise read as the whole of it.
    sublabel: isRunning && to !== monthLastDay(month) ? `${spanLabel(from, to)} so far` : null,
    canGoForward: !isRunning,
    isLatest: isRunning,
  };
}

/**
 * The span a period is compared with.
 *
 * A day against the day before. A month against the SAME DAYS of the month
 * before — 1–2 October against 1–2 September, not against all of September,
 * which would make every running month look like a collapse. A finished month
 * is compared with the whole of the one before it.
 */
export function comparisonSpan(period: ReportPeriod): { from: string; to: string; label: string } {
  if (period.view === 'day') {
    const day = addDays(period.date, -1);
    return { from: day, to: day, label: shortDay(day) };
  }

  const previous: MonthKey = shiftMonth(period.month, -1);
  const isWholeMonth = period.to === monthLastDay(period.month);
  if (isWholeMonth) {
    return { from: `${previous}-01`, to: monthLastDay(previous), label: monthShortLabel(previous) };
  }

  const elapsed = Math.min(Number(period.to.slice(8, 10)), daysInMonth(previous));
  const to = `${previous}-${String(elapsed).padStart(2, '0')}`;
  return { from: `${previous}-01`, to, label: spanLabel(`${previous}-01`, to) };
}

/** The days drawn on the trend charts: the month itself, or the fortnight to the day. */
export function trendSpan(period: ReportPeriod): { from: string; to: string } {
  if (period.view === 'month') return { from: period.from, to: period.to };
  return { from: addDays(period.date, -(DAY_VIEW_TREND_DAYS - 1)), to: period.date };
}
