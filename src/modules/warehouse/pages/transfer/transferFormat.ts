/**
 * Formatting helpers for warehouse transfer requests.
 *
 * Kept apart from the badge components so fast refresh keeps working — a module
 * that exports both components and plain functions breaks it.
 */

/** Trims the trailing zeros Django's DecimalField sends ("10.000" -> "10"). */
export function qty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function shortDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Units that only exist in whole numbers. Mirrors `DISCRETE_UOMS` in
 * `warehouse/services/transfer_guards.py` — SAP itself accepts 0.993 PCS, so the
 * app is the only thing that refuses it and both ends must agree on the list.
 */
const DISCRETE_UOMS = new Set(['PCS', 'NOS', 'SET', 'DRM']);

export function isWholeUnit(uom?: string | null): boolean {
  return DISCRETE_UOMS.has((uom ?? '').trim().toUpperCase());
}
