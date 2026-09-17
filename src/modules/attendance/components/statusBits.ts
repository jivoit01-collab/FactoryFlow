/**
 * Status vocabulary and formatting. No components — see StatusBadge.tsx.
 *
 * The colour scheme carries one idea: MISSING_PUNCH is amber, not red and not
 * green. It is the "somebody needs to look at this" state — the person was at
 * the gate but the machine only saw them once — and it is roughly one
 * person-day in seven, so it has to read as *unresolved* rather than as either
 * verdict.
 */
import type { AttendanceStatusValue } from '../api/attendance.api';

export const STATUS_STYLES: Record<AttendanceStatusValue, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ABSENT: 'bg-red-100 text-red-800 border-red-200',
  HALF_DAY: 'bg-sky-100 text-sky-800 border-sky-200',
  // Unresolved, deliberately not a verdict colour.
  MISSING_PUNCH: 'bg-amber-100 text-amber-900 border-amber-300',
  WEEKLY_OFF: 'bg-slate-100 text-slate-600 border-slate-200',
  ON_LEAVE: 'bg-violet-100 text-violet-800 border-violet-200',
  ON_DUTY: 'bg-teal-100 text-teal-800 border-teal-200',
  HOLIDAY: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half day',
  MISSING_PUNCH: 'Missing punch',
  WEEKLY_OFF: 'Weekly off',
  ON_LEAVE: 'On leave',
  ON_DUTY: 'On duty',
  HOLIDAY: 'Holiday',
};

export function statusLabel(status: AttendanceStatusValue): string {
  return STATUS_LABELS[status] ?? status;
}

/** `572` -> `9h 32m`. Gate-to-gate, not productive time. */
export function formatMinutes(minutes: number): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest.toString().padStart(2, '0')}m` : `${rest}m`;
}

export function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '—';
}
