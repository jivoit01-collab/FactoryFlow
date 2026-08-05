import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  MaterialIndentAttachmentUploadPayload,
  MaterialIndentDecisionPayload,
  MaterialIndentFilters,
  MaterialIndentGateInPayload,
  MaterialIndentPayload,
  MaterialIndentPurchasePayload,
  MaterialIndentQuotationPayload,
  MaterialIndentQuotationReturnPayload,
  MaterialIndentQuotationSelectPayload,
  MaterialIndentQuotationUpdatePayload,
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
  quotations: (indentId: number) =>
    [...MATERIAL_INDENT_QUERY_KEYS.all, 'quotations', indentId] as const,
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

// ---- Quotation round ---------------------------------------------------------
// Every mutation here can move the indent between the purchaser's and the
// approver's queue, so they all invalidate the whole indent tree.

export function useMaterialIndentQuotations(indentId: number | null, enabled = true) {
  return useQuery({
    queryKey: MATERIAL_INDENT_QUERY_KEYS.quotations(indentId!),
    queryFn: () => materialIndentApi.getQuotations(indentId!),
    enabled: indentId !== null && enabled,
  });
}

export function useCreateMaterialIndentQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialIndentQuotationPayload) =>
      materialIndentApi.createQuotation(payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useUpdateMaterialIndentQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quotationId,
      payload,
    }: {
      quotationId: number;
      payload: MaterialIndentQuotationUpdatePayload;
    }) => materialIndentApi.updateQuotation(quotationId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useDeleteMaterialIndentQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: number) => materialIndentApi.deleteQuotation(quotationId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useSubmitMaterialIndentQuotations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indentId: number) => materialIndentApi.submitQuotations(indentId),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useSelectMaterialIndentQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      indentId,
      payload,
    }: {
      indentId: number;
      payload: MaterialIndentQuotationSelectPayload;
    }) => materialIndentApi.selectQuotation(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}

export function useReturnMaterialIndentQuotations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      indentId,
      payload,
    }: {
      indentId: number;
      payload: MaterialIndentQuotationReturnPayload;
    }) => materialIndentApi.returnQuotations(indentId, payload),
    onSuccess: () => invalidateIndents(queryClient),
  });
}
