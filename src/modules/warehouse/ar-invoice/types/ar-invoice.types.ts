/**
 * Types for the A/R Invoice feature.
 *
 * A billing operator raises a sales invoice against a customer's open Sales
 * Order lines; the backend posts it to SAP where the approval procedure
 * usually holds it as an ObjType-13 draft — the same drafts the warehouse
 * Invoice Approval page decides. `ARInvoicePosting` is our local record
 * tracking that lifecycle.
 */

/** Lifecycle of a locally raised A/R invoice. */
export type ARInvoiceStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'POSTED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface Customer {
  customer_code: string;
  customer_name: string;
}

/** One open (invoiceable) Sales Order line, straight from SAP. */
export interface OpenSOLine {
  so_doc_entry: number;
  so_doc_num: number | null;
  so_doc_date: string | null;
  so_customer_ref: string;
  so_comments: string;
  branch_id: number | null;
  customer_name: string;
  line_num: number;
  item_code: string;
  description: string;
  /** The open quantity — what the invoice will carry. */
  open_qty: number;
  price: number;
  /** Pre-tax open row total (tax is added by SAP at posting). */
  open_total: number;
  tax_code: string;
  warehouse_code: string;
  uom: string;
}

export interface ARInvoiceLine {
  id: number;
  base_entry: number;
  base_line: number;
  base_doc_num: number | null;
  item_code: string;
  description: string;
  quantity: string | null;
  price: string | null;
  line_total: string;
  tax_code: string;
  warehouse_code: string;
}

export interface ARInvoiceAttachment {
  id: number;
  original_filename: string;
  sap_attachment_status: string;
  sap_absolute_entry: number | null;
  sap_error_message: string | null;
  uploaded_at: string;
  file_url: string | null;
}

export interface ARInvoicePosting {
  id: number;
  customer_code: string;
  customer_name: string;
  customer_ref: string;
  doc_date: string | null;
  doc_due_date: string | null;
  tax_date: string | null;
  selected_total: string | null;
  branch_id: number;
  comments: string;
  status: ARInvoiceStatus;
  status_display: string;
  error_message: string | null;
  sap_draft_entry: number | null;
  sap_approval_code: number | null;
  approval_remarks: string;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: string | null;
  posted_at: string | null;
  created_at: string;
  created_by_name: string | null;
  posted_by_name: string | null;
  lines: ARInvoiceLine[];
  attachments: ARInvoiceAttachment[];
}

/** An item held in one warehouse — the direct-sale item picker's rows. */
export interface WarehouseStockItem {
  item_code: string;
  item_name: string;
  on_hand: number;
  available: number;
  uom: string;
  [key: string]: unknown;
}

/** Prefill for a direct-sale line: what this customer last paid for the item. */
export interface LineDefaults {
  price?: number | null;
  tax_code?: string;
}

/** A free line of a direct (cash/counter) sale being composed. */
export interface DirectSaleLine {
  item_code: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_code: string;
  warehouse_code: string;
}

/** JSON part of the create body (optional files travel as `attachments`).
 * Exactly one of `lines` (SO references) / `direct_lines` (cash sale). */
export interface CreateARInvoiceRequest {
  customer_code: string;
  lines?: { so_doc_entry: number; line_num: number }[];
  direct_lines?: DirectSaleLine[];
  customer_ref?: string;
  doc_date?: string;
  doc_due_date?: string;
  tax_date?: string;
  comments?: string;
}

// ============================================================================
// TAX INVOICE print — SAP's own layout, as data
// ============================================================================

/**
 * Money and quantities arrive as strings, not numbers: SAP keeps six decimal
 * places and a JSON number would round the taxable value before the sheet ever
 * formats it.
 */
export interface ARInvoicePrintLine {
  line_num: number;
  item_code: string;
  description: string;
  batch_no: string;
  hsn: string;
  warehouse_code: string;
  quantity: string;
  boxes: number;
  loose_qty: string;
  loose_uom: string;
  rate_per_bottle: string;
  discount_pct: string;
  net_rate_per_bottle: string;
  taxable_value: string;
  category: string;
  litres: string;
  gross_weight: string;
}

/** One side of the bill. `address` is pre-joined by SAP's own formatting. */
export interface ARInvoicePrintParty {
  name: string;
  address: string;
  gstin: string;
  state_name: string;
  state_code: string;
}

export interface ARInvoicePrintPayload {
  posting_id: number;
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  due_date: string | null;
  dispatch_date: string | null;
  customer_code: string;
  customer_name: string;
  customer_ref: string;
  customer_fssai: string;
  comments: string;
  currency: string;
  branch_id: number | null;
  /** The strip above the barcode: "<code> - <trade> - <state group>". */
  trade: string;
  state_group: string;
  payment_terms: string;
  contact_name: string;
  contact_mobile: string;
  contact_email: string;
  vehicle_no: string;
  way_bill_no: string;
  reverse_charge: string;
  place_of_supply: string;
  company: {
    gstin: string;
    pan: string;
    address: string;
    state_name: string;
    state_code: string;
    fssai_no: string;
  };
  bill_to: ARInvoicePrintParty;
  ship_to: ARInvoicePrintParty;
  irn: string;
  ack_no: string;
  ack_date: string | null;
  lines: ARInvoicePrintLine[];
  tax_summary: { label: string; amount: string }[];
  hsn_summary: { hsn: string; taxable_value: string; tax_rate: string; total_tax: string }[];
  category_summary: { category: string; litres: string; gross_weight: string }[];
  totals: {
    taxable_value: string;
    discount: string;
    round_off: string;
    total: string;
    tcs: string;
    grand_total: string;
    boxes: number;
    loose_qty: string;
    loose_uom: string;
    quantity: string;
    litres: string;
    gross_weight: string;
  };
}
