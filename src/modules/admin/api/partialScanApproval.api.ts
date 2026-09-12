import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type DockingPartialScanStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DockingPartialScanRequest {
  id: number;
  sales_dispatch: number;
  /** The BILL this approval covers; null on legacy load-wide rows. */
  document: number | null;
  entry_no: string;
  vehicle_no: string;
  company_code: string;
  company_name: string;
  customer_name: string;
  sap_doc_num: string;
  document_type: string;
  dispatch_status: string;
  scanned_boxes: number;
  expected_boxes: number;
  /**
   * Scanned vs invoiced QUANTITY for the bill. The pair that always means something: a
   * bill of goods SAP ships per piece has no box target, so its boxes read "0 of 0" while
   * hundreds of tins are still on the floor.
   */
  scanned_pieces: string;
  expected_pieces: string;
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

  /**
   * Every partial-dispatch request on this docking's TRUCK.
   *
   * An approval names one bill and the shortfall is judged load-wide, so the operator
   * standing on a fully scanned docking still has to see the requests raised for its
   * neighbour's bills — otherwise the screen says "no request" while three sit in the
   * admin queue.
   */
  async byDispatch(entryId: number): Promise<DockingPartialScanRequest[]> {
    const response = await apiClient.get<DockingPartialScanRequest[] | null>(
      API_ENDPOINTS.DOCKING_ADMIN.PARTIAL_SCAN_REQUEST_BY_DISPATCH(entryId),
    );
    return response.data ?? [];
  },

  /** Raises one request per bill that is short — the response is all of them. */
  async create(data: DockingPartialScanCreateRequest): Promise<DockingPartialScanRequest[]> {
    const response = await apiClient.post<DockingPartialScanRequest[]>(
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
