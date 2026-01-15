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
