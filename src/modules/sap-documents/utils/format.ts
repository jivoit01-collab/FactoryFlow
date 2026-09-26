import { formatDate, formatNumber } from '@/shared/utils';

/** An amount as SAP prints it: two decimals, Indian grouping; blank for nil. */
export function money(value: number | null | undefined, blankZero = false): string {
  if (value === null || value === undefined) return '';
  if (blankZero && value === 0) return '';
  return formatNumber(value, 2);
}

/** A quantity: up to three decimals, nothing for nil. */
export function quantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return formatNumber(value, Number.isInteger(value) ? 0 : 3);
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

/** SAP address text arrives CR-separated and often half-empty ("-\rIN"); keep
 * only the lines that carry an address (SAP Portal documents.html:288-295). */
export function cleanAddress(value: string | null | undefined): string {
  const lines = String(value ?? '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '-' && /[A-Za-z0-9]/.test(line));
  const text = lines.join('\n');
  return text.replace(/[^A-Za-z0-9]/g, '').length > 4 ? text : '';
}
