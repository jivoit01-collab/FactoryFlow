import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface Weighment {
  id: number;
  gross_weight: string; // API returns as string (e.g., "18500.000")
  tare_weight: string; // API returns as string (e.g., "324.000")
  net_weight: string; // API returns as string (e.g., "18176.000")
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
  remarks?: string;
}

export interface CreateWeighmentRequest {
  gross_weight: number;
  tare_weight: number;
  weighbridge_slip_no: string;
  first_weighment_time?: string;
  second_weighment_time?: string;
  remarks?: string;
}

export const weighmentApi = {
  async get(entryId: number): Promise<Weighment | null> {
    const response = await apiClient.get<Weighment | Weighment[]>(
      API_ENDPOINTS.WEIGHMENT.GET(entryId),
    );
    // API can return:
    // - A single object when data exists: {...}
    // - An array with one object when data exists: [{...}]
    // - An empty array when no data exists: []
    if (Array.isArray(response.data)) {
      // Empty array means no data
      if (response.data.length === 0) {
        return null;
      }
      // Return first element if array has data
      return response.data[0];
    }
    // Single object response
    return response.data;
  },

  async create(entryId: number, data: CreateWeighmentRequest): Promise<Weighment> {
    const response = await apiClient.post<Weighment>(API_ENDPOINTS.WEIGHMENT.CREATE(entryId), data);
    return response.data;
  },
};
