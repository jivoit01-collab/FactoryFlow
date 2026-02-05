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

// Future modules can be exported here:
// export { GATE_PERMISSIONS } from './gate.permissions'
// export { INVENTORY_PERMISSIONS } from './inventory.permissions'
