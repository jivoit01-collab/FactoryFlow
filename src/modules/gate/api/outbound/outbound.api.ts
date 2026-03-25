import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

// Types

export interface OutboundPurpose {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface OutboundEntry {
  id: number;
  purpose: { id: number; name: string } | number | null;
  sales_order_ref: string;
  customer_name: string;
  customer_code: string;
  transporter_name: string;
  transporter_contact: string;
  lr_number: string;
  vehicle_empty_confirmed: boolean;
  trailer_type: string;
  trailer_length_ft: string | null;
  assigned_zone: string;
  assigned_bay: string;
  expected_loading_time: string | null;
  arrival_time: string;
  released_for_loading_at: string | null;
  exit_time: string | null;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOutboundRequest {
  purpose?: number | null;
  sales_order_ref?: string;
  customer_name?: string;
  customer_code?: string;
  transporter_name?: string;
  transporter_contact?: string;
  lr_number?: string;
  vehicle_empty_confirmed?: boolean;
  trailer_type?: string;
  trailer_length_ft?: number | null;
  assigned_zone?: string;
  assigned_bay?: string;
  expected_loading_time?: string | null;
  remarks?: string;
}

export interface CreateOutboundResponse {
  message: string;
  id: number;
}

export interface AvailableVehicle {
  id: number;
  vehicle_entry_id: number;
  entry_no: string;
  vehicle_number: string;
  driver_name: string;
  gate_status: string;
  customer_name: string;
  sales_order_ref: string;
  assigned_zone: string;
  assigned_bay: string;
  vehicle_empty_confirmed: boolean;
  arrival_time: string;
  released_for_loading_at: string | null;
}

// Full view types for Review page
export interface OutboundFullViewGateEntry {
  id: number;
  entry_no: string;
  status: string;
  is_locked: boolean;
  created_at: string;
  updated_at?: string;
  entry_type: string;
}

export interface OutboundFullViewVehicle {
  vehicle_number: string;
  vehicle_type: string;
  capacity_ton: number;
}

export interface OutboundFullViewDriver {
  name: string;
  mobile_no: string;
  license_no: string;
}

export interface OutboundFullViewSecurityCheck {
  vehicle_condition_ok: boolean;
  tyre_condition_ok: boolean;
  alcohol_test_passed: boolean;
  is_submitted: boolean;
  remarks?: string;
  inspected_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface OutboundFullViewDetails {
  purpose: string;
  sales_order_ref: string;
  customer_name: string;
  customer_code: string;
  transporter_name: string;
  transporter_contact: string;
  lr_number: string;
  vehicle_empty_confirmed: boolean;
  trailer_type: string;
  trailer_length_ft: string | null;
  assigned_zone: string;
  assigned_bay: string;
  expected_loading_time: string | null;
  released_for_loading_at: string | null;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface OutboundFullView {
  gate_entry: OutboundFullViewGateEntry;
  vehicle: OutboundFullViewVehicle;
  driver: OutboundFullViewDriver;
  security_check?: OutboundFullViewSecurityCheck;
  outbound_details?: OutboundFullViewDetails;
}

// API functions
export const outboundGateApi = {
  getPurposes: async (): Promise<OutboundPurpose[]> => {
    const response = await apiClient.get<OutboundPurpose[]>(
      API_ENDPOINTS.OUTBOUND_GATEIN.PURPOSES,
    );
    return response.data;
  },

  getByEntryId: async (entryId: number): Promise<OutboundEntry> => {
    const response = await apiClient.get<OutboundEntry>(
      API_ENDPOINTS.OUTBOUND_GATEIN.GET(entryId),
    );
    return response.data;
  },

  create: async (entryId: number, data: CreateOutboundRequest): Promise<CreateOutboundResponse> => {
    const response = await apiClient.post<CreateOutboundResponse>(
      API_ENDPOINTS.OUTBOUND_GATEIN.CREATE(entryId),
      data,
    );
    return response.data;
  },

  update: async (entryId: number, data: CreateOutboundRequest): Promise<OutboundEntry> => {
    const response = await apiClient.put<OutboundEntry>(
      API_ENDPOINTS.OUTBOUND_GATEIN.UPDATE(entryId),
      data,
    );
    return response.data;
  },

  getFullView: async (entryId: number): Promise<OutboundFullView> => {
    const response = await apiClient.get<OutboundFullView>(
      API_ENDPOINTS.OUTBOUND_GATEIN.FULL_VIEW(entryId),
    );
    return response.data;
  },

  complete: async (entryId: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      API_ENDPOINTS.OUTBOUND_GATEIN.COMPLETE(entryId),
    );
    return response.data;
  },

  releaseForLoading: async (entryId: number): Promise<OutboundEntry> => {
    const response = await apiClient.post<OutboundEntry>(
      API_ENDPOINTS.OUTBOUND_GATEIN.RELEASE(entryId),
    );
    return response.data;
  },

  getAvailableVehicles: async (): Promise<AvailableVehicle[]> => {
    const response = await apiClient.get<AvailableVehicle[]>(
      API_ENDPOINTS.OUTBOUND_GATEIN.AVAILABLE_VEHICLES,
    );
    return response.data;
  },
};
