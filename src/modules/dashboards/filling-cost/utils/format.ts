/** Figures as the factory writes them: Indian grouping, rupees. */

const num = (value: string | null | undefined) => (value == null ? null : Number(value));

/** 1234567.8 → '₹12,34,568' (whole rupees); a credit reads '−₹3,075'. */
export function rupees(value: string | null | undefined): string {
  const n = num(value);
  if (n == null) return '—';
  const whole = `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
  return n < 0 ? `−${whole}` : whole;
}

/** A rate: '₹1.35' a case, '₹0.0833' a bottle. */
export function rate(value: string | null | undefined, places = 2): string {
  const n = num(value);
  return n == null
    ? '—'
    : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: places, maximumFractionDigits: places })}`;
}

/** 163860 → '1,63,860'. */
export function count(value: string | null | undefined): string {
  const n = num(value);
  return n == null ? '—' : Math.round(n).toLocaleString('en-IN');
}

/** '2026-09-28' → 'Monday, 28 September'. */
export function longDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
