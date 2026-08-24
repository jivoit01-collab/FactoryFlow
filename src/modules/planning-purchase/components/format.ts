/**
 * Display helpers.
 *
 * Quantities arrive as decimal strings from DRF. These format for reading; none
 * of them is used for arithmetic that reaches SAP — the backend keeps the exact
 * Decimal and the payload carries the string through untouched.
 */

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Whole units. Quantities here run to hundreds of thousands of bottles. */
export function qty(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Keeps a couple of decimals — a BOM can call for 0.024 kg of shrink film. */
export function qtyPrecise(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return parsed.toLocaleString('en-IN', {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 3,
  });
}

export function money(value: string | number | null | undefined, currency = 'INR'): string {
  return toNumber(value).toLocaleString('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

/** Lakh/crore, because a monthly plan's spend runs to eight and nine figures. */
export function moneyShort(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  const abs = Math.abs(parsed);
  if (abs >= 10_000_000) return `₹${(parsed / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `₹${(parsed / 100_000).toFixed(2)} L`;
  return money(parsed);
}

export function percent(value: string | number | null | undefined): string {
  return `${toNumber(value).toFixed(1)}%`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function monthLabel(start: string | null, end: string | null): string {
  if (!start) return '—';
  const from = new Date(start);
  if (Number.isNaN(from.getTime())) return '—';
  const label = from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  if (!end) return label;
  const to = new Date(end);
  if (Number.isNaN(to.getTime()) || to.getMonth() === from.getMonth()) return label;
  return `${label} – ${to.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
