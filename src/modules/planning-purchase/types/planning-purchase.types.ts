/**
 * Planning & Purchase types.
 *
 * Quantities arrive as strings because DRF serialises `DecimalField` that way,
 * and parsing them to `number` in the client would throw away precision the
 * backend was careful to keep. Format for display; never do arithmetic that
 * matters on the parsed value.
 */

/** Which grain the plan is being read at. SAP only states the month. */
export type BucketType = 'DAY' | 'WEEK' | 'MONTH';

/**
 * How a monthly figure becomes a daily one.
 *
 * `PERIOD_START` invents nothing — the whole quantity stays on the date SAP
 * recorded. `EVEN_WORKING_DAYS` spreads it across the period's working days and
 * every resulting bucket is flagged `derived`.
 */
export type SpreadPolicy = 'PERIOD_START' | 'EVEN_WORKING_DAYS';

export type MaterialType = 'PACKAGING' | 'RAW' | 'OTHER';

/** Keyed by material type, or a single `ALL` when a filter was supplied. */
export type WarehouseScope = Partial<Record<MaterialType | 'ALL', string[]>>;

/**
 * Which unit the plan screens display.
 *
 * SAP stores the plan in pieces. Litres is what an oil business actually reads a
 * plan in, and cases is what the floor counts, so all three are carried on every
 * row and bucket and the page just picks one. Attainment % is unit-independent.
 */
export type PlanUnit = 'LITRES' | 'PIECES' | 'CASES';

/**
 * `NO_LEAD_TIME` outranks `SCHEDULED` on purpose: a shortage nobody can date is
 * the reference-data gap that needs chasing, not a low-priority item.
 */
export type Urgency = 'OVERDUE' | 'ORDER_NOW' | 'NO_LEAD_TIME' | 'SCHEDULED' | 'COVERED';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'POSTED'
  | 'FAILED'
  | 'CANCELLED';

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export interface PlanBucket {
  bucket_type: BucketType;
  bucket_start: string;
  label?: string;
  planned_qty: string;
  planned_litres?: string;
  planned_cases?: string;
  /** True when this figure was spread by the app rather than stated by SAP. */
  derived: boolean;
  spread_policy?: SpreadPolicy;
}

export interface PlanItemWithoutBom {
  item_code: string;
  item_name: string;
  planned_qty: string;
}

export interface PlanHeader {
  abs_id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  period_view: 'MONTHLY' | 'WEEKLY';
  line_count: number;
  item_count?: number;
  planned_qty: string;
  planned_litres?: string;
  planned_cases?: string;
  produced_qty?: string;
  produced_litres?: string;
  produced_cases?: string;
  /** SKUs SAP does not flag as litre items; they contribute 0 to a litre total. */
  non_litre_item_count?: number;
  non_litre_items?: PlanItemWithoutBom[];
  attainment_pct?: string;
  first_bucket_date?: string | null;
  last_bucket_date?: string | null;
  is_current: boolean;
  items_without_bom?: PlanItemWithoutBom[];
}

export interface PlanLine {
  line_id: number | null;
  item_code: string;
  item_name: string;
  item_group: string;
  bucket_date: string | null;
  warehouse_code: string;
  /** In the item's SAP inventory unit — PCS (single bottles/tins) for nearly every SKU. */
  planned_qty: string;
  /** The same figure in cases, derived from `pieces_per_case`. */
  planned_cases: string;
  /** The same figure in litres, from `OITM.SalPackUn`. Zero if not a litre item. */
  planned_litres: string;
  uom: string;
  pieces_per_case: number;
  /** Litres in one piece. 1 for a 1 L bottle, 0.2 for 200 ML, 0.9549 for 869 GMS. */
  litres_per_unit: string;
  /** False means SAP does not flag it as a litre item, not that it holds nothing. */
  is_litre_item: boolean;
  has_bom: boolean;
  /** From SAP movements (OINM TransType 59), in the same unit as `planned_qty`. */
  produced_qty: string;
  produced_cases: string;
  produced_litres: string;
  variance_qty: string;
  variance_litres: string;
  attainment_pct: string;
  buckets: PlanBucket[];
}

export interface PlanListMeta {
  company_code: string;
  count: number;
  fetched_at: string;
  source: string;
}

export interface PlanListResponse {
  data: PlanHeader[];
  meta: PlanListMeta;
}

export interface PlanDetailMeta {
  company_code: string;
  bucket_type: BucketType;
  spread_policy: SpreadPolicy;
  fetched_at: string;
  derivation_note: string;
  unit_note: string;
}

export interface PlanDetailResponse {
  plan: PlanHeader;
  lines: PlanLine[];
  buckets: PlanBucket[];
  meta: PlanDetailMeta;
}

// ---------------------------------------------------------------------------
// Requirement
// ---------------------------------------------------------------------------

export interface RequirementUsage {
  item_code: string;
  item_name: string;
  plan_qty: string;
  qty_per_unit: string;
  required_qty: string;
}

export interface RequirementWarehouse {
  warehouse: string;
  on_hand: string;
  committed: string;
  min_stock: string;
}

export interface RequirementRow {
  component_code: string;
  component_name: string;
  item_group: string;
  material_type: MaterialType;
  uom: string;
  issue_warehouse: string;
  is_purchased: boolean;
  /** Manufactured in-house. Flagged, never auto-exploded — make-or-buy is a decision. */
  has_own_bom: boolean;

  required_qty: string;
  on_hand_qty: string;
  committed_qty: string;
  /** on hand minus committed. Can be negative when stock is over-promised. */
  net_available_qty: string;
  benchmark_qty: string;
  has_benchmark: boolean;
  on_order_qty: string;
  open_po_lines: number;
  open_po_earliest_due: string | null;
  shortage_before_po_qty: string;
  shortage_qty: string;
  suggested_order_qty: string;

  moq: string | null;
  moq_applied: string | null;
  lead_time_days: number | null;
  lead_time_source: 'MEASURED' | 'TEMPLATE' | 'NONE';
  need_by_date: string | null;
  order_by_date: string | null;
  urgency: Urgency;
  days_since_last_use: number | null;

  vendor_code: string;
  vendor_name: string;
  /** Per inventory unit, from the item master. Safe to multiply by a requirement. */
  unit_price: string;
  price_source: 'ITEM_MASTER' | 'NONE';
  /**
   * Evidence only. Denominated in the PURCHASE unit — bulk oil is bought by the
   * metric ton against a litre BOM — so this must never be used for costing.
   */
  last_po_price: string | null;
  last_po_date: string | null;
  currency: string;
  estimated_value: string;
  is_over_committed: boolean;

  used_by: RequirementUsage[];
  warehouses: RequirementWarehouse[];
}

/** A conversion cost (filling, blowing, job work). Real cost, not purchasable. */
export interface RequirementResource {
  resource_code: string;
  resource_name: string;
  required_qty: string;
  used_by_count: number;
}

export interface RequirementMeta {
  company_code: string;
  component_count: number;
  shortage_count: number;
  packaging_shortage_count: number;
  raw_shortage_count: number;
  estimated_purchase_value: string;
  no_lead_time_count: number;
  no_price_count: number;
  over_committed_count: number;
  sub_assembly_count: number;
  resource_line_count: number;
  items_without_bom: PlanItemWithoutBom[];
  unusable_boms: { parent_code: string; component_code: string; reason: string }[];
  /**
   * Which warehouses each material type is counted in — packaging from the
   * packaging stores, oil from the oil stores. Collapses to a single `ALL` key
   * when the caller passes its own warehouse filter, since one list then applies
   * to every component regardless of type.
   */
  warehouse_scope: WarehouseScope;
  warehouse_filtered: boolean;
  fetched_at: string;
  notes: string[];
}

export interface RequirementResponse {
  plan: PlanHeader;
  data: RequirementRow[];
  resources: RequirementResource[];
  meta: RequirementMeta;
}

export interface RequirementFilters {
  material_type?: MaterialType;
  warehouse?: string[];
  include_covered?: boolean;
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export interface Vendor {
  vendor_code: string;
  vendor_name: string;
  currency: string;
}

export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
}

export interface PurchaseOrderLine {
  id: number;
  item_code: string;
  item_name: string;
  material_type: MaterialType;
  uom: string;
  quantity: string;
  unit_price: string;
  line_value: string;
  warehouse_code: string;
  required_date: string | null;
  /** The evidence for the quantity, snapshotted when the order was raised. */
  required_qty: string;
  available_qty: string;
  on_order_qty: string;
  shortage_qty: string;
  moq_applied: string | null;
  sap_line_num: number | null;
}

export interface PurchaseOrder {
  id: number;
  company_code: string;
  plan_abs_id: number | null;
  plan_code: string;
  plan_name: string;
  vendor_code: string;
  vendor_name: string;
  doc_date: string;
  doc_due_date: string;
  warehouse_code: string;
  remarks: string;
  status: PurchaseOrderStatus;
  status_display: string;
  is_editable: boolean;
  total_value: string;
  currency: string;
  line_count: number;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_error_message: string;
  posted_at: string | null;
  /** Marked posted without a SAP document, under the simulate flag. */
  simulated: boolean;
  created_by: number | null;
  created_by_name: string;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLineInput {
  item_code: string;
  item_name?: string;
  item_group?: string;
  material_type?: MaterialType | '';
  uom?: string;
  vendor_code: string;
  quantity: string;
  unit_price?: string;
  warehouse_code?: string;
  required_date?: string | null;
  required_qty?: string;
  available_qty?: string;
  on_order_qty?: string;
  shortage_qty?: string;
  moq_applied?: string | null;
}

export interface CreatePurchaseOrdersRequest {
  plan_abs_id?: number | null;
  plan_code?: string;
  plan_name?: string;
  doc_due_date?: string | null;
  warehouse_code?: string;
  remarks?: string;
  currency?: string;
  lines: PurchaseOrderLineInput[];
}

export interface CreatePurchaseOrdersResponse {
  data: PurchaseOrder[];
  meta: { created: number; note: string };
}

export interface UpdatePurchaseOrderRequest {
  vendor_code?: string;
  doc_due_date?: string;
  warehouse_code?: string;
  remarks?: string;
  lines?: PurchaseOrderLineInput[];
}

export interface PurchaseOrderListFilters {
  status?: PurchaseOrderStatus;
  plan_abs_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrder[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    status_counts: Record<PurchaseOrderStatus, number>;
  };
}

export interface PostToSapResponse {
  data: PurchaseOrder;
  meta: { simulated: boolean; note: string };
}

// ---------------------------------------------------------------------------
// Producible from stock ("what can run tomorrow")
// ---------------------------------------------------------------------------

/**
 * Which stock the buildable figure rests on.
 *
 * `ON_HAND` is the default and answers what the floor asks: the material is in
 * the building, so it can be run. `FREE` nets off what SAP has reserved against
 * other documents — on this company most components are over-committed, so FREE
 * reads as "you can make nothing".
 */
export type StockBasis = 'ON_HAND' | 'FREE';

export interface LimitingComponent {
  component_code: string;
  component_name: string;
  material_type: MaterialType;
  uom: string;
  available_qty: string;
  qty_per_unit: string;
}

export interface ProducibleSku {
  item_code: string;
  item_name: string;
  uom: string;
  pieces_per_case: number;
  litres_per_unit: string;
  is_litre_item: boolean;
  has_bom: boolean;
  component_count: number;

  planned_qty: string;
  planned_litres: string;
  planned_cases: string;

  /**
   * Null — not zero — when SAP has no recipe. "No answer" and "out of material"
   * are different problems with different owners.
   *
   * These are STANDALONE maxima: each assumes the SKU gets the whole warehouse,
   * so they are alternatives to one another and must never be summed.
   */
  buildable_qty: string | null;
  buildable_litres: string | null;
  buildable_cases: string | null;
  limited_by: string | null;
  limited_by_detail?: LimitingComponent | null;
  covers_plan: boolean | null;
  shortfall_qty: string | null;
}

export interface ProducibleDraw {
  item_code: string;
  item_name: string;
  planned_qty: string;
  planned_litres: string;
  qty_per_unit: string;
  needed_qty: string;
}

export interface ProducibleComponent {
  component_code: string;
  component_name: string;
  material_type: MaterialType;
  uom: string;
  needed_qty: string;
  on_hand_qty: string;
  committed_qty: string;
  free_qty: string;
  over_committed: boolean;
  available_qty: string;
  shortage_qty: string;
  is_blocking: boolean;
  coverage_pct: string;
  drawn_by: ProducibleDraw[];
  warehouses: { warehouse: string; on_hand: string; committed: string }[];
}

export interface ProducibleMeta {
  company_code: string;
  target_date: string;
  sku_count: number;
  sku_without_bom_count: number;
  planned_sku_count: number;
  runnable_sku_count: number;
  blocked_sku_count: number;
  blocked_skus: { item_code: string; shortfall_qty: string; limited_by: string }[];
  component_count: number;
  blocking_component_count: number;
  worst_component_coverage_pct: string;
  over_committed_component_count: number;
  plan_runs_in_full: boolean;
  planned_litres: string;
  at_risk_litres: string;
  at_risk_pct: string;
  stock_basis: StockBasis;
  unusable_boms: { parent_code: string; component_code: string; reason: string }[];
  warehouse_scope: WarehouseScope;
  warehouse_filtered: boolean;
  excluded_warehouses: string[];
  fetched_at: string;
  notes: string[];
}

export interface ProducibleResponse {
  plan: PlanHeader;
  target_date: string;
  skus: ProducibleSku[];
  components: ProducibleComponent[];
  meta: ProducibleMeta;
}

export interface ProducibleFilters {
  target_date?: string;
  warehouse?: string[];
  stock_basis?: StockBasis;
}
