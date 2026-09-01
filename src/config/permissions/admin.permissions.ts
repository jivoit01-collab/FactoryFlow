/**
 * Admin Module Permissions
 *
 * These constants map to Django permissions defined in the backend `docking_admin` app.
 * Format: 'app_label.permission_codename'
 */

export const ADMIN_PERMISSIONS = {
  DOCKING: {
    /** Operator can request to skip box scanning for a docking entry */
    REQUEST_SCAN_SKIP: 'docking_admin.can_request_docking_scan_skip',
    /** View docking scan skip requests (admin queue) */
    VIEW_SCAN_SKIP: 'docking_admin.can_view_docking_scan_skip',
    /** Approve or reject docking scan skip requests */
    APPROVE_SCAN_SKIP: 'docking_admin.can_approve_docking_scan_skip',
    /** Operator can request to dispatch with only some boxes scanned */
    REQUEST_PARTIAL_SCAN: 'docking_admin.can_request_docking_partial_scan',
    /** View docking partial-dispatch (partial scan) requests (admin queue) */
    VIEW_PARTIAL_SCAN: 'docking_admin.can_view_docking_partial_scan',
    /** Approve or reject docking partial-dispatch requests */
    APPROVE_PARTIAL_SCAN: 'docking_admin.can_approve_docking_partial_scan',
  },
} as const;

/** Module prefix for sidebar filtering */
export const ADMIN_MODULE_PREFIX = 'docking_admin';

/** Type for admin permission values (Django backend permissions). */
export type AdminPermission =
  (typeof ADMIN_PERMISSIONS.DOCKING)[keyof typeof ADMIN_PERMISSIONS.DOCKING];

/**
 * Cost Master permissions (backend `cost_master` app) — the central registry
 * of cost types and their factory/company/department/value-scoped rates.
 */
export const COST_MASTER_PERMISSIONS = {
  /** Read the cost catalog and rates (costing/report consumers). */
  VIEW: 'cost_master.can_view_cost_master',
  /** Define cost types and set rates. */
  MANAGE: 'cost_master.can_manage_cost_master',
} as const;

export type CostMasterPermission =
  (typeof COST_MASTER_PERMISSIONS)[keyof typeof COST_MASTER_PERMISSIONS];
