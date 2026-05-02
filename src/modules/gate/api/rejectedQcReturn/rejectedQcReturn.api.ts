import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface RejectedQCReturnCreateRequest {
  vehicle_id: number;
  driver_id: number;
  gate_out_date: string;
  out_time?: string | null;
  challan_no?: string;
  eway_bill_no?: string;
  manual_sap_reference?: string;
  security_name?: string;
  remarks?: string;
  inspection_ids: number[];
}

export interface RejectedQCReturnEntryResponse {
  id: number;
  entry_no: string;
  vehicle: number;
  vehicle_number: string;
  driver: number;
  driver_name: string;
  gate_out_date: string;
  remarks?: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  items?: Array<{
    id: number;
    inspection_id: number;
    gate_entry_no: string;
    report_no: string;
    internal_lot_no: string;
    item_name: string;
    supplier_name: string;
    quantity: string;
    uom: string;
  }>;
  created_at: string;
  updated_at: string;
}

export const rejectedQCReturnApi = {
  async list(): Promise<RejectedQCReturnEntryResponse[]> {
    const response = await apiClient.get<RejectedQCReturnEntryResponse[]>(
      API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS,
    );
    return response.data;
  },

  async create(data: RejectedQCReturnCreateRequest): Promise<RejectedQCReturnEntryResponse> {
    const response = await apiClient.post<RejectedQCReturnEntryResponse>(
      API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS,
      data,
    );
    return response.data;
  },
};
