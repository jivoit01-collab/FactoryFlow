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
