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
  /**
   * Raise A/R invoices from open Sales Orders — on top of CREATE, so the
   * counter raising cash sales does not get the "From Sales Order" tab.
   */
  CREATE_FROM_SALES_ORDER: 'ar_invoice.create_ar_invoice_from_sales_order',
  /**
   * Record whether a bill's money has come in. Held apart from CREATE so
   * accounts can mark receipts without also gaining the power to raise
   * invoices.
   */
  MARK_PAYMENT: 'ar_invoice.mark_ar_invoice_payment',
  /**
   * Open any customer's ledger. Without it the Ledger tab offers only the SAP
   * customers linked to the user (Admin › Customer Ledger Links).
   */
  VIEW_ALL_LEDGERS: 'ar_invoice.view_all_customer_ledgers',
  /** Link users to their SAP customer accounts (Admin › Customer Ledger Links). */
  MANAGE_LEDGER_LINKS: 'ar_invoice.manage_customer_ledger_links',
} as const;

/** Module prefix used by the permission system */
export const AR_INVOICE_MODULE_PREFIX = 'ar_invoice';

/**
 * Type for ar-invoice permission values
 */
export type ARInvoicePermission =
  (typeof AR_INVOICE_PERMISSIONS)[keyof typeof AR_INVOICE_PERMISSIONS];
