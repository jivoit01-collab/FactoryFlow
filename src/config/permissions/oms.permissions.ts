/**
 * OMS Invoice Approval Module Permissions
 *
 * These constants map to Django permissions defined in the backend `oms` app
 * (proxy to the external OMS invoice-approval service).
 * Format: 'app_label.permission_codename'
 */

export const OMS_PERMISSIONS = {
  /** View OMS invoices in the approval page */
  VIEW_INVOICE: 'oms.view_invoice',
  /** Approve or reject OMS invoices */
  APPROVE_INVOICE: 'oms.approve_invoice',
} as const;

/** Module prefix for sidebar filtering */
export const OMS_MODULE_PREFIX = 'oms';

/**
 * Type for OMS permission values
 */
export type OmsPermission = (typeof OMS_PERMISSIONS)[keyof typeof OMS_PERMISSIONS];
