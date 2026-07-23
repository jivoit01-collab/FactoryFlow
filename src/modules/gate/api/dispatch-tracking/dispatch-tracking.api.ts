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
}

/** One status event in a truck's post-dispatch timeline. */
export interface TruckDispatchUpdate {
  id: number;
  status: TruckDispatchStatus;
  status_display: string;
  occurred_at: string;
  location: string;
  remarks: string;
  proof: string | null;
  created_by_name: string;
  created_at: string;
}

export interface CreateTruckDispatchUpdateRequest {
  status: TruckDispatchStatus;
  occurred_at?: string;
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

export const dispatchTrackingApi = {
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
