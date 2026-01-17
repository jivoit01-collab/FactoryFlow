export const APP_NAME = 'Factory Flow'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'Factory Management System for Jivo Wellness'

export const APP_DEFAULTS = {
  language: 'en',
  theme: 'system' as const,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'HH:mm',
  timezone: 'Asia/Kolkata',
} as const

export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

export type Theme = (typeof THEME_OPTIONS)[keyof typeof THEME_OPTIONS]
