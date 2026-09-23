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
  type AdminPermission,
  COST_MASTER_PERMISSIONS,
  type CostMasterPermission,
} from './admin.permissions';

// Attendance Module (punch-machine daily sheet + manual overrides)
export {
  ATTENDANCE_ACCESS,
  ATTENDANCE_MARK_ACCESS,
  ATTENDANCE_MODULE_PREFIX,
  ATTENDANCE_OVERRIDE_ACCESS,
  ATTENDANCE_PERMISSIONS,
  ATTENDANCE_SYNC_ACCESS,
  type AttendancePermission,
} from './attendance.permissions';

// Company Vehicles (the fleet the company owns — its fuel and service bills)
export {
  FLEET_ACCESS,
  FLEET_MODULE_PREFIX,
  FLEET_PERMISSIONS,
  type FleetPermission,
} from './fleet.permissions';

// Leave Module (apply / approve; routed down the employee_hierarchy tree)
export {
  LEAVE_ACCESS,
  LEAVE_APPLY_ACCESS,
  LEAVE_DECIDE_ACCESS,
  LEAVE_MANAGE_ACCESS,
  LEAVE_MODULE_PREFIX,
  LEAVE_PERMISSIONS,
  LEAVE_TEAM_ACCESS,
  type LeavePermission,
} from './leave.permissions';

// Construction Projects Module (the campus's own building work)
export {
  CONSTRUCTION_ACCESS,
  CONSTRUCTION_MODULE_PREFIX,
  CONSTRUCTION_PERMISSIONS,
  CONSTRUCTION_REVIEWER_ACCESS,
  type ConstructionPermission,
} from './construction.permissions';

// Gate Module
export { GATE_MODULE_PREFIX, GATE_PERMISSIONS, type GatePermission } from './gate.permissions';

// Labour Module (standalone; backed by the `labour_gate` Django app)
export {
  LABOUR_MODULE_PREFIX,
  LABOUR_PERMISSIONS,
  type LabourPermission,
} from './labour.permissions';

// Request Labour (Organisation module; backed by the `labour_request` Django app)
export {
  LABOUR_REQUEST_ACCESS,
  LABOUR_REQUEST_MODULE_PREFIX,
  LABOUR_REQUEST_PERMISSIONS,
  type LabourRequestPermission,
} from './labour-request.permissions';

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

// SAP Identity (which SAP B1 account each app user is, per company)
export {
  SAP_IDENTITY_MODULE_PREFIX,
  SAP_IDENTITY_PERMISSIONS,
  type SapIdentityPermission,
} from './sap-identity.permissions';

// SAP Reports Module (SAP Query Manager reports, run from the app)
export {
  SAP_REPORTS_ACCESS,
  SAP_REPORTS_MODULE_PREFIX,
  SAP_REPORTS_PERMISSIONS,
  type SapReportsPermission,
} from './sap-reports.permissions';

// Universal Search (one number, looked up across SAP and this app)
export {
  UNIVERSAL_SEARCH_ACCESS,
  UNIVERSAL_SEARCH_MODULE_PREFIX,
  UNIVERSAL_SEARCH_PERMISSIONS,
  type UniversalSearchPermission,
} from './universal-search.permissions';

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
export {
  BOARD_FEED_APP_LABEL,
  BOARD_FEED_PERMISSIONS,
  type BoardFeedPermission,
} from './board-feeds.permissions';
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

// Invoice Approval Module (SAP approval requests; nav lives under Warehouse)
export {
  INVOICE_APPROVAL_MODULE_PREFIX,
  INVOICE_APPROVAL_PERMISSIONS,
  type InvoiceApprovalPermission,
} from './invoice-approval.permissions';

// A/R Invoice Module (sales invoices against SOs; nav lives under Warehouse)
export {
  AR_INVOICE_MODULE_PREFIX,
  AR_INVOICE_PERMISSIONS,
  type ARInvoicePermission,
} from './ar-invoice.permissions';

// Short Dispatch Module (SAP Return Note for short-picked bills; nav under Warehouse)
export {
  SHORT_DISPATCH_ACCESS,
  SHORT_DISPATCH_MODULE_PREFIX,
  SHORT_DISPATCH_PERMISSIONS,
  type ShortDispatchPermission,
} from './short-dispatch.permissions';

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

// Artwork Module (label + carton artwork register)
export {
  ARTWORK_ACCESS,
  ARTWORK_MODULE_PREFIX,
  ARTWORK_PERMISSIONS,
  type ArtworkPermission,
} from './artwork.permissions';

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

// Issue Tracker (the software's own bug list)
export {
  ISSUE_ACCESS,
  ISSUE_CREATE_ACCESS,
  ISSUE_PERMISSIONS,
  ISSUE_SETTINGS_ACCESS,
  type IssuePermission,
  ISSUES_MODULE_PREFIX,
} from './issues.permissions';

// Employee Hierarchy & Compensation (the directory, the reporting tree, salary)
export {
  EMPLOYEE_ACCESS,
  EMPLOYEE_MODULE_PREFIX,
  EMPLOYEE_PERMISSIONS,
  EMPLOYEE_REPORTS_ACCESS,
  EMPLOYEE_STRUCTURE_ACCESS,
  type EmployeePermission,
  SALARY_ACCESS,
} from './employee-hierarchy.permissions';

// Department Ownership Chart (who owns each function, and who backs them up)
export {
  ORG_CHART_ACCESS,
  ORG_CHART_MODULE_PREFIX,
  ORG_CHART_PERMISSIONS,
  type OrgChartPermission,
} from './org-chart.permissions';

// Cash Book (the factory's cash box: money in, money out, bunches for approval)
export {
  CASH_BOOK_ACCESS,
  CASH_BOOK_APPROVALS_ACCESS,
  CASH_BOOK_MODULE_PREFIX,
  CASH_BOOK_PERMISSIONS,
  CASH_BOOK_SETTINGS_ACCESS,
  type CashBookPermission,
  SALARY_ADVANCE_ACCESS,
} from './cash-book.permissions';
