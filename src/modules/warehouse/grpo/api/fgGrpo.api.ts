import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  GRPOListParams,
  PaginatedResponse,
  PendingGRPOEntryWithSuppliers,
  PostGRPORequest,
  PostGRPOResponse,
  PreviewPOReceipt,
} from '../types';

/**
 * Finished-goods material GRPO API. Same document flow as the raw-material
 * material GRPO (PO -> PurchaseDeliveryNotes), scoped to FINISHED_GOODS gate
 * entries on the backend and with QC skipped. Uses the direct `/grpo/fg/post/`
 * endpoint (no draft round-trip) since FG has no QC send-back to survive.
 */
function isPaginated<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    !!data && !Array.isArray(data) && Array.isArray((data as PaginatedResponse<T>).results)
  );
}

function normalizePage<T>(
  data: T[] | PaginatedResponse<T>,
  params?: { page?: number; page_size?: number },
): PaginatedResponse<T> {
  if (isPaginated<T>(data)) return data;
  const results = Array.isArray(data) ? data : [];
  return {
    results,
    count: results.length,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? results.length,
    total_pages: 1,
    next: null,
    previous: null,
  };
}

export const fgGrpoApi = {
  async getPendingEntries(
    params: GRPOListParams = {},
  ): Promise<PaginatedResponse<PendingGRPOEntryWithSuppliers>> {
    const response = await apiClient.get<
      PendingGRPOEntryWithSuppliers[] | PaginatedResponse<PendingGRPOEntryWithSuppliers>
    >(API_ENDPOINTS.GRPO.FG_PENDING, { params });
    return normalizePage(response.data, params);
  },

  async getPreview(vehicleEntryId: number): Promise<PreviewPOReceipt[]> {
    const response = await apiClient.get<PreviewPOReceipt[]>(
      API_ENDPOINTS.GRPO.FG_PREVIEW(vehicleEntryId),
    );
    return response.data;
  },

  async post(data: PostGRPORequest): Promise<PostGRPOResponse> {
    const { attachments, ...jsonData } = data;
    const files = attachments ?? [];

    if (files.length > 0) {
      const formData = new FormData();
      formData.append('data', JSON.stringify(jsonData));
      files.forEach((file) => formData.append('attachments', file));
      const response = await apiClient.post<PostGRPOResponse>(
        API_ENDPOINTS.GRPO.FG_POST,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    }

    const response = await apiClient.post<PostGRPOResponse>(API_ENDPOINTS.GRPO.FG_POST, jsonData);
    return response.data;
  },
};
