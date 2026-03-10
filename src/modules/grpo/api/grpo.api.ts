import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  GRPOAttachment,
  GRPOHistoryEntry,
  PendingGRPOEntry,
  PostGRPORequest,
  PostGRPOResponse,
  PreviewPOReceipt,
  Warehouse,
} from '../types';

export const grpoApi = {
  // Get list of pending gate entries for GRPO posting
  async getPendingEntries(): Promise<PendingGRPOEntry[]> {
    const response = await apiClient.get<PendingGRPOEntry[]>(API_ENDPOINTS.GRPO.PENDING);
    return response.data;
  },

  // Get preview data for a specific vehicle entry
  async getPreview(vehicleEntryId: number): Promise<PreviewPOReceipt[]> {
    const response = await apiClient.get<PreviewPOReceipt[]>(
      API_ENDPOINTS.GRPO.PREVIEW(vehicleEntryId),
    );
    return response.data;
  },

  // Post GRPO to SAP
  // Uses multipart/form-data when attachments are provided, JSON otherwise
  async post(data: PostGRPORequest): Promise<PostGRPOResponse> {
    const { attachments, ...jsonData } = data;
    const files = attachments ?? [];

    if (files.length > 0) {
      // Multipart/form-data with files
      const formData = new FormData();
      formData.append('data', JSON.stringify(jsonData));
      files.forEach((file) => {
        formData.append('attachments', file);
      });
      // Do NOT set Content-Type header — browser sets it with correct boundary
      const response = await apiClient.post<PostGRPOResponse>(
        API_ENDPOINTS.GRPO.POST,
        formData,
      );
      return response.data;
    }

    // JSON (no attachments)
    const response = await apiClient.post<PostGRPOResponse>(
      API_ENDPOINTS.GRPO.POST,
      jsonData,
    );
    return response.data;
  },

  // Get posting history
  async getHistory(vehicleEntryId?: number): Promise<GRPOHistoryEntry[]> {
    const params = vehicleEntryId ? { vehicle_entry_id: vehicleEntryId } : undefined;
    const response = await apiClient.get<GRPOHistoryEntry[]>(API_ENDPOINTS.GRPO.HISTORY, {
      params,
    });
    return response.data;
  },

  // Get single posting detail
  async getDetail(postingId: number): Promise<GRPOHistoryEntry> {
    const response = await apiClient.get<GRPOHistoryEntry>(API_ENDPOINTS.GRPO.DETAIL(postingId));
    return response.data;
  },

  // Get list of warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get<Warehouse[]>(API_ENDPOINTS.PO.WAREHOUSES);
    return response.data;
  },

  // List attachments for a GRPO posting
  async getAttachments(postingId: number): Promise<GRPOAttachment[]> {
    const response = await apiClient.get<GRPOAttachment[]>(
      API_ENDPOINTS.GRPO.ATTACHMENTS(postingId),
    );
    return response.data;
  },

  // Upload an attachment to a GRPO posting
  async uploadAttachment(postingId: number, file: File): Promise<GRPOAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<GRPOAttachment>(
      API_ENDPOINTS.GRPO.ATTACHMENTS(postingId),
      formData,
    );
    return response.data;
  },

  // Delete an attachment
  async deleteAttachment(postingId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.GRPO.ATTACHMENT_DELETE(postingId, attachmentId));
  },

  // Retry a failed SAP attachment upload
  async retryAttachment(postingId: number, attachmentId: number): Promise<GRPOAttachment> {
    const response = await apiClient.post<GRPOAttachment>(
      API_ENDPOINTS.GRPO.ATTACHMENT_RETRY(postingId, attachmentId),
    );
    return response.data;
  },
};
