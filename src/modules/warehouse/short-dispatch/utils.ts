import type { ShortDispatchReason, ShortDispatchStatus } from './api';

export const STATUS_BADGE: Record<ShortDispatchStatus, string> = {
  POSTED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  QUEUED: 'bg-violet-100 dark:bg-violet-500/15 text-violet-800 dark:text-violet-400',
  REFUSED: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400',
};

export const REASON_OPTIONS: { value: ShortDispatchReason; label: string }[] = [
  { value: 'SHORT', label: 'Short in stock' },
  { value: 'NOT_LOADED', label: 'Not loaded on the vehicle' },
  { value: 'DAMAGED', label: 'Damaged before loading' },
  { value: 'CUSTOMER_REFUSED', label: "Pulled off at customer's request" },
  { value: 'OTHER', label: 'Other' },
];

/** Trailing zeros carry no meaning on a quantity, and three of them hide the digit
 *  that does. `10.000` -> `10`, `2.500` -> `2.5`. */
export function formatQty(value: number | string | null | undefined): string {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return String(value ?? '');
  return String(Number(number.toFixed(3)));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}
