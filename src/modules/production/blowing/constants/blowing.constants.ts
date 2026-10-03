import type { BlowingRunStatus } from '../types';

export const RUN_STATUS_LABELS: Record<BlowingRunStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const RUN_STATUS_BADGE: Record<BlowingRunStatus, string> = {
  DRAFT: 'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  COMPLETED: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
};

/**
 * Shift-sheet endpoints. Kept beside the module rather than in API_ENDPOINTS so
 * the page ships without touching the shared constants file.
 */
export const SHIFT_SHEET_ENDPOINTS = {
  PLAN: '/blowing/shift-sheet/',
  PARSE: '/blowing/shift-sheet/parse/',
} as const;

export const SHIFT_LABELS = { DAY: 'Day', NIGHT: 'Night' } as const;
