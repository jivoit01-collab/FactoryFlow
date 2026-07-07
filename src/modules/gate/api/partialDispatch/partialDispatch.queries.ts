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
  // Removing a bill changes the truck's per-company readiness/can-depart and the
  // gate-out vehicle entries — refresh the arrival panel and vehicle-entry views.
  queryClient.invalidateQueries({ queryKey: ['arrivals'] });
  queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
  queryClient.invalidateQueries({ queryKey: ['dispatch-pipeline'] });
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
