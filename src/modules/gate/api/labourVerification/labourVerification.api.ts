import { apiClient } from '@/core/api/client';

// ─── Types ──────────────────────────────────────────────────

export interface LabourDetailItem {
  name: string;
  contractor?: string;
  skill_type?: string;
}

export interface DepartmentLabourResponse {
  id: number;
  department: number;
  department_name: string;
  labour_count: number;
  labour_details: LabourDetailItem[];
  remarks: string;
  status: 'PENDING' | 'SUBMITTED';
  submitted_by: number | null;
  submitted_by_name: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabourVerificationRequest {
  id: number;
  date: string;
  status: 'OPEN' | 'CLOSED';
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  closed_at: string | null;
  remarks: string;
  total_departments: number;
  submitted_count: number;
  pending_count: number;
  total_labour_count: number;
}

export interface LabourVerificationRequestDetail extends LabourVerificationRequest {
  responses: DepartmentLabourResponse[];
}

export interface TodayRequestResponse extends LabourVerificationRequestDetail {
  exists: boolean;
}

export interface SubmitLabourResponseRequest {
  labour_count: number;
  labour_details?: LabourDetailItem[];
  remarks?: string;
}

export interface VerificationRequestListResponse {
  results: LabourVerificationRequest[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface VerificationRequestFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

// ─── API Functions ──────────────────────────────────────────

export const labourVerificationApi = {
  createRequest: async (): Promise<LabourVerificationRequestDetail> => {
    const response = await apiClient.post<LabourVerificationRequestDetail>(
      '/labour-verification/request/create/',
    );
    return response.data;
  },

  listRequests: async (
    filters?: VerificationRequestFilters,
  ): Promise<VerificationRequestListResponse> => {
    const response = await apiClient.get<VerificationRequestListResponse>(
      '/labour-verification/requests/',
      { params: filters },
    );
    return response.data;
  },

  getTodayRequest: async (): Promise<TodayRequestResponse> => {
    const response = await apiClient.get<TodayRequestResponse>(
      '/labour-verification/request/today/',
    );
    return response.data;
  },

  getRequestDetail: async (id: number): Promise<LabourVerificationRequestDetail> => {
    const response = await apiClient.get<LabourVerificationRequestDetail>(
      `/labour-verification/request/${id}/`,
    );
    return response.data;
  },

  closeRequest: async (id: number): Promise<LabourVerificationRequestDetail> => {
    const response = await apiClient.post<LabourVerificationRequestDetail>(
      `/labour-verification/request/${id}/close/`,
    );
    return response.data;
  },

  submitResponse: async (
    requestId: number,
    data: SubmitLabourResponseRequest,
  ): Promise<DepartmentLabourResponse> => {
    const response = await apiClient.post<DepartmentLabourResponse>(
      `/labour-verification/request/${requestId}/respond/`,
      data,
    );
    return response.data;
  },

  getMyResponse: async (requestId: number): Promise<DepartmentLabourResponse> => {
    const response = await apiClient.get<DepartmentLabourResponse>(
      `/labour-verification/request/${requestId}/my-response/`,
    );
    return response.data;
  },
};
