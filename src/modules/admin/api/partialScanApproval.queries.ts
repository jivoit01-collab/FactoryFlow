import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type DockingPartialScanCreateRequest,
  type DockingPartialScanListParams,
  type DockingPartialScanReviewRequest,
  partialScanApprovalApi,
} from './partialScanApproval.api';

export const PARTIAL_SCAN_APPROVAL_QUERY_KEYS = {
  all: ['dockingPartialScan'] as const,
  list: (params?: DockingPartialScanListParams) =>
    [...PARTIAL_SCAN_APPROVAL_QUERY_KEYS.all, 'list', params] as const,
  byDispatch: (entryId?: number | null) =>
    [...PARTIAL_SCAN_APPROVAL_QUERY_KEYS.all, 'byDispatch', entryId] as const,
};

function invalidatePartialScanApproval(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PARTIAL_SCAN_APPROVAL_QUERY_KEYS.all });
  // The scan page / gatepass readiness gate on the docking entry's approval status.
  queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
}

export function useDockingPartialScanRequests(
  params?: DockingPartialScanListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: PARTIAL_SCAN_APPROVAL_QUERY_KEYS.list(params),
    queryFn: () => partialScanApprovalApi.list(params),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useDockingPartialScanRequestByDispatch(entryId?: number | null) {
  return useQuery({
    queryKey: PARTIAL_SCAN_APPROVAL_QUERY_KEYS.byDispatch(entryId),
    queryFn: () => partialScanApprovalApi.byDispatch(entryId as number),
    enabled: Boolean(entryId),
  });
}

export function useCreateDockingPartialScanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DockingPartialScanCreateRequest) => partialScanApprovalApi.create(data),
    onSuccess: () => invalidatePartialScanApproval(queryClient),
  });
}

export function useApproveDockingPartialScanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: DockingPartialScanReviewRequest }) =>
      partialScanApprovalApi.approve(id, data),
    onSuccess: () => invalidatePartialScanApproval(queryClient),
  });
}

export function useRejectDockingPartialScanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DockingPartialScanReviewRequest }) =>
      partialScanApprovalApi.reject(id, data),
    onSuccess: () => invalidatePartialScanApproval(queryClient),
  });
}
