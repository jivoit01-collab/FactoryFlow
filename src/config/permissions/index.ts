/**
 * Centralized Permission Constants
 *
 * All module permissions are exported from here.
 * This provides a single source of truth for permission strings
 * and enables easy auditing and management.
 *
 * Usage:
 * import { QC_PERMISSIONS } from '@/config/permissions'
 */

// Quality Control Module
export { QC_PERMISSIONS, QC_MODULE_PREFIX, type QCPermission } from './qc.permissions'

// GRPO Module
export { GRPO_PERMISSIONS, GRPO_MODULE_PREFIX, type GRPOPermission } from './grpo.permissions'

// Notifications Module
export {
  NOTIFICATION_PERMISSIONS,
  NOTIFICATION_MODULE_PREFIX,
  type NotificationPermission,
} from './notification.permissions'
