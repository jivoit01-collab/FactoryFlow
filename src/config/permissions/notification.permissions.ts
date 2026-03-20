/**
 * Notification Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 */

export const NOTIFICATION_PERMISSIONS = {
  /** Send notifications to specific users or broadcast to company */
  SEND: 'notifications.can_send_notification',
  /** Send bulk notifications by permission or group */
  SEND_BULK: 'notifications.can_send_bulk_notification',
} as const;

/** Module prefix for sidebar filtering */
export const NOTIFICATION_MODULE_PREFIX = 'notifications';

/**
 * Type for notification permission values (Django backend permissions).
 * Named with "Django" prefix to avoid collision with the browser's
 * global NotificationPermission type ('default' | 'granted' | 'denied').
 */
export type NotificationDjangoPermission =
  (typeof NOTIFICATION_PERMISSIONS)[keyof typeof NOTIFICATION_PERMISSIONS];
