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
} as const

/** Module prefix for sidebar filtering */
export const NOTIFICATION_MODULE_PREFIX = 'notifications'

/**
 * Type for notification permission values
 */
export type NotificationPermission =
  (typeof NOTIFICATION_PERMISSIONS)[keyof typeof NOTIFICATION_PERMISSIONS]
