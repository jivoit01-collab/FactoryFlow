import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { ControlledDocumentFields } from '@/shared/types';

export interface GateAttachment extends ControlledDocumentFields {
  id: number;
  file: string;
  file_name?: string;
  uploaded_at?: string;
  uploaded_by_name?: string;
  is_active?: boolean;
  removed_at?: string | null;
  removed_by_name?: string;
  remove_reason?: string;
}

export const attachmentApi = {
  async getAll(entryId: number): Promise<GateAttachment[]> {
    const response = await apiClient.get<GateAttachment[]>(
      API_ENDPOINTS.GATE_ATTACHMENTS.BY_ENTRY(entryId),
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  // Full lifecycle (active + removed) for the audit trail.
  async getHistory(entryId: number): Promise<GateAttachment[]> {
    const response = await apiClient.get<GateAttachment[]>(
      API_ENDPOINTS.GATE_ATTACHMENTS.HISTORY(entryId),
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async upload(entryId: number, file: File): Promise<GateAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<GateAttachment>(
      API_ENDPOINTS.GATE_ATTACHMENTS.BY_ENTRY(entryId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  // Soft-remove: the file is retained and stays visible in the audit trail.
  async remove(entryId: number, attachmentId: number, reason?: string): Promise<GateAttachment> {
    const response = await apiClient.delete<GateAttachment>(
      API_ENDPOINTS.GATE_ATTACHMENTS.DETAIL(entryId, attachmentId),
      reason ? { data: { remove_reason: reason } } : undefined,
    );
    return response.data;
  },
};
