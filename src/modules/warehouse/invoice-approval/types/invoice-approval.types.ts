/**
 * Types for the Factory Invoice Approval feature (proxy to the external OMS service).
 *
 * Read shapes (`InvoiceLog`, `InvoiceHistoryRecord`) mirror OMS's JSON, passed
 * through our backend unchanged. `invoice_payload` is the SAP AR-invoice payload.
 */

/** The four approver tabs. OMS may also return ERROR / POSTED_TO_SAP / CL_RAISED. */
export type InvoiceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'EDITED'
  | 'REJECTED'
  | 'ERROR'
  | 'POSTED_TO_SAP'
  | 'CL_RAISED';

/** Statuses shown as tabs on the approval page, in order. */
export const INVOICE_TABS = ['PENDING', 'APPROVED', 'EDITED', 'REJECTED'] as const;
export type InvoiceTab = (typeof INVOICE_TABS)[number];

/** Tabs where the approver may still act. */
export const ACTIONABLE_TABS: InvoiceTab[] = ['PENDING', 'EDITED'];

export interface InvoiceBatch {
  BatchNumber: string;
  Quantity: number;
}

export interface InvoiceLine {
  LineNum?: number;
  ItemCode: string;
  Quantity: number;
  WarehouseCode?: string;
  TaxCode?: string;
  ShipDate?: string;
  BatchNumbers?: InvoiceBatch[];
  [key: string]: unknown;
}

export interface InvoicePayload {
  Series?: number;
  DocDate?: string;
  TaxDate?: string;
  CardCode?: string;
  PayToCode?: string;
  ShipToCode?: string;
  DocDueDate?: string;
  DocObjectCode?: string;
  DocumentLines?: InvoiceLine[];
  [key: string]: unknown;
}

export interface InvoiceLog {
  id: number;
  so_number: string;
  party_name: string;
  total_amount: string;
  branch: string | null;
  warehouse: string | null;
  status: InvoiceStatus;
  rejection_reason: string | null;
  error_message: string | null;
  invoice_payload: InvoicePayload;
  created_at: string;
  created_by: number | null;
}

export interface InvoiceHistoryRecord {
  id: number;
  created_by_name: string | null;
  so_number: string;
  party_name: string;
  total_amount: string;
  status: InvoiceStatus;
  invoice_payload: InvoicePayload;
  created_at: string;
  invoice_log: number;
  created_by: number | null;
}

/** Local (JI-side) audit row recorded by our backend for each approve/reject. */
export interface InvoiceApprovalAudit {
  id: number;
  invoice_log_id: number;
  so_number: string;
  party_name: string;
  total_amount: string | null;
  decision: 'APPROVED' | 'REJECTED';
  rejection_reason: string;
  oms_message: string;
  company: number;
  acted_by_name: string | null;
  created_at: string;
}

export interface PendingCount {
  pending: number;
  edited: number;
  total: number;
}

/** Body sent to PATCH /oms/invoices/<id>/status/. */
export interface StatusUpdateRequest {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  // Optional display context stored on the local audit row (avoids an extra OMS call).
  so_number?: string;
  party_name?: string;
  total_amount?: string;
}
