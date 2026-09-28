import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { openOrSave } from '../utils/attachments';
import { attachmentErrorMessage, type DocumentFilters, sapDocumentsApi } from './sap-documents.api';

/** Every query key this module owns. Nothing here writes, so nothing invalidates. */
const KEYS = {
  types: ['sapDocuments', 'types'] as const,
  list: (type: string, filters: DocumentFilters) => ['sapDocuments', 'list', type, filters] as const,
  detail: (type: string, docEntry: number) => ['sapDocuments', 'detail', type, docEntry] as const,
  attachments: (absEntry: number) => ['sapDocuments', 'attachments', absEntry] as const,
};

export function useDocumentTypes(enabled = true) {
  return useQuery({ queryKey: KEYS.types, queryFn: sapDocumentsApi.types, staleTime: Infinity, enabled });
}

export function useDocumentList(type: string, filters: DocumentFilters) {
  return useQuery({
    queryKey: KEYS.list(type, filters),
    queryFn: () => sapDocumentsApi.list(type, filters),
    enabled: !!type,
    placeholderData: keepPreviousData,
  });
}

/** One document. Outgoing-payment drafts come from their own endpoint (HANA). */
export function useDocumentDetail(type: string, docEntry: number | null) {
  return useQuery({
    queryKey: KEYS.detail(type, docEntry ?? 0),
    queryFn: () =>
      type === 'PaymentDrafts'
        ? sapDocumentsApi.paymentDraft(docEntry as number)
        : sapDocumentsApi.detail(type, docEntry as number),
    enabled: !!type && docEntry !== null,
  });
}

export function useAttachmentLines(absEntry: number | null) {
  return useQuery({
    queryKey: KEYS.attachments(absEntry ?? 0),
    queryFn: () => sapDocumentsApi.attachments(absEntry as number),
    enabled: !!absEntry && absEntry > 0,
    staleTime: 60_000,
  });
}

/** Fetch one attachment through the API (it checks both rights) and open or save it. */
export function useOpenAttachment() {
  return useMutation({
    mutationFn: async ({ absEntry, line, fileName }: { absEntry: number; line: number; fileName: string }) => ({
      blob: await sapDocumentsApi.downloadAttachment(absEntry, line),
      fileName,
    }),
    onSuccess: ({ blob, fileName }) => {
      openOrSave(blob, fileName);
    },
    onError: async (error) => {
      toast.error(await attachmentErrorMessage(error));
    },
  });
}
