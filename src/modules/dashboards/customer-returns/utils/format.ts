import type { ReturnsTrendPoint } from '../types';

/**
 * A quantity for a tile or an axis.
 *
 * Returns are counted in whatever the invoice line was sold in — cases, pieces,
 * litres — so this deliberately prints a bare number and the panel says the unit.
 * Abbreviating at 1000 keeps a 12-bar axis from wrapping.
 */
export function compactQty(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

/** Full precision, Indian grouping — for tables and tooltips, where it fits. */
export function exactQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

export function compactMoney(value: number): string {
  return `₹${compactQty(value)}`;
}

export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * A trend bucket as an axis label.
 *
 * The bucket is `YYYY-MM-DD` on a daily window and `YYYY-MM` on a monthly one —
 * parsed by hand rather than through `new Date`, which reads a bare `YYYY-MM-DD`
 * as UTC midnight and can print the previous day east of Greenwich.
 */
export function trendLabel(bucket: string, granularity: 'day' | 'month'): string {
  const [year, month, day] = bucket.split('-').map(Number);
  const monthName = new Date(2000, (month || 1) - 1, 1).toLocaleString('en-IN', {
    month: 'short',
  });
  return granularity === 'day' ? `${day} ${monthName}` : `${monthName} ${String(year).slice(2)}`;
}

/** A date the API sent as a plain day, for a table cell. Same UTC caveat as above. */
export function dayLabel(value: string | null): string {
  if (!value) return '—';
  const [date] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return '—';
  const monthName = new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'short' });
  return `${day} ${monthName} ${year}`;
}

/** The window the header offers, as the two dates the API wants. */
export function windowDates(days: number, today = new Date()): { from: string; to: string } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { from: isoDay(start), to: isoDay(end) };
}

function isoDay(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * The share of the window's quantity that came back unsellable, as a series the
 * trend can draw beneath the total. Kept out of the chart component so the
 * arithmetic can be tested without rendering recharts.
 */
export function sellableSplit(trend: ReturnsTrendPoint[]): Array<
  ReturnsTrendPoint & { good_quantity: number }
> {
  return trend.map((point) => ({
    ...point,
    // Never negative: `damaged_quantity` is a subset of `quantity`, but a future
    // payload that breaks that promise should flatten the band, not invert it.
    good_quantity: Math.max(0, point.quantity - point.damaged_quantity),
  }));
}
