import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface DailyNeedFullView {
  gate_entry: {
    id: number;
    entry_no: string;
    status: string;
    is_locked: boolean;
    created_at: string;
    entry_type: string;
  };
  vehicle: {
    vehicle_number: string;
    vehicle_type: string;
    capacity_ton: number;
  };
  driver: {
    name: string;
    mobile_no: string;
    license_no: string;
  };
  security_check: {
    id: number;
    vehicle_condition_ok: boolean;
    tyre_condition_ok: boolean;
    fire_extinguisher_available: boolean;
    alcohol_test_done: boolean;
    alcohol_test_passed: boolean;
    is_submitted: boolean;
    remarks: string;
    inspected_by: string;
  } | null;
  daily_need_details: {
    category: string;
    supplier_name: string;
    material_name: string;
    quantity: number;
    unit: string;
    receiving_department: string;
    bill_number: string | null;
    delivery_challan_number: string | null;
    canteen_supervisor: string | null;
    vehicle_or_person_name: string | null;
    contact_number: string | null;
    remarks: string | null;
    created_by: string;
    created_at: string;
  } | null;
}

export interface CompleteResponse {
  message: string;
}

export const dailyNeedFullViewApi = {
  async get(entryId: number): Promise<DailyNeedFullView> {
    const response = await apiClient.get<DailyNeedFullView>(
      API_ENDPOINTS.DAILY_NEEDS_GATEIN.FULL_VIEW(entryId),
    );
    return response.data;
  },

  async complete(entryId: number): Promise<CompleteResponse> {
    const response = await apiClient.post<CompleteResponse>(
      API_ENDPOINTS.DAILY_NEEDS_GATEIN.COMPLETE(entryId),
    );
    return response.data;
  },
};
