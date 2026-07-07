import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  WorkPermitApprovePayload,
  WorkPermitAttachmentUploadPayload,
  WorkPermitCancelPayload,
  WorkPermitCompletePayload,
  WorkPermitFilters,
  WorkPermitPayload,
  WorkPermitUpdatePayload,
  WorkPermitWorkerPayload,
} from '../types';
import { workPermitApi } from './workPermit.api';

export const WORK_PERMIT_QUERY_KEYS = {
  all: ['maintenance', 'work-permits'] as const,
  list: (filters?: WorkPermitFilters) =>
    [...WORK_PERMIT_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (permitId: number) => [...WORK_PERMIT_QUERY_KEYS.all, 'detail', permitId] as const,
};

function invalidatePermits(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: WORK_PERMIT_QUERY_KEYS.all });
}

export function useWorkPermits(filters?: WorkPermitFilters, enabled = true) {
  return useQuery({
    queryKey: WORK_PERMIT_QUERY_KEYS.list(filters),
    queryFn: () => workPermitApi.getPermits(filters),
    enabled,
  });
}

export function useWorkPermit(permitId: number | null) {
  return useQuery({
    queryKey: WORK_PERMIT_QUERY_KEYS.detail(permitId!),
    queryFn: () => workPermitApi.getPermit(permitId!),
    enabled: permitId !== null,
  });
}

export function useCreateWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkPermitPayload) => workPermitApi.createPermit(payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useUpdateWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permitId, payload }: { permitId: number; payload: WorkPermitUpdatePayload }) =>
      workPermitApi.updatePermit(permitId, payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useDeleteWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permitId: number) => workPermitApi.deletePermit(permitId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useSubmitWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permitId: number) => workPermitApi.submitPermit(permitId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useApproveWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permitId, payload }: { permitId: number; payload: WorkPermitApprovePayload }) =>
      workPermitApi.approvePermit(permitId, payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useStartWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permitId: number) => workPermitApi.startPermit(permitId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useRenewWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permitId: number) => workPermitApi.renewPermit(permitId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useCompleteWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permitId, payload }: { permitId: number; payload: WorkPermitCompletePayload }) =>
      workPermitApi.completePermit(permitId, payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useCloseWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permitId: number) => workPermitApi.closePermit(permitId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useCancelWorkPermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permitId, payload }: { permitId: number; payload: WorkPermitCancelPayload }) =>
      workPermitApi.cancelPermit(permitId, payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useCreateWorkPermitWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkPermitWorkerPayload) => workPermitApi.createWorker(payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useDeleteWorkPermitWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workerId: number) => workPermitApi.deleteWorker(workerId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useUploadWorkPermitAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkPermitAttachmentUploadPayload) =>
      workPermitApi.uploadAttachment(payload),
    onSuccess: () => invalidatePermits(queryClient),
  });
}

export function useDeleteWorkPermitAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => workPermitApi.deleteAttachment(attachmentId),
    onSuccess: () => invalidatePermits(queryClient),
  });
}
