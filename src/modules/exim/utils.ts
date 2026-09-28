/** Tonnes to the kilo, as licences are reported: `484.151`. */
export function fmtQty(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/** A value in rupees or dollars, to the paisa or cent. */
export function fmtMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Today as `YYYY-MM-DD`, in the viewer's own day. A function, not a constant,
 *  so a tab left open over midnight does not carry yesterday. */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Whole days from today to a `YYYY-MM-DD` date: 0 is today, negative is past.
 * Read as a local date — `new Date('2026-09-24')` is UTC midnight, which is
 * the evening before here.
 */
export function daysUntil(iso?: string | null): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** INR over the exchange rate, for the preview while a licence is typed. */
export function usdPreview(inr: string, rate: string): string | null {
  const value = Number(inr);
  const perDollar = Number(rate);
  if (!(value > 0) || !(perDollar > 0)) return null;
  return fmtMoney(value / perDollar);
}
