/**
 * Warehouse Module Permissions
 *
 * These constants map to Django permissions defined in warehouse/models.py.
 * Format: 'app_label.permission_codename'
 */

export const WAREHOUSE_PERMISSIONS = {
  /** View warehouse dashboard */
  VIEW_DASHBOARD: 'warehouse.can_view_warehouse_dashboard',
  /** View inventory */
  VIEW_INVENTORY: 'warehouse.can_view_inventory',
  /** View inward receipts */
  VIEW_INWARD: 'warehouse.can_view_inward',
  /** Execute inward putaway */
  EXECUTE_INWARD: 'warehouse.can_execute_inward',
  /** View stock transfers */
  VIEW_TRANSFERS: 'warehouse.can_view_transfers',
  /** Request stock transfer */
  REQUEST_TRANSFER: 'warehouse.can_request_transfer',
  /** Approve stock transfer */
  APPROVE_TRANSFER: 'warehouse.can_approve_transfer',
  /** View goods issues */
  VIEW_GOODS_ISSUE: 'warehouse.can_view_goods_issue',
  /** View pick lists */
  VIEW_PICKING: 'warehouse.can_view_picking',
  /** Execute picking */
  EXECUTE_PICKING: 'warehouse.can_execute_picking',
  /** View dispatch tracking */
  VIEW_DISPATCH_TRACKING: 'warehouse.can_view_dispatch_tracking',
  /** View returns */
  VIEW_RETURNS: 'warehouse.can_view_returns',
  /** View stock counts */
  VIEW_STOCK_COUNT: 'warehouse.can_view_stock_count',
  /** View daily audits */
  VIEW_AUDIT: 'warehouse.can_view_audit',
  /** View non-moving report */
  VIEW_NON_MOVING: 'warehouse.can_view_non_moving',
  /** View capacity limits */
  VIEW_CAPACITY_LIMITS: 'warehouse.can_view_capacity_limits',
} as const;

/** Module prefix for sidebar filtering */
export const WAREHOUSE_MODULE_PREFIX = 'warehouse';

/**
 * Type for warehouse permission values
 */
export type WarehousePermission =
  (typeof WAREHOUSE_PERMISSIONS)[keyof typeof WAREHOUSE_PERMISSIONS];
