import { formatDate, formatNumber } from '@/shared/utils';

/** An amount as a ledger prints it: two decimals, Indian grouping, blank for nil. */
export function money(value: number | null | undefined, blankZero = false): string {
  if (value === null || value === undefined) return '';
  if (blankZero && value === 0) return '';
  return formatNumber(value, 2);
}

/** A SAP date (`YYYY-MM-DD`) in the app's date format; `-` when absent. */
export function sapDate(value: string | null | undefined): string {
  if (!value) return '-';
  // Parse as a local calendar date: `new Date('2026-04-01')` is UTC midnight,
  // which shows as the previous day west of Greenwich.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return formatDate(new Date(year, month - 1, day));
}

/** The month a budget line covers, e.g. `Apr 2026`. */
export function monthLabel(value: string | null | undefined): string {
  if (!value) return '-';
  const [year, month] = value.slice(0, 7).split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
