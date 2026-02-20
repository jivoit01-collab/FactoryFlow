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

// Gate Module
export { GATE_MODULE_PREFIX, GATE_PERMISSIONS, type GatePermission } from './gate.permissions';

// Quality Control Module
export { QC_MODULE_PREFIX, QC_PERMISSIONS, type QCPermission } from './qc.permissions';

// GRPO Module
export { GRPO_MODULE_PREFIX, GRPO_PERMISSIONS, type GRPOPermission } from './grpo.permissions';

// Notifications Module
export {
  NOTIFICATION_MODULE_PREFIX,
  NOTIFICATION_PERMISSIONS,
  type NotificationPermission,
} from './notification.permissions';
