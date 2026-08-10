/** The Live Trail — one chain from an open sales order to the PO it needs.
 *
 * Read live from SAP on every request, so unlike the planning dashboard nothing
 * here is a stored snapshot. Quantities are PIECES (single bottles), never
 * cartons; money is INR.
 *
 * Demand is consolidated across every book the factory fills — Oil and Mart —
 * while stock, work orders, BOMs, purchase orders and lead times come from Oil,
 * which is the only production unit.
 */

/** Which order book a line came from. */
export type DemandCompany = 'JIVO_OIL' | 'JIVO_MART' | 'JIVO_BEVERAGES';

/** EXTERNAL drops group-internal orders so the same litres are not planned
 *  twice; ALL keeps them. */
export type TrailScope = 'EXTERNAL' | 'ALL';

/**
 * How a demand line was tied to an item the factory actually makes.
 *
 * The company databases number items independently, so the code alone is not
 * proof: `code` means both masters agreed on the name too, `name` means the
 * item was renumbered and was followed by name, `own` is the factory's own
 * book. `ambiguous` and `unknown` are refusals — those lines are shown but
 * never planned.
 */
export type ItemMatch = 'own' | 'code' | 'name' | 'ambiguous' | 'unknown';

export type Urgency = 'CRITICAL' | 'PLAN';

export interface TrailBook {
  company: DemandCompany;
  label: string;
  orders: number;
  lines: number;
  units: number;
  value: number;
}

export interface TrailSummary {
  as_of: string;
  scope: TrailScope;
  production_company: string;

  open_orders: number;
  open_lines: number;
  parties: number;
  interco_lines: number;
  interco_value: number;
  demand_units: number;
  demand_value: number;
  late_lines: number;
  late_value: number;
  same_day_due_lines: number;
  oldest_order_days: number;

  /** Demand that could not be tied to anything the factory makes. Real orders,
   *  real money — just not plannable, and never counted as covered. */
  unplannable_skus: number;
  unplannable_lines: number;
  unplannable_value: number;

  skus_demanded: number;
  skus_fully_covered: number;
  skus_short: number;
  skus_without_bom: number;
  units_to_produce: number;
  shippable_value: number;

  components_touched: number;
  components_short: number;
  components_stale_po: number;
  stale_po_units: number;
  buy_value: number;
  critical_actions: number;

  filling_litres: number;
  filling_cost: number;

  overdue_po_lines: number;
  overdue_po_docs: number;
  overdue_po_value: number;
  overdue_po_over180: number;
  overdue_po_oldest: string | null;

  books: TrailBook[];
}

export interface TrailOrder {
  company: DemandCompany;
  doc: number;
  entry: number;
  line: number;
  /** The code on the order, in its own company's numbering. */
  source_item: string;
  match: ItemMatch;
  party: string;
  card: string;
  interco: boolean;
  ordered: string | null;
  due: string | null;
  /** Days since the order was placed. */
  age: number;
  /** Days past the SAP delivery date — weak in this data; see caveats. */
  late: number;
  /** The factory's code for this product. Empty when it could not be resolved. */
  item: string;
  name: string;
  qty: number;
  delivered: number;
  open: number;
  price: number;
  value: number;
}

export interface TrailSkuComponent {
  child: string;
  per_unit: number;
  reqd: number;
  bom_qty: number;
  bom_base: number;
  is_resource: boolean;
}

export interface TrailSku {
  item: string;
  name: string;
  type: string;
  variety: string;
  uom: string;
  orders: number;
  demand: number;
  value: number;
  earliest_due: string | null;
  latest_due: string | null;
  onhand: number;
  /** The same stock, split by the warehouse that holds it. */
  onhand_by_company: Partial<Record<DemandCompany, number>>;
  wip: number;
  wo_count: number;
  has_bom: boolean;
  to_produce: number;
  from_stock: number;
  from_wip: number;
  cover: number;
  components: TrailSkuComponent[];
}

export interface TrailComponentParent {
  parent: string;
  name: string;
  per_unit: number;
  reqd: number;
  earliest_due: string | null;
}

export interface TrailComponent {
  item: string;
  name: string;
  /** A conversion resource is a cost line and a constraint, never a purchase. */
  is_resource: boolean;
  group: string;
  family: string;
  uom: string;
  rate: number | null;
  reqd: number;
  used_in: number;
  onhand: number;
  po_live: number;
  po_stale: number;
  stale_pos: number;
  po_count: number;
  po_eta: string | null;
  min_level: number;
  price: number;
  vendor: string | null;
  lead_avg: number | null;
  lead_max: number | null;
  lead_lines: number | null;
  has_subbom: boolean;
  /** Requirement less stock, ignoring every open PO. */
  short_ex_po: number;
  /** Requirement less stock and every open PO, however old. */
  short: number;
  /** The one the dashboard acts on: stock plus only CREDIBLE POs. */
  short_strict: number;
  parents: TrailComponentParent[];
}

export interface MakeVsBuyInput {
  code: string;
  name: string;
  per_unit: number;
  price: number;
  cost: number;
  is_resource: boolean;
}

export interface MakeVsBuy {
  item: string;
  name: string;
  group: string;
  buy_price: number;
  make_cost: number;
  saving_per_unit: number;
  verdict: 'MAKE' | 'BUY';
  inputs: MakeVsBuyInput[];
  sub: string | null;
  sub_name: string;
  sub_per_unit: number;
  sub_price: number;
  sub_onhand: number;
  conv: string;
  conv_rate: number;
  in_requirement: boolean;
  reqd_now: number;
}

export interface TrailAction {
  item: string;
  name: string;
  group: string;
  uom: string;
  reqd: number;
  onhand: number;
  po_live: number;
  po_stale: number;
  stale_pos: number;
  short: number;
  short_ex_po: number;
  value: number;
  price: number;
  vendor: string | null;
  lead_avg: number | null;
  lead_max: number | null;
  need_by: string | null;
  /** need_by less the measured lead time. Null when nothing has been measured. */
  order_by: string | null;
  days_past_due: number;
  can_make: boolean;
  make: MakeVsBuy | null;
  urgency: Urgency;
}

export interface TrailResource {
  code: string;
  name: string;
  uom: string;
  rate: number;
  litres_reqd: number;
  cost: number;
  skus: number;
}

export interface CapacityMachineSku {
  sku: string;
  name: string;
  to_produce: number;
  rate_per_hour: number;
  hours: number;
  alternates: string[];
}

export interface CapacityMachine {
  machine_id: string;
  name: string;
  location: string;
  available_hours: number;
  changeover_hours: number;
  usable_hours: number;
  required_hours: number;
  utilisation_percent: number | null;
  shortfall_hours: number;
  feasible: boolean;
  skus: CapacityMachineSku[];
}

export interface CapacityUnmapped {
  sku: string;
  name: string;
  to_produce: number;
  reason: string;
}

/** `available` is false until the reference template has been uploaded — the
 *  machine list and SKU-to-machine map are the two things SAP does not hold. */
export interface TrailCapacity {
  available: boolean;
  reason: string;
  machines: CapacityMachine[];
  unmapped: CapacityUnmapped[];
  totals: {
    machines: number;
    over_capacity: number;
    unmapped_skus: number;
    feasible: boolean | null;
  };
}

export interface UnresolvedDemand {
  company: DemandCompany;
  label: string;
  item: string;
  name: string;
  reason: string;
  lines: number;
  units: number;
  value: number;
}

export interface LiveTrail {
  generated_at: string;
  production_company: DemandCompany;
  demand_companies: { code: DemandCompany; label: string }[];
  /** Books this environment could not read. Their demand is MISSING, not zero. */
  unavailable_books: { code: DemandCompany; label: string; reason: string }[];
  scope: TrailScope;
  summary: TrailSummary;
  orders: TrailOrder[];
  skus: TrailSku[];
  components: TrailComponent[];
  actions: TrailAction[];
  makevsbuy: MakeVsBuy[];
  resources: TrailResource[];
  capacity: TrailCapacity;
  unresolved_demand: UnresolvedDemand[];
  notes: string;
  caveats: string[];
  sources: string[];
}
