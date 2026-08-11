/** Order Processing — OMS order → stock check → production → procurement.
 *
 * Quantities are strings throughout: they are DECIMAL(18,4) server-side and a JS
 * number cannot carry that range without silently rounding. They are displayed as
 * given and only parsed where arithmetic is genuinely needed.
 */

export type OrderState =
  | 'RECEIVED' | 'VALIDATED' | 'STOCK_CHECKED' | 'PARTIALLY_AVAILABLE'
  | 'STOCK_ALLOCATED' | 'PRODUCTION_REQUIRED' | 'READY_FOR_FULFILLMENT'
  | 'FULFILLED' | 'CANCELLED' | 'ON_HOLD' | 'FAILED';

export type Verdict = 'AVAILABLE' | 'PARTIAL' | 'SHORT' | 'UNKNOWN';

export interface OrderLine {
  id: number;
  oms_line_id: number;
  item_code: string;
  item_name: string;
  category: string;
  brand: string;
  sub_group: string;
  quantity: string;
  pack_size: string;
  cases: string;
  litres: string;
  scheme_quantity: string;
  unit_price: string;
  line_total: string;
  warehouse_code: string;
  /** Empty means the line is trustworthy. Anything here means it is not. */
  issues: string[];
  is_trustworthy: boolean;
}

export interface OrderListRow {
  id: number;
  oms_order_id: number;
  order_number: string;
  customer_code: string;
  customer_name: string;
  company_code: string;
  branch_name: string;
  oms_status: string;
  state: OrderState;
  delivery_date: string | null;
  sap_created: boolean;
  sap_doc_number: string;
  total_amount: string | null;
  oms_created_at: string | null;
  line_count: number;
  issue_count: number;
}

export interface StockCheckLine {
  item_code: string;
  warehouse_code: string;
  required: string;
  on_hand: string;
  committed_in_sap: string;
  /** Demand from orders SAP has not been told about. */
  local_demand: string;
  available: string;
  available_in_group: string;
  /** warehouse -> free quantity, when the goods are a transfer away. */
  elsewhere: Record<string, string>;
  allocatable: string;
  short: string;
  verdict: Verdict;
  notes: string[];
}

export interface StockCheck {
  id: number;
  checked_at: string;
  checked_by: string;
  sap_company: string;
  verdict: Verdict;
  total_short: string;
  errors: string[];
  lines: StockCheckLine[];
}

export interface OrderDetail extends Omit<OrderListRow, 'line_count' | 'issue_count'> {
  branch_bpl_id: number | null;
  order_type: string;
  po_number: string;
  ship_to_address: string;
  is_foc: boolean;
  remarks: string;
  delivery_date_raw: string;
  quotation_cancelled: boolean;
  oms_updated_at: string | null;
  last_synced_at: string;
  lines: OrderLine[];
  latest_check: StockCheck | null;
}

export interface MaterialRequirement {
  id: number;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  quantity_per_unit: string;
  gross_required: string;
  on_hand: string;
  committed: string;
  incoming_po: string;
  net_required: string;
  /** False when SAP could not be read — the net figures are then unusable. */
  stock_known: boolean;
  is_short: boolean;
  computed_at: string;
}

export interface RequirementSource {
  order_number: string;
  customer_name: string;
  delivery_date: string | null;
  shortfall: string;
}

export interface ProductionRequirement {
  id: number;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  sap_company: string;
  quantity: string;
  needed_by: string | null;
  status: string;
  production_run: number | null;
  notes: string;
  sources: RequirementSource[];
  materials: MaterialRequirement[];
}

export interface ProcurementRequirement {
  id: number;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  quantity: string;
  incoming_po: string;
  needed_by: string | null;
  status: string;
  notes: string;
}

export interface ProcessingEvent {
  id: number;
  created_at: string;
  event: string;
  entity_type: string;
  entity_id: string;
  source: string;
  actor: string;
  old_state: string;
  new_state: string;
  result: string;
  detail: Record<string, unknown>;
  error: string;
}

export interface SyncRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  orders_seen: number;
  orders_created: number;
  orders_updated: number;
  lines_written: number;
  issues_found: number;
  error: string;
  triggered_by: string;
}

export interface Dashboard {
  orders: {
    total: number;
    by_state: Record<string, number>;
    waiting_for_stock: number;
    ready: number;
    unresolved: number;
  };
  production: { open: number };
  materials: { short: number };
  procurement: { open: number };
  data_quality: { lines_with_issues: number };
  last_sync: SyncRun | null;
}

export interface OrderListResponse {
  count: number;
  page: number;
  page_size: number;
  results: OrderListRow[];
}
