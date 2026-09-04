import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { QCDocumentFileAuditFilters } from '../../types/qcDocumentFileAudit.types';
import { qcDocumentFileAuditApi } from './qcDocumentFileAudit.api';

export const QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS = {
  all: ['qcDocumentFileAudit'] as const,
  list: (filters: QCDocumentFileAuditFilters) =>
    [...QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.all, 'list', filters] as const,
  forDocument: (documentId: number) =>
    [...QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.all, 'document', documentId] as const,
  filterOptions: () => [...QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.all, 'filterOptions'] as const,
};

/**
 * The manager's page of the trail.
 *
 * `keepPreviousData` so paging and re-filtering swap the rows in place rather
 * than blanking the table on every keystroke.
 */
export function useQCDocumentFileAuditLog(filters: QCDocumentFileAuditFilters) {
  return useQuery({
    queryKey: QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.list(filters),
    queryFn: () => qcDocumentFileAuditApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

/** One document's history, fetched only while its panel is open. */
export function useQCDocumentFileHistory(documentId: number | null) {
  return useQuery({
    queryKey: QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.forDocument(documentId!),
    queryFn: () => qcDocumentFileAuditApi.listForDocument(documentId!, { page_size: 200 }),
    enabled: !!documentId,
  });
}

/**
 * Values for the filter dropdowns.
 *
 * Slow-moving — a new name appears only when someone touches a procedure for
 * the first time — so it is not refetched on every focus.
 */
export function useQCDocumentFileAuditFilterOptions(enabled = true) {
  return useQuery({
    queryKey: QC_DOCUMENT_FILE_AUDIT_QUERY_KEYS.filterOptions(),
    queryFn: () => qcDocumentFileAuditApi.filterOptions(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
