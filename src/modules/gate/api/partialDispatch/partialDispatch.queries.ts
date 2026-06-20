import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type PartialApprovalDecision,
  type PartialApprovalRequest,
  partialDispatchApi,
} from './partialDispatch.api';

function invalidateDispatch(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
  queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
  queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
}

export function useRemoveDispatchDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salesDispatchId, documentId }: { salesDispatchId: number; documentId: number }) =>
      partialDispatchApi.removeDocument(salesDispatchId, documentId),
    onSuccess: () => invalidateDispatch(queryClient),
  });
}

export function useRequestPartialApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      salesDispatchId,
      payload,
    }: {
      salesDispatchId: number;
      payload: PartialApprovalRequest;
    }) => partialDispatchApi.requestApproval(salesDispatchId, payload),
    onSuccess: () => invalidateDispatch(queryClient),
  });
}

export function useDecidePartialApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, payload }: { approvalId: number; payload: PartialApprovalDecision }) =>
      partialDispatchApi.decide(approvalId, payload),
    onSuccess: () => invalidateDispatch(queryClient),
  });
}
