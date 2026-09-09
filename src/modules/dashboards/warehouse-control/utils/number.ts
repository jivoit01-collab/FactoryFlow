/**
 * Numeric coercion for the board's folds.
 *
 * SAP-derived figures reach the frontend as either numbers or decimal strings
 * depending on the field, and a `null` is common on a bill nobody has priced.
 * Every total on the board runs through here so one unparseable value cannot
 * turn a whole column into `NaN`.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}
