/**
 * Types for the Factory Invoice Approval feature.
 *
 * Head-office billing raises A/R invoices in SAP; the approval procedure holds
 * each one as a draft with a pending approval request. Our backend reads those
 * requests straight from SAP (`/invoice-approvals/…`) and records the decision
 * back through the SAP Service Layer. `InvoiceLog.id` is the SAP approval-request
 * code (OWDD.WddCode).
 */

/** An approval request is pending, approved, or rejected — also the page tabs. */
export type InvoiceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Statuses shown as tabs on the approval page, in order. */
export const INVOICE_TABS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type InvoiceTab = (typeof INVOICE_TABS)[number];

/** Tabs where the approver may still act. */
export const ACTIONABLE_TABS: InvoiceTab[] = ['PENDING'];

export interface InvoiceBatch {
  BatchNumber: string;
  Quantity: number;
}

export interface InvoiceLine {
  LineNum?: number;
  ItemCode: string;
  ItemDescription?: string | null;
  Quantity: number;
  WarehouseCode?: string;
  TaxCode?: string;
  Price?: number | null;
  /** SAP drafts carry no batch allocation (batches are picked at posting). */
  BatchNumbers?: InvoiceBatch[];
  [key: string]: unknown;
}

export interface InvoicePayload {
  DocObjectCode?: string;
  DocDate?: string;
  DocDueDate?: string;
  CardCode?: string;
  Comments?: string | null;
  DocumentLines?: InvoiceLine[];
  [key: string]: unknown;
}

/**
 * Live HANA on-hand stock for one line of the draft, keyed to the payload line
 * by `line_num`. `item_name` / `warehouse_stock` are null when the item has no
 * OITW row in that warehouse.
 */
export interface FgStock {
  line_num: number | null;
  item_code: string;
  item_name: string | null;
  quantity: number | null;
  warehouse_code: string | null;
  warehouse_stock: number | null;
}

export interface InvoiceLog {
  /** SAP approval-request code (OWDD.WddCode) — what approve/reject acts on. */
  id: number;
  /** The underlying draft document (ODRF). */
  doc_entry: number;
  doc_num: number | null;
  /** Base sales order DocNum when the draft was copied from one, else the draft DocNum. */
  so_number: string;
  card_code: string;
  party_name: string;
  total_amount: string | null;
  branch: string | null;
  warehouse: string | null;
  status: InvoiceStatus;
  rejection_reason: string | null;
  error_message: string | null;
  invoice_payload: InvoicePayload;
  // Per-line on-hand stock in each line's warehouse.
  fg_stock: FgStock[];
  created_at: string | null;
  /** SAP user who raised the draft (the request originator). */
  created_by: string | null;
}

/** One step of the SAP approval trail (request raised / approver decided). */
export interface InvoiceHistoryRecord {
  id: number;
  status: InvoiceStatus | string;
  created_by_name: string | null;
  remarks: string | null;
  created_at: string | null;
}

/** Local (JI-side) audit row recorded by our backend for each approve/reject. */
export interface InvoiceApprovalAudit {
  id: number;
  approval_code: number;
  draft_entry: number | null;
  so_number: string;
  party_name: string;
  total_amount: string | null;
  decision: 'APPROVED' | 'REJECTED';
  rejection_reason: string;
  sap_message: string;
  company: number;
  acted_by_name: string | null;
  created_at: string;
}

export interface PendingCount {
  pending: number;
  total: number;
}

/** Body sent to PATCH /invoice-approvals/invoices/<id>/status/. */
export interface StatusUpdateRequest {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  // Optional display context stored on the local audit row (avoids an extra SAP call).
  so_number?: string;
  party_name?: string;
  total_amount?: string;
}
