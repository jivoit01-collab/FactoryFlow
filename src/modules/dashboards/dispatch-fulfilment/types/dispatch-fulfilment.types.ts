// Dispatch Fulfilment dashboard — request/response DTOs.
// Mirrors GET /api/v1/dispatch-plans/dashboard/summary/

/** Quantity measures for the toggle (money is always shown separately). */
export type DispatchMeasure = 'weight' | 'litres' | 'boxes';

export interface DispatchFulfilmentFilters {
  /** inclusive start date, YYYY-MM-DD */
  from: string;
  /** inclusive end date, YYYY-MM-DD */
  to: string;
}

export interface DispatchedTotals {
  /** trucks that left the gate in the window */
  count: number;
  /** distinct invoices shipped */
  bills: number;
  /** Σ SAP invoice DocTotal — the value billed & dispatched */
  amount: number;
  weight: number;
  litres: number;
  boxes: number;
}

export interface BacklogTotals {
  count: number;
  amount: number;
  weight: number;
}

export interface DispatchTotals {
  dispatched: DispatchedTotals;
  backlog: BacklogTotals;
}

export interface StatusRow {
  status: string;
  count: number;
  amount: number;
  weight: number;
  litres: number;
}

export interface TrendRow {
  date: string;
  dispatched_amount: number;
  dispatched_weight: number;
  dispatched_litres: number;
  dispatched_boxes: number;
  trucks: number;
  /** Distinct invoices shipped that day. Optional: older backends do not send
   *  it, and a consumer must treat "absent" as unknown rather than as zero. */
  bills?: number;
}

export interface CustomerRow {
  customer_code: string;
  customer_name: string;
  dispatched_amount: number;
  dispatched_weight: number;
  dispatched_litres: number;
  dispatched_boxes: number;
  trucks: number;
}

export interface DispatchFulfilmentResponse {
  filters: {
    company_codes: string[];
    company_count: number;
    from: string;
    to: string;
  };
  totals: DispatchTotals;
  by_status: StatusRow[];
  trend: TrendRow[];
  by_customer: CustomerRow[];
}

// -------------------------------------------------------------------------- //
// Bill-wise drill-down
// -------------------------------------------------------------------------- //
export interface BillDispatch {
  sap_doc_num: string;
  status: string;
  gatepass_no: string;
  amount: number;
  weight: number;
  boxes: number;
  vehicle_no: string;
  gate_out_date: string | null;
  dispatched_at: string | null;
}

export interface BillRow {
  id: number;
  invoice_number: string;
  sap_doc_entry: number;
  sap_doc_num: string;
  customer_code: string;
  customer_name: string;
  dispatch_date: string | null;
  booking_status: string;
  billed_amount: number;
  planned_weight: number;
  planned_litres: number;
  dispatched_amount: number;
  dispatched_weight: number;
  dispatched_boxes: number;
  fulfillment_rate: number | null;
  dispatch_stage: string | null;
  gatepass_no: string | null;
  gateout_count: number;
  last_dispatched_at: string | null;
  place_of_supply: string;
  transporter_name: string;
  vehicle_no: string;
  eway_bill: string;
  priority: string;
  product_variety: string;
  dispatches: BillDispatch[];
}

export interface BillsResponse {
  count: number;
  limit: number;
  offset: number;
  status_counts: Record<string, number>;
  results: BillRow[];
}

export interface DispatchBillFilters {
  from: string;
  to: string;
  status?: string;
  search?: string;
  limit: number;
  offset: number;
}
