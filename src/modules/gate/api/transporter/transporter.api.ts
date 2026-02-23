import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

// Lightweight type for dropdown list (names endpoint)
export interface TransporterName {
  id: number;
  name: string;
}

// Full transporter details
export interface Transporter {
  id: number;
  name: string;
  contact_person: string;
  mobile_no: string;
  created_at: string;
}

export interface CreateTransporterRequest {
  name: string;
  contact_person: string;
  mobile_no: string;
}

export interface UpdateTransporterRequest extends CreateTransporterRequest {
  id: number;
}

export const transporterApi = {
  /**
   * Get list of transporter names for dropdown (lightweight)
   */
  async getNames(): Promise<TransporterName[]> {
    const response = await apiClient.get<TransporterName[]>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_NAMES,
    );
    return response.data;
  },

  /**
   * Get full transporter details by ID
   */
  async getById(id: number): Promise<Transporter> {
    const response = await apiClient.get<Transporter>(API_ENDPOINTS.VEHICLE.TRANSPORTER_BY_ID(id));
    return response.data;
  },

  /**
   * Get full list of transporters (legacy - use getNames for dropdowns)
   */
  async getList(): Promise<Transporter[]> {
    const response = await apiClient.get<Transporter[]>(API_ENDPOINTS.VEHICLE.TRANSPORTERS);
    return response.data;
  },
  
  async update(data: UpdateTransporterRequest): Promise<Transporter> {
    const formData = new URLSearchParams();
    formData.append('name', data.name);
    formData.append('contact_person', data.contact_person);
    formData.append('mobile_no', data.mobile_no);

    const response = await apiClient.put<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_BY_ID(data.id),
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return response.data;
  },

  async create(data: CreateTransporterRequest): Promise<Transporter> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('name', data.name);
    formData.append('contact_person', data.contact_person);
    formData.append('mobile_no', data.mobile_no);

    const response = await apiClient.post<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTERS,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return response.data;
  },
};
