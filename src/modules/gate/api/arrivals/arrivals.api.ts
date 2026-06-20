import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type VehicleArrivalStatusValue = 'INSIDE' | 'LOADING' | 'DEPARTED' | 'CANCELLED';

export interface ArrivalExpectedBill {
  dispatch_plan_id: number;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  invoice_number: string;
  invoice_weight: string | number | null;
  total_litres: string | number | null;
  place_of_supply: string;
  dispatch_date: string | null;
}

export interface ArrivalExpectedCompany {
  company_id: number;
  company_code: string;
  company_name: string;
  bills: ArrivalExpectedBill[];
}

export interface ArrivalExpectedResponse {
  vehicle_id: number;
  companies: ArrivalExpectedCompany[];
}

export interface VehicleArrivalGateIn {
  id: number;
  entry_no: string;
  company_id: number;
  company_code: string;
  company_name: string;
  retired_at: string | null;
  cover_count: number;
}

export interface VehicleArrival {
  id: number;
  arrival_no: string;
  vehicle: number;
  vehicle_no: string;
  driver: number;
  driver_name: string;
  gate_in_date: string;
  in_time: string;
  tare_weight: string | number | null;
  weighbridge_slip_no: string;
  security_name: string;
  remarks: string;
  status: VehicleArrivalStatusValue;
  gate_out_date: string | null;
  out_time: string | null;
  departed_at: string | null;
  gate_ins: VehicleArrivalGateIn[];
}

export interface ArrivalCreateRequest {
  vehicle_id: number;
  driver_id: number;
  gate_in_date: string;
  in_time: string;
  tare_weight?: number | string | null;
  weighbridge_slip_no?: string;
  security_name?: string;
  remarks?: string;
}

export const arrivalsApi = {
  async expected(vehicleId: number): Promise<ArrivalExpectedResponse> {
    const response = await apiClient.get<ArrivalExpectedResponse>(
      `${API_ENDPOINTS.GATE_CORE.ARRIVALS_EXPECTED}?vehicle_id=${vehicleId}`,
    );
    return response.data;
  },

  async list(openOnly = false): Promise<VehicleArrival[]> {
    const url = openOnly
      ? `${API_ENDPOINTS.GATE_CORE.ARRIVALS}?open_only=true`
      : API_ENDPOINTS.GATE_CORE.ARRIVALS;
    const response = await apiClient.get<VehicleArrival[]>(url);
    return response.data;
  },

  async create(data: ArrivalCreateRequest): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(API_ENDPOINTS.GATE_CORE.ARRIVALS, data);
    return response.data;
  },

  async depart(id: number, securityName?: string): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_DEPART_BY_ID(id),
      { security_name: securityName ?? '' },
    );
    return response.data;
  },

  async emptyOut(id: number, reason?: string): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_EMPTY_OUT_BY_ID(id),
      { reason: reason ?? '' },
    );
    return response.data;
  },
};
