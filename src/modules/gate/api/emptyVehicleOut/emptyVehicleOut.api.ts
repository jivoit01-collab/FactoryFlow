import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface EmptyVehicleEligibleEntry {
  id: number;
  entry_no: string;
  entry_type: string;
  status: string;
  entry_time: string;
  vehicle_id: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  driver_id: number;
  driver_name: string;
  driver_mobile: string;
  remarks?: string;
  // Cross-company context (populated when the board aggregates all companies).
  company_id?: number;
  company_code?: string | null;
  company_name?: string | null;
  /** Shared physical-trip id; sibling company entries share the same arrival. */
  arrival?: number | null;
  arrival_no?: string | null;
  // Side effects of marking this vehicle out empty.
  release_invoice_count: number;
  release_cancels_docking: boolean;
}

export interface EmptyVehicleGateOutEntry {
  id: number;
  entry_no: string;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_type: string;
  vehicle_entry_time: string;
  vehicle: number;
  vehicle_number: string;
  driver: number;
  driver_name: string;
  driver_mobile: string;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  remarks?: string;
  status: 'COMPLETED' | 'CANCELLED';
  cancel_reason?: string;
  cancelled_at?: string | null;
  cancelled_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmptyVehicleGateOutParams {
  from_date?: string;
  to_date?: string;
  entry_type?: string;
  /** 1 = aggregate eligible entries across every company the user belongs to. */
  all_companies?: number;
}

export interface EmptyVehicleGateOutCreateRequest {
  vehicle_entry_id: number;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  remarks?: string;
}

export interface EmptyVehicleGateOutCancelRequest {
  cancel_reason: string;
}

function buildQuery(params?: EmptyVehicleGateOutParams) {
  const queryParams = new URLSearchParams();

  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.entry_type) queryParams.append('entry_type', params.entry_type);
  if (params?.all_companies) {
    queryParams.append('all_companies', String(params.all_companies));
  }

  return queryParams.toString();
}

export const emptyVehicleOutApi = {
  async eligibleEntries(
    params?: EmptyVehicleGateOutParams,
  ): Promise<EmptyVehicleEligibleEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_ELIGIBLE_ENTRIES}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_ELIGIBLE_ENTRIES;
    const response = await apiClient.get<EmptyVehicleEligibleEntry[]>(url);
    return response.data;
  },

  async list(params?: EmptyVehicleGateOutParams): Promise<EmptyVehicleGateOutEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUTS;
    const response = await apiClient.get<EmptyVehicleGateOutEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<EmptyVehicleGateOutEntry> {
    const response = await apiClient.get<EmptyVehicleGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUT_BY_ID(id),
    );
    return response.data;
  },

  async create(
    data: EmptyVehicleGateOutCreateRequest,
  ): Promise<EmptyVehicleGateOutEntry> {
    const response = await apiClient.post<EmptyVehicleGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUTS,
      data,
    );
    return response.data;
  },

  async cancel(
    id: number,
    data: EmptyVehicleGateOutCancelRequest,
  ): Promise<EmptyVehicleGateOutEntry> {
    const response = await apiClient.post<EmptyVehicleGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUT_CANCEL_BY_ID(id),
      data,
    );
    return response.data;
  },
};
