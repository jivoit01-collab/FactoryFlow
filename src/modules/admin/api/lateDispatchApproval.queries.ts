import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  lateDispatchApprovalApi,
  type LateDispatchApprovalCreateRequest,
  type LateDispatchApprovalListParams,
  type LateDispatchApprovalReviewRequest,
} from './lateDispatchApproval.api';

export const LATE_DISPATCH_APPROVAL_QUERY_KEYS = {
  all: ['lateDispatchApproval'] as const,
  list: (params?: LateDispatchApprovalListParams) =>
    [...LATE_DISPATCH_APPROVAL_QUERY_KEYS.all, 'list', params] as const,
  byVehicle: (vehicleId?: number | null, gateInDate?: string) =>
    [...LATE_DISPATCH_APPROVAL_QUERY_KEYS.all, 'byVehicle', vehicleId, gateInDate] as const,
};

function invalidateLateDispatchApproval(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: LATE_DISPATCH_APPROVAL_QUERY_KEYS.all });
}

export function useLateDispatchApprovals(
  params?: LateDispatchApprovalListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: LATE_DISPATCH_APPROVAL_QUERY_KEYS.list(params),
    queryFn: () => lateDispatchApprovalApi.list(params),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Where a truck stands against the cutoff. Read imperatively by the Empty Vehicle
 * In board (via `fetchQuery`) on the "Start Entry" click rather than subscribed
 * to per row, so a board listing thirty expected vehicles still makes one call.
 */
export function useLateDispatchVehicleStatus(vehicleId?: number | null, gateInDate?: string) {
  return useQuery({
    queryKey: LATE_DISPATCH_APPROVAL_QUERY_KEYS.byVehicle(vehicleId, gateInDate),
    queryFn: () => lateDispatchApprovalApi.byVehicle(vehicleId as number, gateInDate),
    enabled: Boolean(vehicleId),
  });
}

export function useCreateLateDispatchApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LateDispatchApprovalCreateRequest) => lateDispatchApprovalApi.create(data),
    onSuccess: () => invalidateLateDispatchApproval(queryClient),
  });
}

export function useApproveLateDispatchApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: LateDispatchApprovalReviewRequest }) =>
      lateDispatchApprovalApi.approve(id, data),
    onSuccess: () => invalidateLateDispatchApproval(queryClient),
  });
}

export function useRejectLateDispatchApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LateDispatchApprovalReviewRequest }) =>
      lateDispatchApprovalApi.reject(id, data),
    onSuccess: () => invalidateLateDispatchApproval(queryClient),
  });
}
