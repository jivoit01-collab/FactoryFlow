import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AllGRPOEntry,
  GRPOAttachment,
  GRPODashboardSummary,
  GRPOHistoryEntry,
  GRPOInspectionReport,
  PendingGRPOEntryWithSuppliers,
  PostGRPORequest,
  PostGRPOResponse,
  PostServiceGRPORequest,
  PostServiceGRPOResponse,
  PreviewPOReceipt,
  ServiceGRPOHistoryEntry,
  ServiceGRPOOptions,
  ServiceGRPOPendingEntry,
  ServiceGRPOPreview,
  Warehouse,
} from '../types';

const SAP_SERVICE_GRPO_POST_TIMEOUT_MS = 5 * 60 * 1000;

export const grpoApi = {
  // Get dashboard insight totals
  async getSummary(): Promise<GRPODashboardSummary> {
    const response = await apiClient.get<GRPODashboardSummary>(API_ENDPOINTS.GRPO.SUMMARY);
    return response.data;
  },

  // Get list of pending gate entries for GRPO posting
  async getPendingEntries(): Promise<PendingGRPOEntryWithSuppliers[]> {
    const response = await apiClient.get<PendingGRPOEntryWithSuppliers[]>(
      API_ENDPOINTS.GRPO.PENDING,
    );
    return response.data;
  },

  // Get all gate entries visible to GRPO (gate, QC, done)
  async getAllEntries(): Promise<AllGRPOEntry[]> {
    const response = await apiClient.get<AllGRPOEntry[]>(API_ENDPOINTS.GRPO.ALL_ENTRIES);
    return response.data;
  },

  // Get preview data for a specific vehicle entry
  async getPreview(vehicleEntryId: number): Promise<PreviewPOReceipt[]> {
    const response = await apiClient.get<PreviewPOReceipt[]>(
      API_ENDPOINTS.GRPO.PREVIEW(vehicleEntryId),
    );
    return response.data;
  },

  async getInspectionReport(arrivalSlipId: number): Promise<GRPOInspectionReport> {
    const response = await apiClient.get<GRPOInspectionReport>(
      API_ENDPOINTS.GRPO.INSPECTION_REPORT(arrivalSlipId),
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
      const response = await apiClient.post<PostGRPOResponse>(API_ENDPOINTS.GRPO.POST, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    // JSON (no attachments)
    const response = await apiClient.post<PostGRPOResponse>(API_ENDPOINTS.GRPO.POST, jsonData);
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

  async getServicePendingEntries(): Promise<ServiceGRPOPendingEntry[]> {
    const response = await apiClient.get<ServiceGRPOPendingEntry[]>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_PENDING,
    );
    return response.data;
  },

  async getServiceOptions(): Promise<ServiceGRPOOptions> {
    const response = await apiClient.get<ServiceGRPOOptions>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_OPTIONS,
    );
    return response.data;
  },

  async getServicePreview(dispatchPlanId: number): Promise<ServiceGRPOPreview> {
    const response = await apiClient.get<ServiceGRPOPreview>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_PREVIEW(dispatchPlanId),
    );
    return response.data;
  },

  async postService(data: PostServiceGRPORequest): Promise<PostServiceGRPOResponse> {
    const { attachments, ...jsonData } = data;
    const files = attachments ?? [];

    if (files.length > 0) {
      const formData = new FormData();
      formData.append('data', JSON.stringify(jsonData));
      files.forEach((file) => {
        formData.append('attachments', file);
      });
      const response = await apiClient.post<PostServiceGRPOResponse>(
        API_ENDPOINTS.DISPATCH.BILTY_GRPO_POST,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: SAP_SERVICE_GRPO_POST_TIMEOUT_MS,
        },
      );
      return response.data;
    }

    const response = await apiClient.post<PostServiceGRPOResponse>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_POST,
      jsonData,
      { timeout: SAP_SERVICE_GRPO_POST_TIMEOUT_MS },
    );
    return response.data;
  },

  async getServiceHistory(dispatchPlanId?: number): Promise<ServiceGRPOHistoryEntry[]> {
    const params = dispatchPlanId ? { dispatch_plan_id: dispatchPlanId } : undefined;
    const response = await apiClient.get<ServiceGRPOHistoryEntry[]>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_HISTORY,
      { params },
    );
    return response.data;
  },

  async getServiceDetail(postingId: number): Promise<ServiceGRPOHistoryEntry> {
    const response = await apiClient.get<ServiceGRPOHistoryEntry>(
      API_ENDPOINTS.DISPATCH.BILTY_GRPO_DETAIL(postingId),
    );
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
      { headers: { 'Content-Type': 'multipart/form-data' } },
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
