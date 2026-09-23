/**
 * Pure helpers for the construction module: money and date formatting, and the
 * label and tint maps.
 *
 * Separate from `components/ConstructionBits.tsx` so that file exports nothing
 * but components — a module mixing the two breaks React fast refresh, which is
 * why `issues` splits them the same way.
 *
 * Money arrives from the API as a string and stays one until it is formatted
 * here. Nothing in this module parses an amount into a float to display it.
 */
import type { DimensionUnit, ExpenseCategory, StopReason } from './types';

/**
 * The sides as they were measured: "30 × 20 × 12 ft".
 *
 * The raw figures rather than the area they imply — a site manager checks a
 * project against the sides they were given, and 600 sq ft does not tell them
 * whether the shed is 30×20 or 60×10. Trailing zeros are dropped so 30.00 reads
 * as 30. Returns null when nothing was recorded.
 */
export function formatDimensions(project: {
  length: string | null;
  breadth: string | null;
  height: string | null;
  dimension_unit: DimensionUnit;
}): string | null {
  const sides = [project.length, project.breadth, project.height]
    .filter((side): side is string => side !== null && side !== '' && Number(side) > 0)
    .map((side) => String(Number(side)));
  if (sides.length === 0) return null;
  return `${sides.join(' × ')} ${project.dimension_unit === 'M' ? 'm' : 'ft'}`;
}

/** ₹ with Indian digit grouping, no decimals unless there are paise. */
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** "1.2 L", "45 K" — for a bar label where the full figure does not fit. */
export function shortMoney(value: string | null | undefined): string {
  if (!value) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
  return `₹${amount.toFixed(0)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * How many days back the site may file a log without `can_edit_project`.
 *
 * Mirrors `DEFAULT_BACKDATE_DAYS` in the Django app. Duplicated rather than
 * fetched because it only decides what the date picker OFFERS — the service
 * stays the authority and refuses anything older regardless.
 */
export const BACKDATE_DAYS = 7;

/** `days` before `iso`, as YYYY-MM-DD. */
export function daysBefore(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Today in the browser's timezone as YYYY-MM-DD, which is what the API wants. */
export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MATERIAL: 'Material',
  LABOUR: 'Labour',
  CONTRACTOR: 'Contractor',
  EQUIPMENT_HIRE: 'Equipment hire',
  TRANSPORT: 'Transport',
  PROFESSIONAL_FEES: 'Professional fees',
  STATUTORY: 'Statutory',
  OTHER: 'Other',
};

export const STOP_REASON_LABELS: Record<StopReason, string> = {
  RAIN: 'Rain',
  NO_MATERIAL: 'No material',
  NO_LABOUR: 'No labour',
  NO_POWER: 'No power',
  HOLIDAY: 'Holiday',
  APPROVAL_PENDING: 'Awaiting approval',
  SAFETY: 'Safety',
  OTHER: 'Other',
};

export const CATEGORY_TINTS: Record<ExpenseCategory, string> = {
  MATERIAL: 'bg-sky-500',
  LABOUR: 'bg-emerald-500',
  CONTRACTOR: 'bg-violet-500',
  EQUIPMENT_HIRE: 'bg-amber-500',
  TRANSPORT: 'bg-cyan-500',
  PROFESSIONAL_FEES: 'bg-fuchsia-500',
  STATUTORY: 'bg-rose-500',
  OTHER: 'bg-slate-400',
};
