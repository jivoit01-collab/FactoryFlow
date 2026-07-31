import type {
  GoodsReturnBasis,
  GoodsReturnItemCondition,
  GoodsReturnStatus,
} from './api';

export const BASIS_LABELS: Record<GoodsReturnBasis, string> = {
  INVOICE: 'Against Invoice',
  DEBIT_NOTE: 'Against Debit Note',
  LETTER_PAD: 'Against Letter Pad',
};

export const STATUS_LABELS: Record<GoodsReturnStatus, string> = {
  DRAFT: 'Draft',
  AWAITING_ARRIVAL: 'Awaiting Arrival',
  ARRIVED: 'Arrived',
  CANCELLED: 'Cancelled',
};

export const STATUS_BADGE_CLASS: Record<GoodsReturnStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  AWAITING_ARRIVAL: 'bg-amber-100 text-amber-800',
  ARRIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

export const CONDITION_OPTIONS: { value: GoodsReturnItemCondition; label: string }[] = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
];

export const ATTACHMENT_TYPE_BY_BASIS: Record<
  GoodsReturnBasis,
  'INVOICE_COPY' | 'DEBIT_NOTE' | 'LETTER_PAD'
> = {
  INVOICE: 'INVOICE_COPY',
  DEBIT_NOTE: 'DEBIT_NOTE',
  LETTER_PAD: 'LETTER_PAD',
};

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

/** Date-only display (no time). */
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

/** Value for a <input type="date"> from a date/ISO string. */
export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}
