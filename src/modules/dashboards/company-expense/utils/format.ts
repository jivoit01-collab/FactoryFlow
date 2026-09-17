/**
 * Formatting and arithmetic for the Company Expense grid.
 *
 * Split out of the components because these are the parts that can be wrong in
 * a way nobody notices on a wall: a rupee figure rounded into the wrong unit,
 * or a share bar drawn against a denominator that includes the bar itself.
 */

/**
 * Indian-grouped rupees, in full.
 *
 * Not compacted. A lakh-and-crore rounding hides the digits the people costing
 * a line actually argue about — ₹2.6k and ₹2,600 read the same from the
 * doorway, but only one of them can be checked against the register — so the
 * whole figure is printed and the square is sized to hold it. Paise are still
 * dropped: every figure here is an accrual or a register total, reconciled to
 * the rupee at best.
 */
export function money(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rupees = Math.round(value);
  // The minus goes outside the symbol. `(-1).toLocaleString()` would put it
  // inside — '₹-1,364' — which reads as a typo at four metres.
  const sign = rupees < 0 ? '-' : '';
  return `${sign}₹${Math.abs(rupees).toLocaleString('en-IN')}`;
}

/** Whole number, Indian grouping. For head counts and unit readings. */
export function whole(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-IN');
}

/**
 * A decimal string from the API as a number.
 *
 * Every money figure arrives as a string because DRF serialises `DecimalField`
 * that way. Parsing at the edge — here — is what keeps `'1200.00' + '300.00'`
 * from ever being attempted somewhere downstream.
 */
export function amount(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * One square's share of its column, as a percentage.
 *
 * The denominator is the column's own total — which already contains this
 * square — so the shares down a column add to 100 and the bar reads as "this
 * much of the power bill". Guarded against a zero column, which is the normal
 * state of the maintenance column rather than an edge case.
 */
export function share(part: number, columnTotal: number): number {
  if (!columnTotal) return 0;
  return Math.max(0, Math.min(100, (part / columnTotal) * 100));
}

/** `JIVO_OIL` reads as "Oil" where every row already shares the prefix. */
export function companyLabel(name: string): string {
  return name.replace(/^Jivo[_\s-]*/i, '').trim() || name;
}
