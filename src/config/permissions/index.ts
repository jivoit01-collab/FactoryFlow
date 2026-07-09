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

// Admin Module
export { ADMIN_MODULE_PREFIX, ADMIN_PERMISSIONS, type AdminPermission } from './admin.permissions';

// Gate Module
export { GATE_MODULE_PREFIX, GATE_PERMISSIONS, type GatePermission } from './gate.permissions';

// Labour Module (standalone; backed by the `labour_gate` Django app)
export {
  LABOUR_MODULE_PREFIX,
  LABOUR_PERMISSIONS,
  type LabourPermission,
} from './labour.permissions';

// Quality Control Module
export { QC_MODULE_PREFIX, QC_PERMISSIONS, type QCPermission } from './qc.permissions';

// GRPO Module
export { GRPO_MODULE_PREFIX, GRPO_PERMISSIONS, type GRPOPermission } from './grpo.permissions';

// Production Module
export {
  EXECUTION_MODULE_PREFIX,
  EXECUTION_PERMISSIONS,
  type ExecutionPermission,
  PRODUCTION_MODULE_PREFIX,
  PRODUCTION_PERMISSIONS,
  type ProductionPermission,
} from './production.permissions';

// Dashboards Module
export {
  DASHBOARDS_MODULE_PREFIX,
  DASHBOARDS_PERMISSIONS,
  type DashboardsPermission,
} from './dashboards.permissions';

// Dispatch Module
export {
  DISPATCH_MODULE_PREFIX,
  DISPATCH_PERMISSIONS,
  type DispatchPermission,
} from './dispatch.permissions';

// Notifications Module
export {
  NOTIFICATION_MODULE_PREFIX,
  NOTIFICATION_PERMISSIONS,
  type NotificationDjangoPermission,
} from './notification.permissions';

// Warehouse Module
export {
  WAREHOUSE_MODULE_PREFIX,
  WAREHOUSE_PERMISSIONS,
  type WarehousePermission,
} from './warehouse.permissions';

// Vehicle Management Module
export {
  VEHICLE_MANAGEMENT_MODULE_PREFIX,
  VEHICLE_MANAGEMENT_PERMISSIONS,
  type VehicleManagementPermission,
} from './vehicle-management.permissions';

// Barcode Module
export {
  BARCODE_MODULE_PREFIX,
  BARCODE_PERMISSIONS,
  type BarcodePermission,
} from './barcode.permissions';

// Maintenance Module
export {
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
  type MaintenancePermission,
} from './maintenance.permissions';

// Returnable Items Module (department + gate stages of the returnable gate pass)
export {
  RETURNABLE_MODULE_PREFIX,
  RETURNABLE_PERMISSIONS,
  type ReturnablePermission,
} from './returnable.permissions';

// Warehouse Ops (WMS) Module
export {
  WMS_ACCESS,
  WMS_ADMIN_ACCESS,
  WMS_MODULE_PREFIX,
  WMS_PERMISSIONS,
  type WmsPermission,
} from './wms.permissions';
