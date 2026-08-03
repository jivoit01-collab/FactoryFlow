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

/** One status event in a truck's post-dispatch timeline. */
export interface TruckDispatchUpdate {
  id: number;
  status: TruckDispatchStatus;
  status_display: string;
  occurred_at: string;
  expected_reach_date: string | null;
  location: string;
  remarks: string;
  proof: string | null;
  created_by_name: string;
  created_at: string;
}

export interface CreateTruckDispatchUpdateRequest {
  status: TruckDispatchStatus;
  occurred_at?: string;
  /** Expected reach date (YYYY-MM-DD) — set on an In-Transit update. */
  expected_reach_date?: string;
  location?: string;
  remarks?: string;
  proof?: File | Blob | null;
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

  async addUpdate(
    arrivalId: number,
    data: CreateTruckDispatchUpdateRequest,
  ): Promise<TruckDispatchUpdate> {
    const formData = new FormData();
    formData.append('status', data.status);
    if (data.occurred_at) formData.append('occurred_at', data.occurred_at);
    if (data.expected_reach_date) formData.append('expected_reach_date', data.expected_reach_date);
    if (data.location) formData.append('location', data.location);
    if (data.remarks) formData.append('remarks', data.remarks);
    if (data.proof) formData.append('proof', data.proof);

    const response = await apiClient.post<TruckDispatchUpdate>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_TRACKING_UPDATES(arrivalId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
