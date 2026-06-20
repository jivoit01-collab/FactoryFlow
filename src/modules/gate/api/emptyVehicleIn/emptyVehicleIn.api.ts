import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { PipelineStatus } from '@/modules/dashboards/dispatch-pipeline/types';

export type EmptyVehicleGateInReasonValue =
  | 'BST'
  | 'DISPATCH'
  | 'REPAIR_MOVEMENT'
  | 'JOB_WORK'
  | 'OTHER';

export interface EmptyVehicleGateInReason {
  value: EmptyVehicleGateInReasonValue;
  label: string;
}

export interface EmptyVehicleGateInItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  sap_quantity: string;
  actual_quantity: string;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
}

export interface EmptyVehicleGateInItemRequest {
  line_num: number;
  actual_quantity: number;
}

export interface EmptyVehicleGateInEntry {
  id: number;
  entry_no: string;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  vehicle_entry_time: string;
  vehicle: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  transporter_name?: string | null;
  driver: number;
  driver_name: string;
  driver_mobile: string;
  reason: EmptyVehicleGateInReasonValue;
  reason_display: string;
  gate_in_date: string;
  in_time: string;
  sap_doc_entry?: number | null;
  sap_doc_num?: string;
  sap_doc_date?: string | null;
  sap_from_warehouse?: string;
  sap_to_warehouse?: string;
  sap_reference?: string;
  sap_comments?: string;
  sap_line_count?: number;
  sap_total_quantity?: number | string;
  document_reference?: string;
  document_notes?: string;
  pipeline_status?: PipelineStatus | null;
  items: EmptyVehicleGateInItem[];
  bst_gate_out_id?: number | null;
  bst_gate_out_entry_no?: string;
  bst_gate_out_status?: string;
  is_bst_document_locked?: boolean;
  security_name?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface EmptyVehicleGateInParams {
  from_date?: string;
  to_date?: string;
  reason?: EmptyVehicleGateInReasonValue | string;
  inside_only?: boolean;
}

export interface EmptyVehicleGateInCreateRequest {
  vehicle_id: number;
  driver_id: number;
  reason: EmptyVehicleGateInReasonValue;
  gate_in_date: string;
  in_time: string;
  sap_doc_entry?: number | null;
  items?: EmptyVehicleGateInItemRequest[];
  document_reference?: string;
  document_notes?: string;
  security_name?: string;
  remarks?: string;
}

export interface EmptyVehicleGateInUpdateRequest {
  sap_doc_entry?: number | null;
  items?: EmptyVehicleGateInItemRequest[];
  document_reference?: string;
  document_notes?: string;
  security_name?: string;
  remarks?: string;
}

function buildQuery(params?: EmptyVehicleGateInParams) {
  const queryParams = new URLSearchParams();

  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.reason) queryParams.append('reason', params.reason);
  if (params?.inside_only) queryParams.append('inside_only', 'true');

  return queryParams.toString();
}

export const emptyVehicleInApi = {
  async reasons(): Promise<EmptyVehicleGateInReason[]> {
    const response = await apiClient.get<EmptyVehicleGateInReason[]>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_REASONS,
    );
    return response.data;
  },

  async list(params?: EmptyVehicleGateInParams): Promise<EmptyVehicleGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS;
    const response = await apiClient.get<EmptyVehicleGateInEntry[]>(url);
    return response.data;
  },

  async eligible(params?: EmptyVehicleGateInParams): Promise<EmptyVehicleGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_ELIGIBLE}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_ELIGIBLE;
    const response = await apiClient.get<EmptyVehicleGateInEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.get<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_BY_ID(id),
    );
    return response.data;
  },

  async create(data: EmptyVehicleGateInCreateRequest): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.post<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: EmptyVehicleGateInUpdateRequest): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.patch<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(id: number): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.post<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_COMPLETE_BY_ID(id),
    );
    return response.data;
  },
};
