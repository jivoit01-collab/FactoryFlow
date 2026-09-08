/** Display helpers shared by the board's panels. Indian digit grouping throughout. */

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export function formatDecimal(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits });
}

/** Rupees, whole units — a board is read from across the room, not audited. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Large rupee amounts in lakh/crore, which is how the plant talks about them. */
export function formatCompactCurrency(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 10_000_000) return `${(value / 10_000_000).toFixed(2)} Cr`;
  if (absolute >= 100_000) return `${(value / 100_000).toFixed(2)} L`;
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

export function compactText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback;
}

/** `2026-09-08` → `8 Sep 2026`. Anything unparseable comes back unchanged. */
export function formatDay(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return '';
  const parsed = new Date(`${text.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Weight in kilograms, or an empty string when there is none to show. */
export function formatWeight(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  return `${formatDecimal(numeric)} kg`;
}

/** Kilograms as tonnes — a day's pending load runs to five digits in kg. */
export function formatTons(kilograms: number): string {
  return `${(kilograms / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t`;
}
