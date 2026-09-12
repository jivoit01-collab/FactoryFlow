import type { DismantleStatus } from './api';

export const DISMANTLE_STATUS_LABELS: Record<DismantleStatus, string> = {
  DRAFT: 'Draft',
  PARTIALLY_POSTED: 'Partly posted to SAP',
  POSTED: 'Posted to SAP',
  CANCELLED: 'Cancelled',
};

export const DISMANTLE_STATUS_BADGE_CLASS: Record<DismantleStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  // Some of its three documents are in SAP. Read as unfinished, not as a
  // failure: what SAP took is real and the stock has partly moved.
  PARTIALLY_POSTED: 'bg-orange-100 text-orange-800',
  POSTED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

/** Trim SAP's trailing zeros: `16.000000` reads as `16`, `0.062500` as `0.0625`. */
export function formatQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return String(Number(num.toFixed(6)));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
