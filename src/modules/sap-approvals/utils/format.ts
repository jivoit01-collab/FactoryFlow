import { formatCurrency } from '@/shared/utils';

import type { SapApprovalStatus } from '../types';

/** Decimal strings from HANA, shown as money; "—" when SAP holds none. */
export function money(value: string | null | undefined, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return formatCurrency(n, currency || 'INR');
}

export function shortDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/** "2026-10-08T13:25:00" → "08-10-2026", the register's own date format. */
export function registerDate(value?: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : '—';
}

export const STATUS_LABELS: Record<SapApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  GENERATED: 'Posted',
  CANCELLED: 'Cancelled',
};

/** "USER37 (HONEY SINGH)", or whichever half SAP holds. */
export function person(code?: string | null, name?: string | null): string {
  if (code && name) return `${code} (${name})`;
  return code || name || '—';
}
