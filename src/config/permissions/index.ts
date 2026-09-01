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
export {
  ADMIN_MODULE_PREFIX,
  ADMIN_PERMISSIONS,
  COST_MASTER_PERMISSIONS,
  type AdminPermission,
  type CostMasterPermission,
} from './admin.permissions';

// Daily Tasks Module (per-user daily job sheet, derived from every other module)
export {
  DAILY_TASKS_MODULE_PREFIX,
  DAILY_TASKS_PERMISSIONS,
  type DailyTasksPermission,
} from './daily-tasks.permissions';

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

// Goods Return Module
export {
  GOODS_RETURN_ACCESS,
  GOODS_RETURN_MODULE_PREFIX,
  GOODS_RETURN_PERMISSIONS,
  type GoodsReturnPermission,
} from './goods-return.permissions';

// SAP Reports Module (SAP Query Manager reports, run from the app)
export {
  SAP_REPORTS_ACCESS,
  SAP_REPORTS_MODULE_PREFIX,
  SAP_REPORTS_PERMISSIONS,
  type SapReportsPermission,
} from './sap-reports.permissions';

// Production Module
export {
  BLOWING_MODULE_PREFIX,
  BLOWING_PERMISSIONS,
  type BlowingPermission,
  EXECUTION_MODULE_PREFIX,
  EXECUTION_PERMISSIONS,
  type ExecutionPermission,
  PRODUCTION_MODULE_PREFIX,
  PRODUCTION_PERMISSIONS,
  type ProductionPermission,
} from './production.permissions';

// Planning & Purchase Module
export {
  PLANNING_PURCHASE_ACCESS,
  PLANNING_PURCHASE_MODULE_PREFIX,
  PLANNING_PURCHASE_PERMISSIONS,
  type PlanningPurchasePermission,
} from './planning-purchase.permissions';

// Dashboards Module
export { DASHBOARDS_PERMISSIONS, type DashboardsPermission } from './dashboards.permissions';

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

// OMS Invoice Approval Module (external OMS proxy; nav lives under Warehouse)
export { OMS_MODULE_PREFIX, OMS_PERMISSIONS, type OmsPermission } from './oms.permissions';

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
  DAILY_ELECTRICITY_ACCESS_PERMISSIONS,
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
  type MaintenancePermission,
} from './maintenance.permissions';

// ETP / STP Module (effluent + sewage treatment plant registers)
export {
  ETP_ACCESS,
  ETP_BACKWASH_ACCESS,
  ETP_CALIBRATION_ACCESS,
  ETP_CHEMICAL_ACCESS,
  ETP_DAILY_LOG_ACCESS,
  ETP_MODULE_PREFIX,
  ETP_MONITORING_ACCESS,
  ETP_PERMISSIONS,
  ETP_SLUDGE_ACCESS,
  type EtpPermission,
} from './etp.permissions';

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

// Marketplace (Flipkart/Amazon) Module
export {
  MARKETPLACE_ACCESS,
  MARKETPLACE_ADMIN_ACCESS,
  MARKETPLACE_COMPANIES,
  MARKETPLACE_GATE_ACCESS,
  MARKETPLACE_ISSUE_ACCESS,
  MARKETPLACE_MODULE_PREFIX,
  MARKETPLACE_PACKING_ACCESS,
  MARKETPLACE_PERMISSIONS,
  MARKETPLACE_SHEET_ACCESS,
  type MarketplacePermission,
} from './marketplace.permissions';
