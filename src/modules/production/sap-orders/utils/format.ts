import type { StatusTone } from '@/shared/components/page';
import { formatDate, formatNumber } from '@/shared/utils';

import type { SapOrderStatus } from '../api/sapOrders.api';

export const STATUS_TONE: Record<SapOrderStatus, StatusTone> = {
  P: 'neutral',
  R: 'progress',
  L: 'done',
  C: 'blocked',
};

export function qty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return formatNumber(value, Number.isInteger(value) ? 0 : 3);
}

/** A SAP date (`YYYY-MM-DD`) as a local calendar day. */
export function sapDate(value: string | null | undefined): string {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return formatDate(new Date(year, month - 1, day));
}

/** Share of the plan done, 0–100, for a progress bar. */
export function percent(done: number, planned: number): number {
  if (!planned || planned <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / planned) * 100)));
}

/** What remains to issue on a component line (never negative). */
export function remaining(planned: number, issued: number): number {
  return Math.max(0, Math.round((planned - issued) * 1e6) / 1e6);
}

/** Batches must add up to the line quantity — the server's rule, checked first here. */
export function batchesMatch(quantity: number, batches: { quantity: string }[]): boolean {
  const total = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  return Math.abs(total - quantity) < 1e-6;
}
