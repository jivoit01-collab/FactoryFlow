import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ApplyLeavePayload,
  type DecisionPayload,
  type Holiday,
  leaveApi,
  type LeaveFilters,
  type LeaveType,
} from './leave.api';

/**
 * Every decision invalidates the list, the queue AND the badge.
 *
 * Leaving the badge out is the bug worth naming: an approver clears their
 * queue, the table empties, and the sidebar still reads "3" until the next
 * poll — which reads as the app having lost the decision they just made.
 */
function invalidateLeave(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
  queryClient.invalidateQueries({ queryKey: ['leavePending'] });
  queryClient.invalidateQueries({ queryKey: ['leavePendingCount'] });
  queryClient.invalidateQueries({ queryKey: ['leaveRequest'] });
  queryClient.invalidateQueries({ queryKey: ['leaveCalendar'] });
  queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
  // An approved leave lands on the attendance sheet, so that view is stale too.
  queryClient.invalidateQueries({ queryKey: ['attendanceDaily'] });
  queryClient.invalidateQueries({ queryKey: ['attendanceMuster'] });
}

export function useLeaveTypes(activeOnly = true) {
  return useQuery({
    queryKey: ['leaveTypes', activeOnly],
    queryFn: () => leaveApi.getTypes(activeOnly),
    // Masters change a few times a year.
    staleTime: 30 * 60 * 1000,
  });
}

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['leaveHolidays', year],
    queryFn: () => leaveApi.getHolidays(year),
    staleTime: 30 * 60 * 1000,
  });
}

export function useLeaveRequests(filters?: LeaveFilters, enabled = true) {
  return useQuery({
    queryKey: ['leaveRequests', filters],
    queryFn: () => leaveApi.getRequests(filters),
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useLeaveRequest(id: number | null) {
  return useQuery({
    queryKey: ['leaveRequest', id],
    queryFn: () => leaveApi.getRequest(id as number),
    enabled: id !== null,
  });
}

export function useLeaveHistory(id: number | null) {
  return useQuery({
    queryKey: ['leaveHistory', id],
    queryFn: () => leaveApi.getHistory(id as number),
    enabled: id !== null,
  });
}

export function usePendingLeave(enabled = true) {
  return useQuery({
    queryKey: ['leavePending'],
    queryFn: () => leaveApi.getPending(),
    staleTime: 30 * 1000,
    enabled,
  });
}

/**
 * The sidebar badge. Polled, so it is deliberately the count endpoint and not
 * the length of the queue.
 */
export function usePendingLeaveCount(enabled = true) {
  return useQuery({
    queryKey: ['leavePendingCount'],
    queryFn: () => leaveApi.getPendingCount(),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled,
  });
}

export function useLeaveCalendar(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['leaveCalendar', from, to],
    queryFn: () => leaveApi.getCalendar(from, to),
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyLeavePayload) => leaveApi.apply(payload),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: DecisionPayload }) =>
      leaveApi.approve(id, payload ?? {}),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leaveApi.reject(id, comment),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useWithdrawLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      leaveApi.withdraw(id, comment ?? ''),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leaveApi.cancel(id, comment),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useLeaveBalance(employee?: number, year?: number, enabled = true) {
  return useQuery({
    queryKey: ['leaveBalance', employee ?? 'me', year ?? 'current'],
    queryFn: () => leaveApi.getBalance(employee, year),
    staleTime: 60 * 1000,
    enabled,
  });
}

/** The time office's employee picker. Only enabled where it is allowed. */
export function usePickerEmployees(search: string, enabled = true) {
  return useQuery({
    queryKey: ['leavePickerEmployees', search],
    queryFn: () => leaveApi.getPickerEmployees(search),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

function invalidateMasters(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
  queryClient.invalidateQueries({ queryKey: ['leaveHolidays'] });
  // A changed holiday changes what a future application will cost, so any
  // balance already on screen is now a stale answer.
  queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<LeaveType>) => leaveApi.createType(payload),
    onSuccess: () => invalidateMasters(queryClient),
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<LeaveType> }) =>
      leaveApi.updateType(id, payload),
    onSuccess: () => invalidateMasters(queryClient),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Holiday, 'id'>) => leaveApi.createHoliday(payload),
    onSuccess: () => invalidateMasters(queryClient),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leaveApi.deleteHoliday(id),
    onSuccess: () => invalidateMasters(queryClient),
  });
}
