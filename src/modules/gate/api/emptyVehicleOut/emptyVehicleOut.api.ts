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
  created_at: string;
  updated_at: string;
}

export interface EmptyVehicleGateOutParams {
  from_date?: string;
  to_date?: string;
  entry_type?: string;
}

export interface EmptyVehicleGateOutCreateRequest {
  vehicle_entry_id: number;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  remarks?: string;
}

function buildQuery(params?: EmptyVehicleGateOutParams) {
  const queryParams = new URLSearchParams();

  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.entry_type) queryParams.append('entry_type', params.entry_type);

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

  async create(
    data: EmptyVehicleGateOutCreateRequest,
  ): Promise<EmptyVehicleGateOutEntry> {
    const response = await apiClient.post<EmptyVehicleGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_OUTS,
      data,
    );
    return response.data;
  },
};
