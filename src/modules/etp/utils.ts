/**
 * Plain helpers shared by the ETP / STP pages.
 *
 * Kept out of `EtpControls.tsx` so that file exports components only (fast
 * refresh).
 */

/** Every register page defaults its window to the current month. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Blank-safe formatting for the register tables. */
export function fmt(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
