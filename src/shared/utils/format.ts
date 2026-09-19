import { APP_DEFAULTS } from '@/config/constants';

export function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatStr = format || APP_DEFAULTS.dateFormat;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return formatStr.replace('DD', day).replace('MM', month).replace('YYYY', year.toString());
}

export function formatTime(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatStr = format || APP_DEFAULTS.timeFormat;

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');

  return formatStr.replace('HH', hours).replace('mm', minutes).replace('ss', seconds);
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * A date and time for a list or a table: `17-09-2026 14:05`.
 *
 * Was "Sep 17, 02:05 PM", which is an American way of writing a date in an
 * Indian factory, and left the year off entirely -- fine until a register
 * holds two years of it.
 */
export function formatDateTimeShort(dateTime?: string | Date | null): string {
  if (!dateTime) return '-';
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) return '-';
    return `${formatDate(date)} ${formatTime(date)}`;
  } catch {
    return typeof dateTime === 'string' ? dateTime : '-';
  }
}

/**
 * The same, spelled out for a detail view: `17-09-2026 14:05:33`.
 */
export function formatDateTimeFull(dateTime?: string | Date | null): string {
  if (!dateTime) return '-';
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) return '-';
    return `${formatDate(date)} ${formatTime(date, 'HH:mm:ss')}`;
  } catch {
    return typeof dateTime === 'string' ? dateTime : '-';
  }
}

/**
 * A day on its own, from whatever the server sent: `17-09-2026`.
 *
 * Built for the plain `YYYY-MM-DD` a date column arrives as, which is read
 * here rather than handed to `new Date` -- that would read it as UTC midnight
 * and show the day before to anybody east of Greenwich, which is everybody
 * using this.
 */
export function formatDay(value?: string | Date | null): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const iso = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return isNaN(date.getTime()) ? '-' : formatDate(date);
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a default date range (last 1 month from today).
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return {
    from: formatDateToISOString(oneMonthAgo),
    to: formatDateToISOString(today),
  };
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(value);
}
