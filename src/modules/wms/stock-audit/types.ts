export type AuditStatus = 'OPEN' | 'CLOSED';
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
  /** On the list only */
  lines?: number;
  counted?: number;
}

export interface StockAuditDetail extends StockAudit {
  summary: {
    by_category: Partial<Record<ItemCategory, CategoryProgress>>;
    total: CategoryProgress;
  };
  /** SAP can be read again only before the first count */
  can_refresh: boolean;
}

export interface StockAuditLine {
  id: number;
  item_code: string;
  item_name: string;
  category: ItemCategory;
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
  category?: ItemCategory | '';
  state?: LineState;
  page?: number;
}
