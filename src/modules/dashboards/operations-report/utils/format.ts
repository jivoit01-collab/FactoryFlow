/**
 * Figures as the plant writes them: Indian grouping, lakh and crore.
 */

const IN = 'en-IN';

/** The rule an unknown figure is drawn as — never a zero. */
export const NIL = '—';

/** 1,02,340 */
export function whole(value: number | null): string {
  return value === null ? NIL : Math.round(value).toLocaleString(IN);
}

/** 1,02,340.5 — one decimal at most, for a quantity that can be fractional. */
export function quantity(value: number | null): string {
  return value === null ? NIL : value.toLocaleString(IN, { maximumFractionDigits: 1 });
}

/** 30.2 lakh, 4.12 Cr, 98,400 — for a headline, where the exact figure is in the table below. */
export function compact(value: number | null): string {
  if (value === null) return NIL;
  const size = Math.abs(value);
  if (size >= 1e7) return `${(value / 1e7).toLocaleString(IN, { maximumFractionDigits: 2 })} Cr`;
  if (size >= 1e5) return `${(value / 1e5).toLocaleString(IN, { maximumFractionDigits: 2 })} lakh`;
  return whole(value);
}

/** ₹ 1,35,210 */
export function rupees(value: number | null): string {
  return value === null ? NIL : `₹ ${whole(value)}`;
}

/** ₹ 1.35 lakh */
export function rupeesCompact(value: number | null): string {
  return value === null ? NIL : `₹ ${compact(value)}`;
}

/** ₹ 2.75 — a cost per litre; a rule where nothing was filled. */
export function perLitre(value: number | null): string {
  if (value === null) return NIL;
  // A few paise a litre is still something; "₹ 0.00" would say it was nothing.
  if (value > 0 && value < 0.005) return '< ₹ 0.01';
  return `₹ ${value.toFixed(2)}`;
}

/** 120k — an axis tick, where "1.2 lakh" will not fit and "1.2L" reads as litres. */
export function axisTick(value: number): string {
  return Math.abs(value) >= 1000
    ? `${(value / 1000).toLocaleString(IN, { maximumFractionDigits: 1 })}k`
    : String(value);
}

/** 0.31% */
export function percent(value: number | null, digits = 1): string {
  return value === null ? '—' : `${value.toFixed(digits)}%`;
}

/**
 * The change from `previous` to `current`, in percent. Null when there is no
 * previous figure to compare with — a change "from nothing" is not a number.
 */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
