import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { SalesDispatchGateOut } from '../salesDispatch/salesDispatch.api';

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

export interface VehicleArrivalGateOut {
  id: number;
  entry_no: string;
  company_id: number;
  company_code: string;
  company_name: string;
  status: string;
  gatepass_no: string | null;
  sap_doc_num: string;
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
  gatepass_no: string | null;
  gatepass_printed_at: string | null;
  gatepass_committed_at: string | null;
  gate_ins: VehicleArrivalGateIn[];
  gate_outs: VehicleArrivalGateOut[];
}

export interface ArrivalGatepassCompany {
  docking_id: number;
  entry_no: string;
  company_code: string;
  company_name: string;
  status: string;
  ready: boolean;
  missing: string[];
  gatepass_no: string | null;
}

export interface ArrivalGatepassReadiness {
  ready: boolean;
  companies: ArrivalGatepassCompany[];
  locked_companies: string[];
  arrival_gatepass_no: string | null;
}

/** Coarse stepper hint from the backend workspace; the UI still drives fine state. */
export type ArrivalWorkspaceNextAction =
  | 'dock'
  | 'prepare'
  | 'print'
  | 'commit'
  | 'dispatch'
  | 'depart'
  | 'done'
  | 'idle';

/** The whole truck as one payload — header, per-company dockings, readiness, bills. */
export interface ArrivalWorkspace {
  arrival: VehicleArrival;
  gatepass: ArrivalGatepassReadiness;
  dockings: SalesDispatchGateOut[];
  undocked: ArrivalExpectedCompany[];
  next_action: ArrivalWorkspaceNextAction;
  can_dispatch: boolean;
  can_depart: boolean;
}

/** One physical gross weighing applied to every company's docking on the truck. */
export interface ArrivalWeighmentRequest {
  gross_weight: number | string;
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
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

  async dispatch(id: number): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_DISPATCH_BY_ID(id),
    );
    return response.data;
  },

  async workspace(id: number): Promise<ArrivalWorkspace> {
    const response = await apiClient.get<ArrivalWorkspace>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_WORKSPACE_BY_ID(id),
    );
    return response.data;
  },

  async recordWeighment(id: number, data: ArrivalWeighmentRequest): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_WEIGHMENT_BY_ID(id),
      data,
    );
    return response.data;
  },

  async gatepassReadiness(id: number): Promise<ArrivalGatepassReadiness> {
    const response = await apiClient.get<ArrivalGatepassReadiness>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_GATEPASS_READINESS_BY_ID(id),
    );
    return response.data;
  },

  async gatepassPrint(id: number, printerName?: string): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_GATEPASS_PRINT_BY_ID(id),
      { printer_name: printerName ?? '' },
    );
    return response.data;
  },

  async gatepassCommit(id: number): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_GATEPASS_COMMIT_BY_ID(id),
    );
    return response.data;
  },

  async gatepassReprint(
    id: number,
    reprintReason: string,
    printerName?: string,
  ): Promise<VehicleArrival> {
    const response = await apiClient.post<VehicleArrival>(
      API_ENDPOINTS.GATE_CORE.ARRIVAL_GATEPASS_REPRINT_BY_ID(id),
      { reprint_reason: reprintReason, printer_name: printerName ?? '' },
    );
    return response.data;
  },
};
