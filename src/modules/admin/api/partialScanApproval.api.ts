import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type DockingPartialScanStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DockingPartialScanRequest {
  id: number;
  sales_dispatch: number;
  entry_no: string;
  vehicle_no: string;
  customer_name: string;
  sap_doc_num: string;
  document_type: string;
  dispatch_status: string;
  scanned_boxes: number;
  expected_boxes: number;
  reason: string;
  status: DockingPartialScanStatus;
  requested_by: number | null;
  requested_by_name: string;
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export type DockingPartialScanListParams = {
  status?: DockingPartialScanStatus;
  sales_dispatch?: number;
};

export interface DockingPartialScanCreateRequest {
  sales_dispatch: number;
  reason: string;
}

export interface DockingPartialScanReviewRequest {
  notes?: string;
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const queryParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  return queryParams.toString();
}

export const partialScanApprovalApi = {
  async list(params?: DockingPartialScanListParams): Promise<DockingPartialScanRequest[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUESTS}?${query}`
      : API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUESTS;
    const response = await apiClient.get<DockingPartialScanRequest[]>(url);
    return response.data;
  },

  async byDispatch(entryId: number): Promise<DockingPartialScanRequest | null> {
    const response = await apiClient.get<DockingPartialScanRequest | null>(
      API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUEST_BY_DISPATCH(entryId),
    );
    return response.data ?? null;
  },

  async create(data: DockingPartialScanCreateRequest): Promise<DockingPartialScanRequest> {
    const response = await apiClient.post<DockingPartialScanRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUESTS,
      data,
    );
    return response.data;
  },

  async approve(
    id: number,
    data: DockingPartialScanReviewRequest = {},
  ): Promise<DockingPartialScanRequest> {
    const response = await apiClient.post<DockingPartialScanRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUEST_APPROVE(id),
      data,
    );
    return response.data;
  },

  async reject(
    id: number,
    data: DockingPartialScanReviewRequest,
  ): Promise<DockingPartialScanRequest> {
    const response = await apiClient.post<DockingPartialScanRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUEST_REJECT(id),
      data,
    );
    return response.data;
  },
};
