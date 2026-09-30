import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  QCPrintDocument,
  QCPrintDocumentOption,
  SaveQCPrintDocumentRequest,
} from '../../types';

export const printDocumentApi = {
  async getList(): Promise<QCPrintDocument[]> {
    const response = await apiClient.get<QCPrintDocument[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PRINT_DOCUMENTS,
    );
    return response.data;
  },

  /** Every form a number can be set for: the fixed reports and each production QC form. */
  async getOptions(): Promise<QCPrintDocumentOption[]> {
    const response = await apiClient.get<QCPrintDocumentOption[]>(
      `${API_ENDPOINTS.QUALITY_CONTROL_V2.PRINT_DOCUMENTS}options/`,
    );
    return response.data;
  },

  async create(data: SaveQCPrintDocumentRequest): Promise<QCPrintDocument> {
    const response = await apiClient.post<QCPrintDocument>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PRINT_DOCUMENTS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: SaveQCPrintDocumentRequest): Promise<QCPrintDocument> {
    const response = await apiClient.put<QCPrintDocument>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PRINT_DOCUMENT_BY_ID(id),
      data,
    );
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.PRINT_DOCUMENT_BY_ID(id));
  },
};
