/**
 * Activity Center Permissions
 *
 * Maps to the Django permissions defined on the backend `activity_center` app.
 * Format: 'app_label.permission_codename'
 *
 * VIEW_MY is self-scoped — the backend always reads the authenticated user, so this
 * permission can never expose another person's work. VIEW_ALL is the supervisor
 * escalation and is what unlocks the team screens.
 */

export const ACTIVITY_PERMISSIONS = {
  /** See your own pending and completed jobs */
  VIEW_MY: 'activity_center.can_view_my_activities',
  /** See every user's pending and completed jobs */
  VIEW_ALL: 'activity_center.can_view_all_activities',
  /** See activity completion reporting */
  VIEW_REPORTS: 'activity_center.can_view_activity_reports',
} as const;

/** Module prefix for sidebar filtering */
export const ACTIVITY_MODULE_PREFIX = 'activity_center';

export type ActivityPermission =
  (typeof ACTIVITY_PERMISSIONS)[keyof typeof ACTIVITY_PERMISSIONS];
