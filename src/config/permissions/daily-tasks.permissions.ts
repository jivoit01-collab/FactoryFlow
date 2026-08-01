/**
 * Daily Tasks Permissions
 *
 * Maps to the Django permissions defined on the backend `activity_center` app.
 * Format: 'app_label.permission_codename'
 *
 * VIEW_MY is self-scoped — the backend always reads the authenticated user, so it can
 * never expose someone else's sheet and is safe to grant broadly.
 * VIEW_ALL unlocks the supervisor board for today.
 * VIEW_REPORTS additionally unlocks earlier days on that board: looking at one live day
 * is supervision, trawling history is reporting.
 */

export const DAILY_TASKS_PERMISSIONS = {
  /** See your own daily task sheet */
  VIEW_MY: 'activity_center.can_view_my_activities',
  /** See every user's sheet for today */
  VIEW_ALL: 'activity_center.can_view_all_activities',
  /** Step the supervisor board back to earlier days */
  VIEW_REPORTS: 'activity_center.can_view_activity_reports',
} as const;

/** Module prefix for sidebar filtering */
export const DAILY_TASKS_MODULE_PREFIX = 'activity_center';

export type DailyTasksPermission =
  (typeof DAILY_TASKS_PERMISSIONS)[keyof typeof DAILY_TASKS_PERMISSIONS];
