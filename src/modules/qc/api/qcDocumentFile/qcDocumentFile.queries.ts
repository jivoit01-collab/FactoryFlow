import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  UpdateQCDocumentFileRequest,
  UploadQCDocumentFileRequest,
} from '../../types/qcDocumentFile.types';
import { qcDocumentFileApi } from './qcDocumentFile.api';

export const QC_DOCUMENT_FILE_QUERY_KEYS = {
  all: ['qcDocumentFiles'] as const,
  list: (search: string) => [...QC_DOCUMENT_FILE_QUERY_KEYS.all, 'list', search] as const,
  detail: (id: number) => [...QC_DOCUMENT_FILE_QUERY_KEYS.all, 'detail', id] as const,
};

export function useQCDocumentFiles(search = '') {
  return useQuery({
    queryKey: QC_DOCUMENT_FILE_QUERY_KEYS.list(search),
    queryFn: () => qcDocumentFileApi.list(search),
  });
}

export function useQCDocumentFile(id: number | null) {
  return useQuery({
    queryKey: QC_DOCUMENT_FILE_QUERY_KEYS.detail(id!),
    queryFn: () => qcDocumentFileApi.getById(id!),
    enabled: !!id,
  });
}

export function useUploadQCDocumentFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UploadQCDocumentFileRequest) => qcDocumentFileApi.upload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_DOCUMENT_FILE_QUERY_KEYS.all });
    },
  });
}

export function useUpdateQCDocumentFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQCDocumentFileRequest }) =>
      qcDocumentFileApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_DOCUMENT_FILE_QUERY_KEYS.all });
    },
  });
}

export function useDeleteQCDocumentFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => qcDocumentFileApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_DOCUMENT_FILE_QUERY_KEYS.all });
    },
  });
}

/**
 * The PDF bytes for the viewer.
 *
 * Kept out of the list cache (blobs are large) and only fetched while a
 * document is actually open.
 */
export function useQCDocumentFileBlob(id: number | null) {
  return useQuery({
    queryKey: [...QC_DOCUMENT_FILE_QUERY_KEYS.detail(id!), 'blob'],
    queryFn: () => qcDocumentFileApi.download(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
