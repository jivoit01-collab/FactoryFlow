import type { StatusTone } from '@/shared/components/page';

import type { EntryStatus, PostingStatus, SapOrderRow, StepKey } from '../api';

export const STATUS_TONE: Record<EntryStatus, StatusTone> = {
  DRAFT: 'neutral',
  PLANNED: 'info',
  RELEASED: 'info',
  ISSUED: 'progress',
  RECEIVED: 'progress',
  CLOSED: 'done',
};

/** What each step is called on its page and in the progress bar. */
export const STEP_LABEL: Record<StepKey, string> = {
  PLAN: 'Plan',
  RELEASE: 'Release',
  ISSUE: 'Issue',
  RECEIPT: 'Receipt',
  CLOSE: 'Close',
};

/** The page title of each step: what it does in SAP. */
export const STEP_TITLE: Record<StepKey, string> = {
  PLAN: 'Plan the production order',
  RELEASE: 'Release the order',
  ISSUE: 'Issue for production',
  RECEIPT: 'Receipt from production',
  CLOSE: 'Close the order',
};

/** What a step's post button says. */
export const STEP_ACTION: Record<StepKey, string> = {
  PLAN: 'Create planned order',
  RELEASE: 'Release order',
  ISSUE: 'Post issue',
  RECEIPT: 'Post receipt',
  CLOSE: 'Close order',
};

export const POSTING_TONE: Record<PostingStatus, StatusTone> = {
  SENDING: 'progress',
  QUEUED: 'warn',
  POSTED: 'done',
  REJECTED: 'blocked',
  CANCELLED: 'neutral',
};

/** A quantity as SAP holds it (a decimal string), for reading: grouped, no trailing zeros. */
export function qty(value: string | number | null | undefined, places = 3): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('en-IN', { maximumFractionDigits: places });
}

/** "120 boxes + 3 pcs" — how the floor counts what was made. */
export function boxesLabel(boxes: number, loose: number): string {
  const parts = [];
  if (boxes) parts.push(`${boxes.toLocaleString('en-IN')} ${boxes === 1 ? 'box' : 'boxes'}`);
  if (loose) parts.push(`${loose} pcs`);
  return parts.join(' + ') || '0';
}

/** Today in the browser's own calendar, as SAP's YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A YYYY-MM-DD date as DD-MM-YYYY, without the time-zone drift `new Date()` brings. */
export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}-${month}-${year}` : iso;
}

/** Whether a set of batch picks adds up to `needed` (SAP keeps six places). */
export function batchesAddUp(needed: string | number, picks: { quantity: string }[]): boolean {
  const total = picks.reduce((sum, pick) => sum + (Number(pick.quantity) || 0), 0);
  return Math.abs(total - Number(needed)) < 1e-6;
}

/**
 * How far a released order has got. SAP keeps an order "Released" through its
 * issue and its receipt, until it is closed, so the status alone does not say.
 */
export function releasedStage(row: SapOrderRow): string | null {
  if (row.status !== 'R') return null;
  const planned = Number(row.planned_quantity);
  const received = Number(row.completed_quantity);
  const made = row.type === 'S' ? 'FG created' : 'Received';
  if (planned > 0 && received >= planned) return `${made}, not closed`;
  if (received > 0) return 'Part received';
  if (Number(row.issued_quantity) > 0) return 'Issued, nothing received';
  return 'Nothing issued yet';
}
