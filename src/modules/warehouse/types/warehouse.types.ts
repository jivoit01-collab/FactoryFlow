// ============================================================================
// Status Types
// ============================================================================

export type BOMRequestStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';

export type BOMLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type MaterialIssueStatus = 'NOT_ISSUED' | 'PARTIALLY_ISSUED' | 'FULLY_ISSUED';

export type FGReceiptStatus = 'PENDING' | 'RECEIVED' | 'SAP_POSTED' | 'FAILED';

export type WarehouseApprovalStatus =
  | 'NOT_REQUESTED'
  | 'PENDING'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED';

// ============================================================================
// BOM Request
// ============================================================================

export interface BOMRequestLine {
  id: number;
  item_code: string;
  item_name: string;
  per_unit_qty: string;
  required_qty: string;
  available_stock: number;
  available_qty?: number;
  approved_qty: string;
  issued_qty: string;
  warehouse: string;
  uom: string;
  base_line: number;
  status: BOMLineStatus;
  remarks: string;
  stock_warehouses?: StockWarehouse[];
  created_at: string;
  updated_at: string;
}

export interface BOMRequest {
  id: number;
  production_run: number | null;
  blowing_run: number | null;
  /** Original request this one re-requests the shortfall of (null unless a re-request). */
  parent_request: number | null;
  /** 'production' or 'blowing' — which run this request originates from. */
  source: 'production' | 'blowing';
  run_number: number | null;
  run_date: string;
  line_name: string;
  product: string;
  sap_doc_entry: number | null;
  required_qty: string;
  status: BOMRequestStatus;
  material_issue_status: MaterialIssueStatus;
  remarks: string;
  rejection_reason: string;
  requested_by: number | null;
  requested_by_name: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  lines_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BOMRequestDetail extends BOMRequest {
  sap_issue_doc_entries: SAPIssueDocEntry[];
  lines: BOMRequestLine[];
}

export interface SAPIssueDocEntry {
  doc_entry: number;
  doc_num: number;
  date: string;
  lines_count: number;
}

// ============================================================================
// Finished Goods Receipt
// ============================================================================

export interface FGReceipt {
  id: number;
  production_run: number;
  run_number: number;
  run_date: string;
  sap_doc_entry: number | null;
  item_code: string;
  item_name: string;
  produced_qty: string;
  good_qty: string;
  rejected_qty: string;
  warehouse: string;
  uom: string;
  posting_date: string;
  status: FGReceiptStatus;
  sap_receipt_doc_entry: number | null;
  sap_error: string;
  received_by: number | null;
  received_by_name: string;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Stock Check
// ============================================================================

export interface StockWarehouse {
  WhsCode: string;
  OnHand: number;
  Available: number;
}

export interface StockInfo {
  ItemCode: string;
  ItemName: string;
  total_on_hand: number;
  total_available: number;
  warehouses: StockWarehouse[];
}

export type StockCheckResponse = Record<string, StockInfo>;

// ============================================================================
// Request Types
// ============================================================================

export interface CreateBOMRequestPayload {
  production_run_id: number;
  required_qty: number;
  remarks?: string;
}

export interface BOMLineApproval {
  line_id: number;
  approved_qty: number;
  status: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

export interface ApproveBOMRequestPayload {
  lines: BOMLineApproval[];
}

export interface RejectBOMRequestPayload {
  reason: string;
}

export interface ReRequestBOMPayload {
  remarks?: string;
}

export interface MaterialIssuePayload {
  posting_date?: string;
  lines?: { line_id: number; quantity: number }[];
}

export interface CreateFGReceiptPayload {
  production_run_id: number;
  item_code?: string;
  item_name?: string;
  warehouse?: string;
  uom?: string;
  posting_date?: string;
}


// ============================================================================
// Branch Stock Transfer print — letterhead data
// ============================================================================

/** One warehouse's postal address (OWHS) + its SAP branch's GST/state (OBPL). */
export interface WarehousePrintAddress {
  code: string;
  name: string;
  street: string;
  block: string;
  building: string;
  city: string;
  zip_code: string;
  state_code: string;
  state_name: string;
  country: string;
  gstin: string;
  branch_name: string;
}

export interface WarehousePrintInfo {
  /** The company's legal name as SAP prints it, e.g. "JIVO WELLNESS PVT LTD". */
  company_name: string;
  company_email: string;
  /** Keyed by warehouse code; a code SAP doesn't know is simply absent. */
  warehouses: Record<string, WarehousePrintAddress>;
}
