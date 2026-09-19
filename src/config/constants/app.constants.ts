export const APP_NAME = 'Jivo Info';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Jivo Info - Management System for Jivo Wellness';

export const APP_DEFAULTS = {
  language: 'en',
  theme: 'light' as const,
  // dd-mm-yyyy throughout. Slashes read as ambiguous to anybody who has
  // ever met an American date; the dashes are the house style.
  dateFormat: 'DD-MM-YYYY',
  timeFormat: 'HH:mm',
  timezone: 'Asia/Kolkata',
} as const;

export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof THEME_OPTIONS)[keyof typeof THEME_OPTIONS];
