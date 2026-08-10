/** Shared vocabulary for the Live Trail — numbers, money, dates and the series.
 *
 * Kept in one place because the trail says the same thing in five different
 * panels, and a shortage that reads "28,853" in the table and "28.9k" in the
 * drill-down is a shortage two people will argue about.
 */

const INDIAN = new Intl.NumberFormat('en-IN');

/** Whole units. Pieces and litres are counted, not estimated. */
export function n0(value: number | null | undefined): string {
  if (value == null) return '—';
  return INDIAN.format(Math.round(value));
}

/** One decimal — for litres and lead times, where the fraction is real. */
export function n1(value: number | null | undefined): string {
  if (value == null) return '—';
  return INDIAN.format(Math.round(value * 10) / 10);
}

/** Money in the units Indian finance actually speaks: crores and lakhs. */
export function inr(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${n0(value)}`;
}

export function days(value: number | null | undefined): string {
  return value == null ? '—' : `${n1(value)} d`;
}

/** `2026-08-10` as a date, or an em dash. Dates arrive already ISO from SAP. */
export function onDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export type Tone = 'good' | 'warn' | 'serious' | 'critical' | 'neutral';

/**
 * The three ways an open order gets answered.
 *
 * Categorical — they carry identity, not magnitude — so the hues are fixed in
 * this order and never cycled or reassigned when a filter changes the row set.
 * The values live in `index.css` as `--trail-*` and are validated per theme for
 * lightness, chroma, colour-vision separation and contrast against that
 * theme's own surface. The bars and the legend both read from here, so they
 * cannot drift apart.
 */
export const TRAIL_SERIES = [
  { key: 'stock', label: 'Ship from stock', color: 'var(--trail-stock)' },
  { key: 'wip', label: 'Covered by production in progress', color: 'var(--trail-wip)' },
  { key: 'produce', label: 'Must still be produced', color: 'var(--trail-produce)' },
] as const;
