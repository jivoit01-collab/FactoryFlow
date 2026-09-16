import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type DockingScanSkipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A file the approver filed with their decision (mail, signed slip, photo of the load). */
export interface DockingApprovalAttachment {
  id: number;
  /** Server-relative media path — run it through resolveFileUrl() before opening it. */
  file: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  uploaded_by: number | null;
  uploaded_by_name: string;
  uploaded_at: string;
}

/** Matches the backend limits in docking_admin/serializers.py. */
export const REVIEW_ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxBytes: 10 * 1024 * 1024,
  accept:
    '.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.eml,.msg',
} as const;

export interface DockingScanSkipRequest {
  id: number;
  sales_dispatch: number;
  entry_no: string;
  vehicle_no: string;
  customer_name: string;
  sap_doc_num: string;
  document_type: string;
  dispatch_status: string;
  reason: string;
  status: DockingScanSkipStatus;
  requested_by: number | null;
  requested_by_name: string;
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  attachments: DockingApprovalAttachment[];
  created_at: string;
  updated_at: string;
}

export type DockingScanSkipListParams = {
  status?: DockingScanSkipStatus;
  sales_dispatch?: number;
};

export interface DockingScanSkipCreateRequest {
  sales_dispatch: number;
  reason: string;
}

export interface DockingScanSkipReviewRequest {
  notes?: string;
  /** Evidence the approver attaches to the decision. Sent as multipart when present. */
  attachments?: File[];
}

/**
 * Approve/reject body. Files force multipart; without them the review stays a plain JSON
 * post, so every existing caller (and the operator-side flows) is untouched.
 */
export function buildReviewRequest(data: { notes?: string; attachments?: File[] } = {}) {
  const files = data.attachments ?? [];
  if (files.length === 0) {
    return { body: { notes: data.notes ?? '' } as Record<string, unknown>, config: undefined };
  }
  const formData = new FormData();
  formData.append('notes', data.notes ?? '');
  // One repeated key per file — DRF reads the list off the multipart payload.
  files.forEach((file) => formData.append('attachments', file));
  return {
    body: formData,
    config: { headers: { 'Content-Type': 'multipart/form-data' } },
  };
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

export const dockingApprovalApi = {
  async list(params?: DockingScanSkipListParams): Promise<DockingScanSkipRequest[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS}?${query}`
      : API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS;
    const response = await apiClient.get<DockingScanSkipRequest[]>(url);
    return response.data;
  },

  async byDispatch(entryId: number): Promise<DockingScanSkipRequest | null> {
    const response = await apiClient.get<DockingScanSkipRequest | null>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_BY_DISPATCH(entryId),
    );
    return response.data ?? null;
  },

  async create(data: DockingScanSkipCreateRequest): Promise<DockingScanSkipRequest> {
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS,
      data,
    );
    return response.data;
  },

  async approve(
    id: number,
    data: DockingScanSkipReviewRequest = {},
  ): Promise<DockingScanSkipRequest> {
    const { body, config } = buildReviewRequest(data);
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_APPROVE(id),
      body,
      config,
    );
    return response.data;
  },

  async reject(id: number, data: DockingScanSkipReviewRequest): Promise<DockingScanSkipRequest> {
    const { body, config } = buildReviewRequest(data);
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_REJECT(id),
      body,
      config,
    );
    return response.data;
  },
};
