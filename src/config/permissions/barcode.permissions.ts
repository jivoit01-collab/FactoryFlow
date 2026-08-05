/**
 * Barcode Module Permissions
 *
 * Maps to Django permissions on barcode models.
 */

export const BARCODE_PERMISSIONS = {
  VIEW_PALLET: 'barcode.view_pallet',
  CREATE_PALLET: 'barcode.add_pallet',
  MANAGE_PALLET: 'barcode.change_pallet',
  VIEW_BOX: 'barcode.view_box',
  CREATE_BOX: 'barcode.add_box',
  MANAGE_BOX: 'barcode.change_box',
  EDIT_BOX_GENERATION_QTY: 'barcode.can_edit_box_generation_qty',
  VIEW_DISPATCH: 'barcode.can_view_barcode_dispatch',
  CREATE_DISPATCH: 'barcode.can_create_barcode_dispatch',
  SCAN_DISPATCH: 'barcode.can_scan_barcode_dispatch',
  COMPLETE_DISPATCH: 'barcode.can_complete_barcode_dispatch',
  CLOSE_DISPATCH: 'barcode.can_close_barcode_dispatch',
  RETRY_DISPATCH_SAP: 'barcode.can_retry_barcode_dispatch_sap',
  MANAGE_DISPATCH_SETTINGS: 'barcode.can_manage_barcode_dispatch_settings',
  VIEW_DISPATCH_REPORTS: 'barcode.can_view_barcode_dispatch_reports',
  VIEW_INTERCOMPANY_TRANSFER: 'barcode.can_view_intercompany_transfer',
  CREATE_INTERCOMPANY_TRANSFER: 'barcode.can_create_intercompany_transfer',
  SCAN_INTERCOMPANY_TRANSFER: 'barcode.can_scan_intercompany_transfer',
  REVERSE_INTERCOMPANY_TRANSFER: 'barcode.can_reverse_intercompany_transfer',
  MANAGE_INTERCOMPANY_TRANSFER_SETTINGS: 'barcode.can_manage_intercompany_transfer_settings',
} as const;

export const BARCODE_MODULE_PREFIX = 'barcode';

export type BarcodePermission = (typeof BARCODE_PERMISSIONS)[keyof typeof BARCODE_PERMISSIONS];
