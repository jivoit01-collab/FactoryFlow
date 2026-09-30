/** Open → Completed (SUBMITTED, awaiting approval) → Approved. CLOSED: older audits. */
export type AuditStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'CLOSED';
export type SapPosting = '' | 'POSTING' | 'DONE' | 'FAILED' | 'UNKNOWN';
export type ItemCategory = 'RM' | 'PM' | 'FG' | 'OTHER';
export type LineState = '' | 'uncounted' | 'counted' | 'different';

export interface SapWarehouse {
  code: string;
  name: string;
  /** The warehouse's audit in progress, if it has one */
  open_audit_id: number | null;
}

export interface CategoryProgress {
  lines: number;
  counted: number;
  /** Only for those who may see SAP's quantity */
  different?: number;
  /** RM / PM / FG / OTHER, on a group's progress */
  category?: ItemCategory;
}

/** What the signed-in user may do to the audit now. */
export interface AuditActions {
  count: boolean;
  refresh: boolean;
  complete: boolean;
  approve: boolean;
  post_to_sap: boolean;
  void_any: boolean;
}

export interface StockAudit {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  status: AuditStatus;
  notes: string;
  /** When SAP's figures were copied */
  snapshot_at: string;
  started_by: string;
  started_at: string;
  closed_by: string;
  closed_at: string | null;
  completed_by: string;
  completed_at: string | null;
  approved_by: string;
  approved_at: string | null;
  approval_comment: string;
  rejected_by: string;
  rejected_at: string | null;
  /** The last rejection, shown on the reopened audit */
  rejection_reason: string;
  sap_posting: SapPosting;
  sap_doc_num: string;
  sap_posted_at: string | null;
  sap_posting_error: string;
  sap_posted_by: string;
  /** What was sent to SAP, line by line and batch by batch */
  sap_posted_lines: PostingLine[];
  /** On the list only */
  lines?: number;
  counted?: number;
}

export interface StockAuditDetail extends StockAudit {
  summary: {
    /** By SAP item group name (RAW MATERIAL, TRADING ITEMS…), biggest first */
    by_group: Record<string, CategoryProgress>;
    total: CategoryProgress;
  };
  actions: AuditActions;
}

export interface StockAuditLine {
  id: number;
  item_code: string;
  item_name: string;
  category: ItemCategory;
  /** SAP's item group, e.g. 'SEMI FINISHED GOODS' */
  item_group_name: string;
  is_batch: boolean;
  uom: string;
  /** False for an item found on the floor that SAP's copy did not list */
  in_sap: boolean;
  /** Sum of the live counts; null until counted */
  counted_qty: string | null;
  count_entries: number | null;
  /** Only for those who may see SAP's quantity */
  sap_qty?: string;
  /** Counted less SAP; null until counted */
  difference?: string | null;
}

export interface StockAuditLinePage {
  count: number;
  page: number;
  page_size: number;
  sees_sap: boolean;
  results: StockAuditLine[];
}

export interface StockAuditCount {
  id: number;
  qty: string;
  note: string;
  counted_by: string;
  counted_at: string;
  voided: boolean;
  voided_by: string;
  mine: boolean;
}

export interface SapItem {
  item_code: string;
  item_name: string;
  uom: string;
  on_audit: boolean;
}

export interface LineFilters {
  search?: string;
  /** A SAP item group name */
  group?: string;
  state?: LineState;
  page?: number;
}

export interface PostingBatch {
  batch: string;
  sap_qty: string;
  counted_qty: string;
}

export interface PostingLine {
  line_id: number;
  item_code: string;
  item_name: string;
  category: ItemCategory;
  uom: string;
  sap_qty: string;
  counted_qty: string;
  difference: string;
  /** For a batch item, each batch that changes */
  batches: PostingBatch[];
  /** On a line that cannot be posted */
  reason?: string;
}

export interface PostingPreview {
  lines: PostingLine[];
  blocked: PostingLine[];
}
