/**
 * Invoice Approval Module Permissions
 *
 * These constants map to Django permissions defined in the backend
 * `invoice_approval` app (SAP approval requests on A/R invoice drafts,
 * read and decided directly in SAP).
 */

export const INVOICE_APPROVAL_PERMISSIONS = {
  /** View invoices awaiting approval in the approval page */
  VIEW_INVOICE: 'invoice_approval.view_invoice',
  /** Approve or reject invoices */
  APPROVE_INVOICE: 'invoice_approval.approve_invoice',
} as const;

/** Module prefix used by the permission system */
export const INVOICE_APPROVAL_MODULE_PREFIX = 'invoice_approval';

/**
 * Type for invoice-approval permission values
 */
export type InvoiceApprovalPermission =
  (typeof INVOICE_APPROVAL_PERMISSIONS)[keyof typeof INVOICE_APPROVAL_PERMISSIONS];
