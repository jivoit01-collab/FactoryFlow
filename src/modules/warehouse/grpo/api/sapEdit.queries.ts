import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SapGRPOEditRequest, SapGRPOType } from '../types';
import { GRPO_QUERY_KEYS } from './grpo.queries';
import { grpoSapEditApi } from './sapEdit.api';

export const GRPO_SAP_EDIT_QUERY_KEYS = {
  all: [...GRPO_QUERY_KEYS.all, 'sap-edit'] as const,
  find: (docNum: string, docType: SapGRPOType) =>
    [...GRPO_SAP_EDIT_QUERY_KEYS.all, 'find', docType, docNum] as const,
  document: (docEntry: number) => [...GRPO_SAP_EDIT_QUERY_KEYS.all, 'document', docEntry] as const,
};

/** The GRPOs with this SAP number and type; runs once a number is given. */
export function useFindSapGRPO(docNum: string, docType: SapGRPOType) {
  return useQuery({
    queryKey: GRPO_SAP_EDIT_QUERY_KEYS.find(docNum, docType),
    queryFn: () => grpoSapEditApi.find(docNum, docType),
    enabled: /^\d+$/.test(docNum),
    retry: false,
  });
}

/** One GRPO as SAP holds it now. Never served stale: the form starts from it. */
export function useSapGRPO(docEntry: number | null) {
  return useQuery({
    queryKey: GRPO_SAP_EDIT_QUERY_KEYS.document(docEntry ?? 0),
    queryFn: () => grpoSapEditApi.get(docEntry as number),
    enabled: !!docEntry,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSaveSapGRPOEdit(docEntry: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, attachments }: { data: SapGRPOEditRequest; attachments: File[] }) =>
      grpoSapEditApi.save(docEntry, data, attachments),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GRPO_SAP_EDIT_QUERY_KEYS.document(docEntry) });
      // The app's own GRPO pages show SAP's total.
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'detail'] });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'service', 'detail'] });
    },
  });
}
