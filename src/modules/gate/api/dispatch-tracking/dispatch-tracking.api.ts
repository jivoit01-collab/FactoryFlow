import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/** The post-dispatch lifecycle stages an operator logs against a truck. */
export type TruckDispatchStatus =
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'REACHED_DESTINATION'
  | 'UNLOADING'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'RETURNED'
  | 'DELAYED'
  | 'CLOSED';

/** One dispatched truck (trip) on the tracking board. */
export interface DispatchTrackingTruck {
  arrival: number;
  arrival_no: string;
  arrival_status: string;
  vehicle: number | null;
  vehicle_number: string;
  /** The transporter carrying the trip, read off its dispatched dockings.
   *  Blank if none was recorded; comma-joined on the rare truck whose dockings
   *  were booked under more than one. */
  transporter_name: string;
  driver_name: string;
  driver_mobile: string;
  gatepass_no: string | null;
  dispatched_at: string | null;
  companies: string[];
  documents: string[];
  customers: string[];
  current_status: TruckDispatchStatus;
  current_status_display: string;
  last_update_at: string | null;
  update_count: number;
  /** Reach-by date captured on the In-Transit update (YYYY-MM-DD), if any. */
  expected_reach_date: string | null;
  /** True when the reach-by date has passed and the truck hasn't reached yet. */
  is_late: boolean;
  /** Days past the reach-by date (0 when not late). */
  days_overdue: number;
}

/** One item line on a bill. `quantity` (in `uom`) is what the operator splits —
 *  boxes are not populated on dispatched bills. */
export interface TruckDispatchBillItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
}

/** One bill riding on a dispatched truck, with its items. */
export interface TruckDispatchBill {
  id: number;
  sap_doc_num: string;
  sap_doc_entry: number;
  customer_name: string;
  company: string;
  total_quantity: string | null;
  sap_doc_total: string | null;
  items: TruckDispatchBillItem[];
}

/** How much of one item was delivered vs sent back. */
export interface TruckDispatchPartialItem {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  uom: string;
  quantity: string;
  qty_delivered: string;
  qty_returned: string;
  remarks: string;
}

/** One bill's shortfall on a partial delivery; totals are the sum of its items. */
export interface TruckDispatchPartialLine {
  id: number;
  document: number;
  sap_doc_num: string;
  customer_name: string;
  total_quantity: string | null;
  qty_delivered: string;
  qty_returned: string;
  remarks: string;
  items: TruckDispatchPartialItem[];
}

/** One item's split as submitted by the operator. */
export interface TruckDispatchPartialItemInput {
  item: number;
  qty_delivered: string;
  qty_returned: string;
  remarks?: string;
}

/** One bill's shortfall as submitted by the operator. */
export interface TruckDispatchPartialLineInput {
  document: number;
  remarks?: string;
  items: TruckDispatchPartialItemInput[];
}

/** One status event in a truck's post-dispatch timeline. */
export interface TruckDispatchUpdate {
  id: number;
  status: TruckDispatchStatus;
  status_display: string;
  occurred_at: string;
  expected_reach_date: string | null;
  /** Hand-over date (YYYY-MM-DD) on a Delivered / Partially Delivered update. */
  delivered_date: string | null;
  location: string;
  remarks: string;
  proof: string | null;
  /** Signed return note for the stock that came back on a partial delivery. */
  return_note: string | null;
  partial_lines: TruckDispatchPartialLine[];
  created_by_name: string;
  created_at: string;
}

export interface CreateTruckDispatchUpdateRequest {
  status: TruckDispatchStatus;
  occurred_at?: string;
  /** Expected reach date (YYYY-MM-DD) — set on an In-Transit update. */
  expected_reach_date?: string;
  /** Delivered date (YYYY-MM-DD) — set on a Delivered / Partially Delivered update. */
  delivered_date?: string;
  location?: string;
  remarks?: string;
  proof?: File | Blob | null;
  /** Return note — optional on a Partially Delivered update; it can also be
   *  attached later via `uploadReturnNote`. */
  return_note?: File | Blob | null;
  /** Per-bill delivered/returned split — set on a Partially Delivered update. */
  partial_lines?: TruckDispatchPartialLineInput[];
}

/** Query params accepted by the dispatch-tracking list endpoint. */
export interface DispatchTrackingFilters {
  search?: string;
  /** One or more TruckDispatchStatus values, comma-separated. */
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

/** Standard paginated envelope for the dispatch-tracking board. */
export interface DispatchTrackingPage {
  results: DispatchTrackingTruck[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
}

/** One late/overdue truck on the dashboard's alert list. */
export interface LateDispatchTruck {
  arrival: number;
  arrival_no: string;
  vehicle_number: string;
  /** Who to escalate to once the driver stops answering. */
  transporter_name: string;
  driver_name: string;
  driver_mobile: string;
  expected_reach_date: string | null;
  days_overdue: number;
}

/** One stage of the Dispatched → In transit → Reached → Delivered funnel. */
export interface DispatchFunnelStage {
  stage: string;
  count: number;
}

/** Aggregate insight over dispatched trucks for the tracking dashboard. */
export interface DispatchTrackingSummary {
  range: { from: string; to: string };
  total_dispatched: number;
  /** Count of trucks whose current status is each key (includes DISPATCHED). */
  status_counts: Record<TruckDispatchStatus | 'DISPATCHED', number>;
  active: number;
  completed: number;
  /** Trucks still DISPATCHED with no post-dispatch update logged yet. */
  no_update_yet: number;
  funnel: DispatchFunnelStage[];
  late: { count: number; trucks: LateDispatchTruck[] };
  delivered_today: number;
  /** Average days from dispatch to delivered, over completed trucks (null if none). */
  avg_transit_days: number | null;
  /** Share of delivered-with-ETA trucks that arrived on/before the ETA (null if none). */
  on_time_rate: number | null;
}

/** Date-range filter for the dashboard summary (defaults to the current month). */
export interface DispatchSummaryFilters {
  from_date?: string;
  to_date?: string;
}

export const dispatchTrackingApi = {
  async summary(filters: DispatchSummaryFilters = {}): Promise<DispatchTrackingSummary> {
    const response = await apiClient.get<DispatchTrackingSummary>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_SUMMARY,
      { params: filters },
    );
    return response.data;
  },

  async list(filters: DispatchTrackingFilters = {}): Promise<DispatchTrackingPage> {
    const response = await apiClient.get<DispatchTrackingPage>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING,
      { params: filters },
    );
    return response.data;
  },

  async updates(arrivalId: number): Promise<TruckDispatchUpdate[]> {
    const response = await apiClient.get<TruckDispatchUpdate[]>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_UPDATES(arrivalId),
    );
    return response.data;
  },

  async bills(arrivalId: number): Promise<TruckDispatchBill[]> {
    const response = await apiClient.get<TruckDispatchBill[]>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_BILLS(arrivalId),
    );
    return response.data;
  },

  /** Attach (or replace) the return note on an existing partial delivery. */
  async uploadReturnNote(
    arrivalId: number,
    updateId: number,
    file: File | Blob,
  ): Promise<TruckDispatchUpdate> {
    const formData = new FormData();
    formData.append('return_note', file);
    const response = await apiClient.post<TruckDispatchUpdate>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_RETURN_NOTE(arrivalId, updateId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async addUpdate(
    arrivalId: number,
    data: CreateTruckDispatchUpdateRequest,
  ): Promise<TruckDispatchUpdate> {
    const formData = new FormData();
    formData.append('status', data.status);
    if (data.occurred_at) formData.append('occurred_at', data.occurred_at);
    if (data.expected_reach_date) formData.append('expected_reach_date', data.expected_reach_date);
    if (data.delivered_date) formData.append('delivered_date', data.delivered_date);
    if (data.location) formData.append('location', data.location);
    if (data.remarks) formData.append('remarks', data.remarks);
    if (data.proof) formData.append('proof', data.proof);
    if (data.return_note) formData.append('return_note', data.return_note);
    // The per-bill rows ride along as JSON — multipart can't carry nested arrays.
    if (data.partial_lines?.length) {
      formData.append('partial_lines', JSON.stringify(data.partial_lines));
    }

    const response = await apiClient.post<TruckDispatchUpdate>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_UPDATES(arrivalId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
