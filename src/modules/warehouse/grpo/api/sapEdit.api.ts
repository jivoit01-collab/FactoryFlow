import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  SapGRPODocument,
  SapGRPOEditRequest,
  SapGRPOEditResponse,
  SapGRPOFindResult,
  SapGRPOType,
} from '../types';

// A save reads SAP, writes it and reads it back; the Service Layer can take a
// while over all three. The posting queue keeps the edit if this times out.
const SAP_EDIT_TIMEOUT_MS = 5 * 60 * 1000;

export const grpoSapEditApi = {
  /** The GRPOs in SAP with this number and type, in the current company. */
  async find(docNum: string, docType: SapGRPOType): Promise<SapGRPOFindResult> {
    const response = await apiClient.get<SapGRPOFindResult>(API_ENDPOINTS.GRPO.SAP_EDIT_FIND, {
      params: { doc_num: docNum, doc_type: docType },
    });
    return response.data;
  },

  /** One GRPO as SAP holds it now, with what may change. */
  async get(docEntry: number): Promise<SapGRPODocument> {
    const response = await apiClient.get<SapGRPODocument>(API_ENDPOINTS.GRPO.SAP_EDIT(docEntry));
    return response.data;
  },

  /**
   * Change the GRPO in SAP. Errors are shown on the page, not as a toast: a
   * refusal carries SAP's own words, which belong beside the form.
   */
  async save(
    docEntry: number,
    data: SapGRPOEditRequest,
    attachments: File[] = [],
  ): Promise<SapGRPOEditResponse> {
    const config = { timeout: SAP_EDIT_TIMEOUT_MS, suppressErrorToast: true };
    if (attachments.length === 0) {
      const response = await apiClient.post<SapGRPOEditResponse>(
        API_ENDPOINTS.GRPO.SAP_EDIT(docEntry),
        data,
        config,
      );
      return response.data;
    }
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    attachments.forEach((file) => formData.append('attachments', file));
    const response = await apiClient.post<SapGRPOEditResponse>(
      API_ENDPOINTS.GRPO.SAP_EDIT(docEntry),
      formData,
      { ...config, headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
