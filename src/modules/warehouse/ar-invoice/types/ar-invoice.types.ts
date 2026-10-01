/**
 * Types for the A/R Invoice feature.
 *
 * A billing operator raises a sales invoice against a customer's open Sales
 * Order lines, or as a free cash sale. Anyone may bill from any warehouse, but
 * a line from a warehouse the operator does not manage holds the bill in the
 * app (`AWAITING_MANAGER`) until that warehouse's manager approves it on the
 * Invoice Approval page; only then does the backend post it to SAP.
 * `ARInvoicePosting` is our local record tracking that lifecycle.
 */

/** Lifecycle of a locally raised A/R invoice. */
export type ARInvoiceStatus =
  | 'PENDING'
  /** Held in the app for a warehouse manager — nothing is in SAP yet. */
  | 'AWAITING_MANAGER'
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

/**
 * A customer's credit position, read live from SAP's OCRD.
 *
 * The same four numbers SAP's own Account Balance panel shows on a sales
 * document. `exposure` is `balance + open_orders + open_deliveries` — the total
 * SAP's credit check weighs against the limit — and both it and `available` are
 * computed on the server so the screen and the log cannot disagree.
 *
 * `credit_limit` of 0 means NO LIMIT IS SET, not a zero limit, and most of the
 * master is in that state. Branch on `has_credit_limit`: rendering an unset
 * limit as a currency-formatted 0 reads as "blocked" on a customer SAP invoices
 * happily. `available` is null in that case for the same reason.
 */
export interface CustomerCredit {
  customer_code: string;
  customer_name: string;
  credit_limit: number;
  has_credit_limit: boolean;
  /** Posted, unpaid A/R (OCRD.Balance). */
  balance: number;
  /** Ordered, not yet delivered (OCRD.OrdersBal). */
  open_orders: number;
  /** Delivered, not yet invoiced (OCRD.DNotesBal). */
  open_deliveries: number;
  exposure: number;
  /** `credit_limit - exposure`, or null when no limit is set. */
  available: number | null;
  over_limit: boolean;
  is_active: boolean;
  is_frozen: boolean;
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

/**
 * Whether an invoice has actually been paid, as this app records it.
 *
 * Deliberately the app's own book rather than SAP's: SAP calls an invoice
 * "closed" only once accounts apply an incoming payment against it, which for a
 * counter cash sale can be days after the cash was taken.
 */
export type ARPaymentStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export type ARPaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'CARD' | 'OTHER';

/**
 * What the History screens colour and filter on.
 *
 * Coarser than the status: an untracked bill and one explicitly marked
 * PENDING both land in UNPAID, because a bill nobody has looked at is not a
 * paid one.
 */
export type PaymentBucket = 'UNPAID' | 'PARTIAL' | 'RECEIVED';

/** One invoice's payment mark. Absent (`null`) means untracked. */
export interface ARInvoicePayment {
  id: number;
  /** SAP's DocEntry — the key both History books share. */
  sap_doc_entry: number;
  sap_doc_num: number | null;
  /** This app's record, when it raised the bill; null for the counter's. */
  ar_invoice: number | null;
  status: ARPaymentStatus;
  status_display: string;
  received_on: string | null;
  amount: string | null;
  mode: ARPaymentMode | '';
  mode_display: string;
  reference: string;
  remarks: string;
  marked_by_name: string | null;
  updated_at: string;
}

/** Body of the mark-payment call. */
export interface MarkARPaymentRequest {
  status: ARPaymentStatus;
  received_on?: string | null;
  amount?: string | null;
  mode?: ARPaymentMode | '';
  reference?: string;
  remarks?: string;
}

/**
 * One warehouse's say on a bill raised by someone who does not manage it. A
 * bill spanning two such warehouses carries two, and goes to SAP when both
 * are approved.
 */
export interface ARInvoiceWarehouseApproval {
  id: number;
  warehouse_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_display: string;
  decided_by_name: string | null;
  decided_at: string | null;
  remarks: string;
  /** Who can approve a still-pending one — the warehouse's approving managers. */
  approvers: string[];
}

export interface ARInvoicePosting {
  id: number;
  customer_code: string;
  customer_name: string;
  customer_ref: string;
  doc_date: string | null;
  doc_due_date: string | null;
  tax_date: string | null;
  /** Counter sales only — the day the goods leave, which is the day they are
   * billed. Null on an invoice raised against a Sales Order. */
  dispatch_date: string | null;
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
  /** The payment mark, or null while the bill is untracked. */
  payment: ARInvoicePayment | null;
  /** Empty unless the bill was raised from a warehouse its raiser does not manage. */
  warehouse_approvals: ARInvoiceWarehouseApproval[];
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

/** One past A/R invoice line for an item, as the price guide shows it. */
export interface PastSale {
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  customer_code: string;
  customer_name: string;
  quantity: number;
  /** Pre-tax unit price. */
  price: number | null;
  /** Unit price including tax, as SAP worked it out on the bill. */
  price_incl_tax: number | null;
  tax_code: string;
  warehouse_code: string;
}

/** The item's price on the customer's SAP price list. */
export interface PriceListPrice {
  list_num: number;
  list_name: string;
  /** As the list holds it — including tax when `includes_tax`. */
  price: number;
  includes_tax: boolean;
  /** Pre-tax; null when the list includes tax and there is no tax code to take off. */
  net_price: number | null;
}

/**
 * Prefill for a direct-sale line and what it came from: the customer's price
 * list, else their last bill for the item. `recent` is the item's latest bills
 * to anyone, so the going rate is visible next to the prefill.
 */
export interface LineDefaults {
  price?: number | null;
  tax_code?: string;
  source?: 'price_list' | 'last_sale' | null;
  price_list?: PriceListPrice | null;
  last_sale?: PastSale | null;
  recent?: PastSale[];
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
  /** Cash sale only: stamped on the SAP invoice and used for the bill summary
   * the posting raises. Defaults to the invoice's own date. */
  dispatch_date?: string;
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
  /** This app's record — null for a cash sale the counter raised in SAP itself. */
  posting_id: number | null;
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

/** One line of a cash-sale invoice as SAP holds it (INV1). */
export interface SapCashSaleLine {
  line_num: number;
  item_code: string;
  description: string;
  quantity: number;
  price: number;
  line_total: number;
  tax_code: string;
  warehouse_code: string;
  uom: string;
  cost_center: string;
}

/**
 * One posted cash-sale invoice, read live from SAP.
 *
 * The counter raises cash sales in SAP directly as well as through this app, so
 * History reads SAP's own book back. `app_posting_id` is set only on the rows
 * this app raised (matched on DocEntry) — everything else came straight from
 * SAP, keyed by whoever `sap_user` names.
 */
export interface SapCashSaleInvoice {
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  doc_due_date: string | null;
  tax_date: string | null;
  created_date: string | null;
  customer_code: string;
  customer_name: string;
  customer_ref: string;
  comments: string;
  doc_total: number;
  tax_total: number;
  paid_to_date: number;
  /** 'O' open, 'C' closed — open until a receipt is applied, not "unpaid". */
  doc_status: string;
  is_cancelled: boolean;
  branch_id: number | null;
  branch_name: string;
  /** The SAP user who keyed it in, blank for invoices posted by this app. */
  sap_user: string;
  draft_entry: number | null;
  lines: SapCashSaleLine[];
  app_posting_id: number | null;
  /**
   * This app's payment mark for the bill, which SAP knows nothing about. Joined
   * on DocEntry — the counter's invoices have no other key here.
   */
  payment: ARInvoicePayment | null;
}

/** The SAP cash-sale history, with the window it was actually read over. */
export interface SapCashSaleHistory {
  date_from: string;
  date_to: string;
  count: number;
  /** The window holds more invoices than the cap returned. */
  truncated: boolean;
  invoices: SapCashSaleInvoice[];
}

export interface SapCashSaleQuery {
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}
