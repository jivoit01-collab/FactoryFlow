import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SaveQCPrintDocumentRequest } from '../../types';
import { PRODUCTION_QC_QUERY_KEYS } from '../productionQC/productionQC.queries';
import { printDocumentApi } from './printDocument.api';

export const PRINT_DOCUMENT_QUERY_KEYS = {
  all: ['qcPrintDocuments'] as const,
  lists: () => [...PRINT_DOCUMENT_QUERY_KEYS.all, 'list'] as const,
  options: () => [...PRINT_DOCUMENT_QUERY_KEYS.all, 'options'] as const,
};

/** A production QC form's number is read off its parameter type, so refresh those too. */
function refresh(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists() });
  queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.parameterTypes() });
}

export function usePrintDocumentOptions() {
  return useQuery({
    queryKey: PRINT_DOCUMENT_QUERY_KEYS.options(),
    queryFn: () => printDocumentApi.getOptions(),
  });
}

export function usePrintDocuments() {
  return useQuery({
    queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists(),
    queryFn: () => printDocumentApi.getList(),
  });
}

export function useCreatePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveQCPrintDocumentRequest) => printDocumentApi.create(data),
    onSuccess: () => {
      refresh(queryClient);
    },
  });
}

export function useUpdatePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SaveQCPrintDocumentRequest }) =>
      printDocumentApi.update(id, data),
    onSuccess: () => {
      refresh(queryClient);
    },
  });
}

export function useDeletePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => printDocumentApi.delete(id),
    onSuccess: () => {
      refresh(queryClient);
    },
  });
}
