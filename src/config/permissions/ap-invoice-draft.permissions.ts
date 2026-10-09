/**
 * A/P Invoice Draft Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on the backend
 * `ap_invoice_draft.APInvoiceDraft` model. The module puts a vendor's bill into
 * SAP as an A/P invoice draft against its GRPO and audits it; its nav lives under
 * Warehouse.
 *
 * CREATE writes the draft into SAP (a draft books nothing; accounts adds it).
 * REVIEW marks a check OK or Not OK over what the app found — the signature on
 * the Rate Check stamp, a QC record kept on paper.
 */

export const AP_INVOICE_DRAFT_PERMISSIONS = {
  /** View / list entries — gates the page */
  VIEW: 'ap_invoice_draft.can_view_ap_invoice_draft',
  /** Make an entry, which writes the A/P invoice draft into SAP */
  CREATE: 'ap_invoice_draft.can_create_ap_invoice_draft',
  /** Mark a check OK or Not OK */
  REVIEW: 'ap_invoice_draft.can_review_ap_invoice_draft',
} as const;

export const AP_INVOICE_DRAFT_MODULE_PREFIX = 'ap_invoice_draft';

/** Any permission that should reveal the page. */
export const AP_INVOICE_DRAFT_ACCESS: readonly string[] = [
  AP_INVOICE_DRAFT_PERMISSIONS.VIEW,
  AP_INVOICE_DRAFT_PERMISSIONS.CREATE,
  AP_INVOICE_DRAFT_PERMISSIONS.REVIEW,
];

export type APInvoiceDraftPermission =
  (typeof AP_INVOICE_DRAFT_PERMISSIONS)[keyof typeof AP_INVOICE_DRAFT_PERMISSIONS];
