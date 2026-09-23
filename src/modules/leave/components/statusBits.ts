/**
 * Shared presentation bits for leave.
 *
 * Kept out of the components so the pages, the badges and the calendar cannot
 * drift into three different ideas of what "pending" looks like.
 */
import type { LeaveAuthority, LeaveRequestStatus } from '../api/leave.api';

export const STATUS_STYLES: Record<LeaveRequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  WITHDRAWN: 'bg-slate-50 text-slate-600 border-slate-200',
  CANCELLED: 'bg-slate-50 text-slate-600 border-slate-200 line-through',
};

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled',
};

export function statusLabel(status: LeaveRequestStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * How the viewer is entitled to decide this one. Spelled out rather than shown
 * as a raw code, because "skip_level" on a screen means nothing to the person
 * reading it.
 */
const AUTHORITY_LABELS: Record<LeaveAuthority, string> = {
  '': '',
  manager: 'You are their manager',
  skip_level: 'You are above their manager',
  hr: 'You are deciding as HR',
};

export function authorityLabel(authority: LeaveAuthority): string {
  return AUTHORITY_LABELS[authority] ?? '';
}

export function portionLabel(portion: string): string {
  if (portion === 'FIRST_HALF') return 'First half';
  if (portion === 'SECOND_HALF') return 'Second half';
  return 'Full day';
}

/** Today as YYYY-MM-DD in the browser's own zone, never via toISOString(). */
export function todayLocal(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** `2026-09-17` → `17 Sep 2026`, without pulling in a formatter. */
export function formatDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

/** "17 Sep 2026" for one day, "17 – 19 Sep 2026" for a span. */
export function formatRange(from: string, to: string): string {
  return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
}
