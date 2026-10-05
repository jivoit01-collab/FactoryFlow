/**
 * Formatting and spreadsheets for the outstanding reports.
 */
import * as XLSX from 'xlsx';

import type { StatusTone } from '@/shared/components/page';
import { formatDateToISOString, formatDay, formatNumber } from '@/shared/utils';

import type { BucketKey } from '../api';

/** Rupees in full: `₹ 1,23,456.00`. */
export function rupees(value: number | null | undefined): string {
  return `₹ ${formatNumber(value ?? 0, 2)}`;
}

/** Rupees for a tile: `₹ 4.21 Cr`, `₹ 12.5 L`, or in full under a lakh. */
export function rupeesShort(value: number | null | undefined): string {
  const n = value ?? 0;
  const abs = Math.abs(n);
  const short = (x: number) => x.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (abs >= 1e7) return `₹ ${short(n / 1e7)} Cr`;
  if (abs >= 1e5) return `₹ ${short(n / 1e5)} L`;
  return rupees(n);
}

/** Positive is owed to us (Dr), negative owed by us (Cr), as SAP keeps a balance. */
export function drCrSide(balance: number): 'Dr' | 'Cr' | '' {
  const rounded = Math.round(balance * 100) / 100;
  return rounded > 0 ? 'Dr' : rounded < 0 ? 'Cr' : '';
}

/** `12,345.00 Dr`, `500.00 Cr`, or `0.00`. */
export function drCr(balance: number): string {
  const side = drCrSide(balance);
  return side ? `${formatNumber(Math.abs(balance), 2)} ${side}` : formatNumber(0, 2);
}

export function count(n: number): string {
  return n.toLocaleString('en-IN');
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

/** When SAP was read: `14:05` today, the day and time otherwise. */
export function readAtLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const time = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return at.toDateString() === new Date().toDateString()
    ? `Read from SAP at ${time}`
    : `Read from SAP ${formatDay(at)} ${time}`;
}

/** `5 days ago`, `today`, `in 3 days`. */
export function daysAgo(days: number | null | undefined): string {
  if (days === null || days === undefined) return '';
  if (days === 0) return 'today';
  if (days < 0) return days === -1 ? 'tomorrow' : `in ${count(-days)} days`;
  return days === 1 ? 'yesterday' : `${count(days)} days ago`;
}

/** How late a bill is, by its overdue bucket. */
export function overdueTone(bucket: BucketKey): StatusTone {
  if (bucket === 'not_due') return 'neutral';
  if (bucket === 'd0_30') return 'warn';
  return 'blocked';
}

export function overdueLabel(days: number | null): string {
  if (days === null) return 'No due date';
  if (days === 0) return 'Due today';
  if (days < 0) return `Due in ${count(-days)} d`;
  return `${count(days)} d late`;
}

/**
 * Days since a party last paid us, or we paid them (EXIM's bands): within a
 * week is fine, over 25 days is long.
 */
export function paymentDaysTone(days: number | null): StatusTone {
  if (days === null) return 'neutral';
  if (days > 25) return 'blocked';
  if (days > 7) return 'warn';
  return 'done';
}

/** Days a GRPO has waited for its bill (EXIM's bands): over six is late. */
export function grpoDaysTone(days: number | null): StatusTone {
  if (days === null) return 'neutral';
  if (days > 6) return 'blocked';
  if (days > 3) return 'warn';
  return 'done';
}

/** A SAP date as a sheet shows it: `05-10-2026`, blank when absent. */
export function sheetDay(value: string | null | undefined): string {
  return value ? formatDay(value) : '';
}

/**
 * Writes one sheet: the rows as given, columns as wide as their longest
 * value (within reason). Plain: the app ships the unstyled library.
 */
export function downloadSheet(
  rows: Record<string, string | number | null | undefined>[],
  sheetName: string,
  fileStem: string,
) {
  const data: Record<string, string | number | null | undefined>[] = rows.length
    ? rows
    : [{ Message: 'Nothing matches the filters' }];
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      45,
      Math.max(key.length, ...data.slice(0, 2000).map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  const book = XLSX.utils.book_new();
  // Excel refuses a sheet name with any of : \ / ? * [ ] (so "Open A/P"), or over 31 characters.
  XLSX.utils.book_append_sheet(book, sheet, sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 31));
  XLSX.writeFile(book, `${fileStem}-${formatDateToISOString(new Date())}.xlsx`);
}

/** A file name from a company name: `jivo-wellness`. */
export function slug(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The overdue buckets as the server names them, for when its list is not to hand. */
export const BUCKET_LABEL: Record<BucketKey, string> = {
  not_due: 'Not yet due',
  d0_30: '1-30 days',
  d31_60: '31-60 days',
  d61_90: '61-90 days',
  d91_180: '91-180 days',
  d180: 'Over 180 days',
};

export const BUCKET_KEYS = Object.keys(BUCKET_LABEL) as BucketKey[];

export function isBucket(value: string | null | undefined): value is BucketKey {
  return !!value && value in BUCKET_LABEL;
}

/** A share as a whole percentage, or blank when there is nothing to share. */
export function percent(part: number, whole: number): string {
  if (!whole) return '';
  return `${Math.round((part / whole) * 100)}%`;
}
