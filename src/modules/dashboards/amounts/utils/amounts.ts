import { daysSince, num } from '../../admin-control/utils';
import type { OpsTagTone } from '../../logistics-control/components';

/** A part as a percentage of its whole, or null when there is no whole to divide. */
export function shareOf(part: number | null | undefined, whole: number | null | undefined) {
  const p = num(part);
  const w = num(whole);
  if (p === null || w === null || w <= 0) return null;
  return (p / w) * 100;
}

/** '2024-09-30' -> '30 Sep 2024'. Anything unparseable passes through. */
export function longDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * How long the oldest debt has been standing, and how worried to be.
 *
 * Green to three months, amber to a year, red beyond: past a year a debt has
 * usually stopped being a payment that is late and become one that is not
 * coming. Condition colours only, as on every operations board.
 */
export function debtAge(
  iso: string | null | undefined,
  today = new Date(),
): { days: number; label: string; tone: OpsTagTone } | null {
  const days = daysSince(iso, today);
  if (days === null) return null;
  const tone: OpsTagTone = days > 365 ? 'bad' : days > 90 ? 'warn' : 'ok';
  return { days, label: `${days.toLocaleString('en-IN')} days`, tone };
}

/**
 * A stock quantity: whole above ten, to two places below, so 0.4 litres left in
 * a godown does not read as "0" next to a rupee value.
 */
export function quantity(value: number | null | undefined): string {
  const n = num(value);
  if (n === null) return '—';
  if (Math.abs(n) >= 10) return Math.round(n).toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** 'Shahrukh Khan, Ravi +2' -- the managers column, kept to one line. */
export function managerList(names: string[], shown = 2): string {
  if (names.length === 0) return 'none assigned';
  const head = names.slice(0, shown).join(', ');
  return names.length > shown ? `${head} +${names.length - shown}` : head;
}
