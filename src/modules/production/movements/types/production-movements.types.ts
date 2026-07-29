export type WarehouseRoleType =
  | 'RM_STORE'
  | 'PM_STORE'
  | 'PRODUCTION_CONSUMPTION'
  | 'FG_RECEIPT'
  | 'GR_STAGING'
  | 'WASTAGE'
  | 'VIRTUAL'
  | 'INACTIVE'
  | 'OTHER';

export type ItemFamily = 'RM' | 'PM' | 'FG' | 'MIXED' | 'OTHER';

export interface WarehouseRole {
  id: number;
  company_code: string;
  whs_code: string;
  warehouse_name: string;
  role: WarehouseRoleType;
  family: ItemFamily;
  is_grpo_target: boolean;
  is_bom_issue_point: boolean;
  feeds_whs_code: string;
  is_active: boolean;
  needs_review: boolean;
  notes: string;
  updated_at: string;
}

export interface StockBoardWarehouse {
  whs_code: string;
  warehouse_name: string;
  role: WarehouseRoleType;
  family: ItemFamily;
  is_grpo_target: boolean;
  is_bom_issue_point: boolean;
  feeds_whs_code: string;
  needs_review: boolean;
  notes: string;
  total_items: number;
  total_on_hand: number;
  total_value: number;
  in_sap: boolean;
}

export interface UnmappedWarehouse {
  whs_code: string;
  warehouse_name: string;
  total_items: number;
  total_on_hand: number;
  total_value: number;
}

export interface StockBoardResponse {
  company_code: string;
  warehouses: StockBoardWarehouse[];
  unmapped: UnmappedWarehouse[];
}

export interface WarehouseStockItem {
  item_code: string;
  item_name: string;
  item_group: string;
  uom: string;
  warehouse_code: string;
  on_hand: number;
  committed: number;
  available: number;
  stock_value: number;
  stock_status: string;
}

export interface WarehouseStockResponse {
  summary: {
    total_items: number;
    total_on_hand: number;
    total_committed: number;
    total_available: number;
    total_value: number;
  };
  items: WarehouseStockItem[];
  pagination: { total: number; page: number; page_size: number; pages: number };
}

export interface WarehouseStockFilters {
  pm_only?: boolean;
  search?: string;
  stock_filter?: 'with_stock' | 'zero_stock' | 'all';
  page?: number;
  page_size?: number;
}

export interface TransferSource {
  whs_code: string;
  warehouse_name: string;
  role: WarehouseRoleType;
  needs_transfer_request: boolean;
}

export interface TransferOptions {
  company_code: string;
  issue_point: string | null;
  sources: TransferSource[];
  sap_writes_enabled: boolean;
}

export interface TransferLineInput {
  item_code: string;
  quantity: number | string;
  item_name?: string;
  uom?: string;
}

export interface TransferRequest {
  from_whs: string;
  lines: TransferLineInput[];
  posting_date?: string;
  reference?: string;
  dry_run?: boolean | null;
}

export type MovementType =
  | 'GRPO_RECEIPT'
  | 'TRANSFER_REQUEST'
  | 'TRANSFER'
  | 'BOM_ISSUE'
  | 'FG_RECEIPT';

export type MovementStatus = 'DRAFT' | 'DRY_RUN' | 'POSTED' | 'FAILED';

export interface MovementSummary {
  id: number;
  movement_type: MovementType;
  status: MovementStatus;
  from_whs: string;
  to_whs: string;
  sap_object_type: string;
  sap_doc_entry: number | null;
  sap_doc_num: string;
  itr_doc_entry: number | null;
}

export interface TransferResult {
  company_code: string;
  from_whs: string;
  to_whs: string;
  needs_transfer_request: boolean;
  dry_run: boolean;
  movements: MovementSummary[];
}

export interface WarehouseMovementLine {
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  from_whs_code: string;
  to_whs_code: string;
  base_line: number | null;
}

export interface WarehouseMovement {
  id: number;
  company_code: string;
  movement_type: MovementType;
  status: MovementStatus;
  from_whs_code: string;
  to_whs_code: string;
  sap_object_type: string;
  sap_doc_entry: number | null;
  sap_doc_num: string;
  itr_doc_entry: number | null;
  posting_date: string | null;
  error_message: string;
  reference: string;
  created_at: string;
  lines: WarehouseMovementLine[];
}
