import type { ApiError } from '@/core/api/types';

/** Rupees, grouped the Indian way, with no paise — every figure here is a bill. */
export function money(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Same, but keeps the paise — for a rate per litre, where they matter. */
export function rupees(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function km(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('en-IN')} km`;
}

export function quantity(value: string | number | null | undefined, unit: string): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
}

/** `2026-09-23` as `23 Sep 2026`. Dates from this API are always date-only. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Today as the API wants it, for a date box that should default to now. */
export function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The first day of the current month, for a report that opens on this month. */
export function monthStart(): string {
  return `${today().slice(0, 7)}-01`;
}

/**
 * A DRF error response flattened to `{ field: 'first message' }`.
 *
 * `detail` and `non_field_errors` both land under `general`, so a form has one
 * place to look for the message that belongs above the whole thing.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  const apiError = error as ApiError;
  const flat: Record<string, string> = {};

  Object.entries(apiError?.errors ?? {}).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    if (!message) return;
    flat[field === 'non_field_errors' ? 'general' : field] = message;
  });

  if (!Object.keys(flat).length) {
    const message = apiError?.detail || apiError?.message;
    if (message) flat.general = message;
  }
  return flat;
}
