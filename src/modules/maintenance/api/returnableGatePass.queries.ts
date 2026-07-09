import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ReturnableAcknowledgePayload,
  ReturnableApprovePayload,
  ReturnableFilters,
  ReturnableGateOutPayload,
  ReturnableGatePassPayload,
  ReturnableGatePassUpdatePayload,
  ReturnableReasonPayload,
  ReturnableRecordReturnPayload,
} from '../types';
import { returnableGatePassApi } from './returnableGatePass.api';

export const RETURNABLE_QUERY_KEYS = {
  all: ['returnable', 'gate-passes'] as const,
  list: (filters?: ReturnableFilters) => [...RETURNABLE_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (passId: number) => [...RETURNABLE_QUERY_KEYS.all, 'detail', passId] as const,
  timeline: (passId: number) => [...RETURNABLE_QUERY_KEYS.all, 'timeline', passId] as const,
  pendingApproval: () => [...RETURNABLE_QUERY_KEYS.all, 'pending-approval'] as const,
  pendingGateOut: () => [...RETURNABLE_QUERY_KEYS.all, 'pending-gate-out'] as const,
  pendingGateIn: () => [...RETURNABLE_QUERY_KEYS.all, 'pending-gate-in'] as const,
  dashboard: () => [...RETURNABLE_QUERY_KEYS.all, 'dashboard'] as const,
};

/**
 * Every transition can move a pass between the department list, the gate-out
 * queue and the gate-in queue, so all of them invalidate the whole tree.
 */
function invalidateReturnables(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: RETURNABLE_QUERY_KEYS.all });
}

// ---- Queries ---------------------------------------------------------------

export function useReturnableGatePasses(filters?: ReturnableFilters, enabled = true) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.list(filters),
    queryFn: () => returnableGatePassApi.getGatePasses(filters),
    enabled,
  });
}

export function useReturnableGatePass(passId: number | null) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.detail(passId!),
    queryFn: () => returnableGatePassApi.getGatePass(passId!),
    enabled: passId !== null,
  });
}

export function useReturnableTimeline(passId: number | null) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.timeline(passId!),
    queryFn: () => returnableGatePassApi.getTimeline(passId!),
    enabled: passId !== null,
  });
}

export function useReturnablePendingApproval(enabled = true) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.pendingApproval(),
    queryFn: () => returnableGatePassApi.getPendingApproval(),
    enabled,
  });
}

export function useReturnablePendingGateOut(enabled = true) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.pendingGateOut(),
    queryFn: () => returnableGatePassApi.getPendingGateOut(),
    enabled,
  });
}

export function useReturnablePendingGateIn(enabled = true) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.pendingGateIn(),
    queryFn: () => returnableGatePassApi.getPendingGateIn(),
    enabled,
  });
}

export function useReturnableDashboard(enabled = true) {
  return useQuery({
    queryKey: RETURNABLE_QUERY_KEYS.dashboard(),
    queryFn: () => returnableGatePassApi.getDashboard(),
    enabled,
  });
}

// ---- Mutations -------------------------------------------------------------

export function useCreateReturnableGatePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReturnableGatePassPayload) => returnableGatePassApi.createGatePass(payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useUpdateReturnableGatePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableGatePassUpdatePayload }) =>
      returnableGatePassApi.updateGatePass(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useDeleteReturnableGatePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passId: number) => returnableGatePassApi.deleteGatePass(passId),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useSubmitReturnableGatePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passId: number) => returnableGatePassApi.submit(passId),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useApproveReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload?: ReturnableApprovePayload }) =>
      returnableGatePassApi.approve(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useRejectReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableReasonPayload }) =>
      returnableGatePassApi.reject(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useGateOutReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableGateOutPayload }) =>
      returnableGatePassApi.gateOut(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useRejectReturnableAtGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableReasonPayload }) =>
      returnableGatePassApi.rejectAtGate(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useRecordReturnableReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableRecordReturnPayload }) =>
      returnableGatePassApi.recordReturn(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useAcknowledgeReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload?: ReturnableAcknowledgePayload }) =>
      returnableGatePassApi.acknowledge(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useCloseReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passId: number) => returnableGatePassApi.close(passId),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useShortCloseReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableReasonPayload }) =>
      returnableGatePassApi.shortClose(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useCancelReturnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, payload }: { passId: number; payload: ReturnableReasonPayload }) =>
      returnableGatePassApi.cancel(passId, payload),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useUploadReturnableAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      passId,
      file,
      docType,
      caption,
    }: {
      passId: number;
      file: File;
      docType: string;
      caption?: string;
    }) => returnableGatePassApi.uploadAttachment(passId, file, docType, caption),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}

export function useDeleteReturnableAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => returnableGatePassApi.deleteAttachment(attachmentId),
    onSuccess: () => invalidateReturnables(queryClient),
  });
}
