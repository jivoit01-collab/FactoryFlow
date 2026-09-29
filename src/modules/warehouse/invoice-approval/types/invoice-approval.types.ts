/**
 * Types for the Factory Invoice Approval feature.
 *
 * The page serves three sources, all through `/invoice-approvals/…`:
 *
 * - **OMS** (the default): entries head-office billing logged in the external
 *   OMS service, proxied by our backend (`oms-invoices/`). `InvoiceLog.id` is
 *   the OMS invoice-log id.
 * - **SAP** (behind a toggle): A/R invoice drafts held by SAP's own approval
 *   procedure, read from HANA and decided through the Service Layer
 *   (`invoices/`). `InvoiceLog.id` is the approval-request code (OWDD.WddCode).
 * - **APP** (always shown, beside whichever of the two is toggled on): bills
 *   raised on this app's A/R Invoices screen from a warehouse the raiser does
 *   not manage, held until the warehouse's manager decides them
 *   (`app-invoices/`). `InvoiceLog.id` is that warehouse's approval row; the
 *   bill is created in SAP when its last approval lands.
 *
 * The id-spaces are unrelated, so an invoice is only ever identified by
 * `(source, id)` — never by id alone.
 */

/** Which backend a listed invoice came from, and where a decision is recorded. */
export type InvoiceSource = 'OMS' | 'SAP' | 'APP';

/** The two sources the page's toggle switches between; APP rows show under both. */
export type ToggleSource = Exclude<InvoiceSource, 'APP'>;

/** The source shown when the page first loads. */
export const DEFAULT_INVOICE_SOURCE: ToggleSource = 'OMS';

/**
 * An approval request is pending, approved, or rejected — also the page tabs.
 * OMS additionally reports states past the approver's reach (ERROR,
 * POSTED_TO_SAP, CL_RAISED, and the retired EDITED); they are never tabs, but
 * a row can carry one, so the badge renders whatever it is given.
 */
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
  /**
   * What approve/reject acts on: the SAP approval-request code (OWDD.WddCode)
   * for SAP rows, the OMS invoice-log id for OMS rows, or the warehouse
   * approval row for APP rows.
   */
  id: number;
  /** Set by the backend on APP rows; the page tags the OMS/SAP rows itself. */
  source?: InvoiceSource;
  /** APP rows: the factory app's A/R record, and where it stands. */
  posting_id?: number;
  posting_status?: string;
  posting_status_display?: string;
  /** APP rows: a cash sale, with no Sales Order behind it. */
  is_counter_sale?: boolean;
  /** APP rows: `total_amount` is before tax — SAP works the GST out on posting. */
  amount_is_pre_tax?: boolean;
  /** APP rows: who decided this warehouse's approval, and when. */
  decided_by?: string | null;
  decided_at?: string | null;
  /** The underlying SAP draft document (ODRF). Absent on OMS rows. */
  doc_entry?: number;
  doc_num?: number | null;
  /** Base sales order DocNum when the draft was copied from one, else the draft DocNum. */
  so_number: string;
  /** SAP rows only — OMS keeps the customer inside `invoice_payload.CardCode`. */
  card_code?: string;
  party_name: string;
  total_amount: string | null;
  branch: string | null;
  warehouse: string | null;
  status: InvoiceStatus;
  /**
   * The single SAP user this request's current stage is waiting on. SAP accepts
   * a decision from that account only — anyone else gets -6006 — so these four
   * fields decide whether the actions are offered at all. SAP-source rows only;
   * OMS rows leave them undefined.
   */
  current_step?: number | null;
  approver_code?: string | null;
  approver_name?: string | null;
  /** The app holds that SAP account's password. */
  credentials_configured?: boolean;
  /** The caller's own mapped SAP account IS this authorizer. */
  is_mine?: boolean;
  /** is_mine + password configured + still pending. */
  can_decide?: boolean;
  rejection_reason: string | null;
  error_message: string | null;
  invoice_payload: InvoicePayload;
  // Per-line on-hand stock in each line's warehouse.
  fg_stock: FgStock[];
  created_at: string | null;
  /**
   * Who raised it: the SAP user name (SAP rows) or the OMS numeric user id
   * (OMS rows, which is why this isn't just a string).
   */
  created_by: string | number | null;
}

/**
 * How a row names itself: by its Sales Order for OMS and SAP rows, by the
 * factory app's own bill number for APP rows — a cash sale has no SO at all.
 */
export function invoiceLabel(invoice: InvoiceLog): string {
  if (invoice.source === 'APP') {
    const bill = `Factory bill #${invoice.posting_id ?? invoice.id}`;
    if (invoice.is_counter_sale) return `${bill} (cash sale)`;
    return invoice.so_number ? `${bill} · SO ${invoice.so_number}` : bill;
  }
  return invoice.so_number;
}

/**
 * One step of the approval trail — a SAP approval step (raised / decided), or
 * an OMS status-change entry. `remarks` is SAP-only.
 */
export interface InvoiceHistoryRecord {
  id: number;
  status: InvoiceStatus | string;
  created_by_name: string | null;
  remarks?: string | null;
  created_at: string | null;
}

/** Local (JI-side) audit row recorded by our backend for each approve/reject. */
export interface InvoiceApprovalAudit {
  id: number;
  approval_code: number;
  /** Which backend the decision was recorded against. */
  source: InvoiceSource;
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
  /**
   * APP only: held bills across every warehouse the caller may decide, not just
   * the selected one, so a manager of several sees a bill waiting elsewhere.
   */
  all_warehouses?: number;
  by_warehouse?: Record<string, number>;
}

/** What an approve/reject PATCH answers. APP decisions say what became of the bill. */
export interface StatusUpdateResponse {
  message: string;
  posting_id?: number;
  posting_status?: string;
  sap_doc_num?: number | null;
  /** The approval stood but creating the bill in SAP failed. */
  warning?: string;
}

/** Body sent to PATCH /invoice-approvals/{oms-,}invoices/<id>/status/. */
export interface StatusUpdateRequest {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  /**
   * The invoice's warehouse. OMS has no per-id read endpoint, so the backend
   * scopes an OMS decision on this; SAP decisions resolve it from SAP and
   * ignore the field.
   */
  warehouse?: string;
  // Optional display context stored on the local audit row (avoids an extra SAP call).
  so_number?: string;
  party_name?: string;
  total_amount?: string;
}
