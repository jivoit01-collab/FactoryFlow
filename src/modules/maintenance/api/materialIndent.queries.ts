import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  MaterialIndentAttachmentUploadPayload,
  MaterialIndentDecisionPayload,
  MaterialIndentFilters,
  MaterialIndentGateInPayload,
  MaterialIndentPayload,
  MaterialIndentPurchasePayload,
  MaterialIndentReceivePayload,
  MaterialIndentReviewPayload,
  MaterialIndentUpdatePayload,
} from '../types';
import { materialIndentApi } from './materialIndent.api';

export const MATERIAL_INDENT_QUERY_KEYS = {
  all: ['maintenance', 'material-indents'] as const,
  list: (filters?: MaterialIndentFilters) =>
    [...MATERIAL_INDENT_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (indentId: number) => [...MATERIAL_INDENT_QUERY_KEYS.all, 'detail', indentId] as const,
};

function invalidateIndents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MATERIAL_INDENT_QUERY_KEYS.all });
}

export function useMaterialIndents(filters?: MaterialIndentFilters, enabled = true) {
  return useQuery({
    queryKey: MATERIAL_INDENT_QUERY_KEYS.list(filters),
    queryFn: () => materialIndentApi.getIndents(filters),
    enabled,
  });
}

export function useMaterialIndent(indentId: number | null) {
  return useQuery({
    queryKey: MATERIAL_INDENT_QUERY_KEYS.detail(indentId!),
    queryFn: () => materialIndentApi.getIndent(indentId!),
    enabled: indentId !== null,
  });
}

export function useCreateMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialIndentPayload) => materialIndentApi.createIndent(payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useUpdateMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indentId, payload }: { indentId: number; payload: MaterialIndentUpdatePayload }) =>
      materialIndentApi.updateIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useDeleteMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indentId: number) => materialIndentApi.deleteIndent(indentId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useSubmitMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indentId: number) => materialIndentApi.submitIndent(indentId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useReviewMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indentId, payload }: { indentId: number; payload: MaterialIndentReviewPayload }) =>
      materialIndentApi.reviewIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function usePurchaseMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      indentId,
      payload,
    }: {
      indentId: number;
      payload?: MaterialIndentPurchasePayload;
    }) => materialIndentApi.purchaseIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useGateInMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indentId, payload }: { indentId: number; payload?: MaterialIndentGateInPayload }) =>
      materialIndentApi.gateInIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useReceiveMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indentId, payload }: { indentId: number; payload?: MaterialIndentReceivePayload }) =>
      materialIndentApi.receiveIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useUploadMaterialIndentAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialIndentAttachmentUploadPayload) =>
      materialIndentApi.uploadAttachment(payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useDeleteMaterialIndentAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => materialIndentApi.deleteAttachment(attachmentId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useApproveMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      indentId,
      payload,
    }: {
      indentId: number;
      payload?: MaterialIndentDecisionPayload;
    }) => materialIndentApi.approveIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useRejectMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      indentId,
      payload,
    }: {
      indentId: number;
      payload?: MaterialIndentDecisionPayload;
    }) => materialIndentApi.rejectIndent(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useCancelMaterialIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indentId: number) => materialIndentApi.cancelIndent(indentId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}
