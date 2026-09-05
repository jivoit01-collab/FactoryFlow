import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  QCDocumentFileAuditFilterOptions,
  QCDocumentFileAuditFilters,
  QCDocumentFileAuditPage,
} from '../../types/qcDocumentFileAudit.types';

/** Drop empty filters so they never reach the query string as `?user=`. */
function cleanFilters(filters: QCDocumentFileAuditFilters = {}): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as Record<string, string | number>;
}

export const qcDocumentFileAuditApi = {
  /** The whole trail, filtered and paginated. */
  async list(filters: QCDocumentFileAuditFilters = {}): Promise<QCDocumentFileAuditPage> {
    const response = await apiClient.get<QCDocumentFileAuditPage>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_AUDIT_LOG,
      { params: cleanFilters(filters) },
    );
    return response.data;
  },

  /** One document's trail, for the History panel inside the viewer. */
  async listForDocument(
    documentId: number,
    filters: QCDocumentFileAuditFilters = {},
  ): Promise<QCDocumentFileAuditPage> {
    const response = await apiClient.get<QCDocumentFileAuditPage>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_AUDIT_LOG_FOR(documentId),
      { params: cleanFilters(filters) },
    );
    return response.data;
  },

  async filterOptions(): Promise<QCDocumentFileAuditFilterOptions> {
    const response = await apiClient.get<QCDocumentFileAuditFilterOptions>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_AUDIT_FILTERS,
    );
    return response.data;
  },

  /**
   * The same rows the manager is looking at, as a CSV file.
   *
   * `export=csv`, not `format=csv`: DRF reserves `format` for content
   * negotiation and would answer 404 before the view ever ran. Fetched through
   * the authenticated client rather than linked to directly, because the
   * endpoint is permission-checked and a plain <a href> carries no auth header.
   */
  async exportCsv(filters: QCDocumentFileAuditFilters = {}): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_AUDIT_LOG,
      {
        params: { ...cleanFilters(filters), export: 'csv' },
        responseType: 'blob',
      },
    );
    return response.data;
  },
};
