/**
 * A/R Invoice Module Permissions
 *
 * These constants map to Django permissions defined in the backend `ar_invoice`
 * app (sales invoices raised against open Sales Order lines and posted to SAP,
 * usually via SAP's approval procedure — approved on the warehouse Invoice
 * Approval page).
 */

export const AR_INVOICE_PERMISSIONS = {
  /** View A/R invoice submissions and their SAP/approval state */
  VIEW: 'ar_invoice.view_ar_invoice_posting',
  /** Create A/R invoices and post them (and their approved drafts) to SAP */
  CREATE: 'ar_invoice.create_ar_invoice_posting',
} as const;

/** Module prefix used by the permission system */
export const AR_INVOICE_MODULE_PREFIX = 'ar_invoice';

/**
 * Type for ar-invoice permission values
 */
export type ARInvoicePermission =
  (typeof AR_INVOICE_PERMISSIONS)[keyof typeof AR_INVOICE_PERMISSIONS];
