/**
 * Warehouse Module Permissions
 *
 * These constants map to Django permissions on the warehouse models.
 * For now we reuse production_execution permissions since warehouse
 * is closely tied to the production workflow. Adjust as your backend
 * permission model evolves.
 */

export const WAREHOUSE_PERMISSIONS = {
  /** View BOM requests */
  VIEW_BOM_REQUEST: 'production_execution.can_view_production_run',
  /** Create / submit BOM requests */
  CREATE_BOM_REQUEST: 'production_execution.can_create_production_run',
  /** Approve or reject BOM requests (warehouse role) */
  APPROVE_BOM_REQUEST: 'production_execution.can_view_material_usage',
  /** Issue materials to SAP */
  ISSUE_MATERIALS: 'production_execution.can_create_material_usage',
  /** View finished goods receipts */
  VIEW_FG_RECEIPT: 'production_execution.can_view_production_run',
  /** Create / receive finished goods */
  RECEIVE_FG: 'production_execution.can_complete_production_run',
} as const;

export const WAREHOUSE_MODULE_PREFIX = 'production_execution';

export type WarehousePermission =
  (typeof WAREHOUSE_PERMISSIONS)[keyof typeof WAREHOUSE_PERMISSIONS];
