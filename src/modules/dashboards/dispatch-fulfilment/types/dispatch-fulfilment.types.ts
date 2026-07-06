// Dispatch Fulfilment dashboard — request/response DTOs.
// Mirrors GET /api/v1/dispatch-plans/dashboard/summary/

export type DispatchMeasure = 'amount' | 'weight' | 'litres' | 'boxes';

export interface DispatchFulfilmentFilters {
  /** inclusive start date, YYYY-MM-DD */
  from: string;
  /** inclusive end date, YYYY-MM-DD */
  to: string;
}

export interface BilledTotals {
  count: number;
  amount: number;
}

export interface PlannedTotals {
  count: number;
  amount: number;
  weight: number;
  litres: number;
  /** plans do not store a box count */
  boxes: number | null;
}

export interface DispatchedTotals {
  count: number;
  amount: number;
  weight: number;
  litres: number;
  boxes: number;
}

export interface FulfilmentRate {
  amount: number | null;
  weight: number | null;
  litres: number | null;
}

export interface DispatchTotals {
  billed: BilledTotals;
  planned: PlannedTotals;
  dispatched: DispatchedTotals;
  fulfillment_rate: FulfilmentRate;
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
  planned_amount: number;
  planned_weight: number;
  planned_litres: number;
  billed_amount: number;
  dispatched_amount: number;
  dispatched_weight: number;
  dispatched_litres: number;
  dispatched_boxes: number;
}

export interface CustomerRow {
  customer_code: string;
  customer_name: string;
  planned_amount: number;
  planned_weight: number;
  planned_litres: number;
  planned_count: number;
  dispatched_amount: number;
  dispatched_weight: number;
  dispatched_litres: number;
  dispatched_boxes: number;
  dispatched_count: number;
  fulfillment_rate: number | null;
}

export interface DispatchFulfilmentResponse {
  filters: {
    company_code: string;
    company_name: string;
    from: string;
    to: string;
  };
  totals: DispatchTotals;
  by_status: StatusRow[];
  trend: TrendRow[];
  by_customer: CustomerRow[];
}
