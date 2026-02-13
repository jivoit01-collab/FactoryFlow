import { APP_DEFAULTS } from '@/config/constants'

export function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const formatStr = format || APP_DEFAULTS.dateFormat

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  return formatStr.replace('DD', day).replace('MM', month).replace('YYYY', year.toString())
}

export function formatTime(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const formatStr = format || APP_DEFAULTS.timeFormat

  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')

  return formatStr.replace('HH', hours).replace('mm', minutes).replace('ss', seconds)
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * Formats a date/time for short display (e.g., "Jan 15, 10:30 AM").
 * Used commonly in dashboard lists and tables.
 *
 * @param dateTime - The date/time string or Date object
 * @returns Formatted string or '-' if input is empty/invalid
 */
export function formatDateTimeShort(dateTime?: string | Date | null): string {
  if (!dateTime) return '-'
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return typeof dateTime === 'string' ? dateTime : '-'
  }
}

/**
 * Formats a date/time for full display (e.g., "15 Jan 2024, 10:30 AM").
 * Used in detail views and forms.
 *
 * @param dateTime - The date/time string or Date object
 * @returns Formatted string or '-' if input is empty/invalid
 */
export function formatDateTimeFull(dateTime?: string | Date | null): string {
  if (!dateTime) return '-'
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return typeof dateTime === 'string' ? dateTime : '-'
  }
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDateToISOString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get a default date range (last 1 month from today).
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date()
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return {
    from: formatDateToISOString(oneMonthAgo),
    to: formatDateToISOString(today),
  }
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(value)
}
