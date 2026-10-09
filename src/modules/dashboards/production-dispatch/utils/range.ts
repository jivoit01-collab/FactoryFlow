/**
 * The range the report covers: any span of days up to a year, kept in the URL
 * as `?from=YYYY-MM-DD&to=YYYY-MM-DD` so a link opens on the same days.
 *
 * The default -- this month so far -- is never written there, so the plain
 * address always means "this month, as of now".
 */

import { MAX_RANGE_DAYS } from '../constants';
import { addDays, daysInRange } from './compute';

export interface ReportRange {
  from: string;
  to: string;
}

export type PresetKey = 'today' | 'yesterday' | 'this-month' | 'last-month' | 'last-90';

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'last-90', label: 'Last 90 days' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(raw: string | null | undefined): raw is string {
  return !!raw && ISO_DATE.test(raw) && !Number.isNaN(Date.parse(`${raw}T00:00:00Z`));
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function presetRange(key: PresetKey, today: string): ReportRange {
  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case 'this-month':
      return { from: firstOfMonth(today), to: today };
    case 'last-month': {
      const lastDay = addDays(firstOfMonth(today), -1);
      return { from: firstOfMonth(lastDay), to: lastDay };
    }
    case 'last-90':
      return { from: addDays(today, -89), to: today };
  }
}

/** The preset a range is, if it is one -- so its button can show as picked. */
export function presetOf(range: ReportRange, today: string): PresetKey | null {
  const match = PRESETS.find(({ key }) => {
    const preset = presetRange(key, today);
    return preset.from === range.from && preset.to === range.to;
  });
  return match?.key ?? null;
}

/**
 * What the URL asks for, made into a range the server will read: dates that
 * parse, in order, no later than today and no longer than a year. Anything
 * unreadable falls back to this month.
 */
export function resolveRange(
  raw: { from?: string | null; to?: string | null },
  today: string,
): ReportRange {
  if (!isIsoDate(raw.from) || !isIsoDate(raw.to)) return presetRange('this-month', today);
  let from = raw.from;
  let to = raw.to;
  if (from > to) [from, to] = [to, from];
  if (to > today) to = today;
  if (from > to) from = to;
  if (daysInRange(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
  return { from, to };
}

function readable(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** "9 Oct 2026", or "1 Sep – 30 Sep 2026", or "1 Dec 2025 – 31 Jan 2026". */
export function rangeLabel(range: ReportRange): string {
  if (range.from === range.to) return readable(range.from, true);
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${readable(range.from, !sameYear)} – ${readable(range.to, true)}`;
}

/** A date the way the tables show it. */
export function dayLabel(iso: string): string {
  return readable(iso, true);
}
