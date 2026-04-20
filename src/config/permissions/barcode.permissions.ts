/**
 * Barcode Module Permissions
 *
 * Maps to Django permissions on barcode models.
 * Uses production_execution permissions initially since barcode
 * is tightly integrated with the production workflow.
 */

export const BARCODE_PERMISSIONS = {
  VIEW_PALLET: 'production_execution.can_view_production_run',
  CREATE_PALLET: 'production_execution.can_create_production_run',
  MANAGE_PALLET: 'production_execution.can_view_material_usage',
  VIEW_BOX: 'production_execution.can_view_production_run',
  CREATE_BOX: 'production_execution.can_create_production_run',
  MANAGE_BOX: 'production_execution.can_view_material_usage',
} as const;

export const BARCODE_MODULE_PREFIX = 'production_execution';

export type BarcodePermission =
  (typeof BARCODE_PERMISSIONS)[keyof typeof BARCODE_PERMISSIONS];
