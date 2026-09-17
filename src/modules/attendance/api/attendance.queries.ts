import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  attendanceApi,
  type DailyFilters,
  type OverrideRequest,
} from './attendance.api';

/**
 * Every mutation invalidates the sheet AND the summary, because an override
 * moves a person between two counts. Invalidating only the rows would leave the
 * tiles at the top of the page disagreeing with the table underneath them.
 */
function invalidateSheet(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['attendanceDaily'] });
  queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
}

export function useDailyAttendance(filters?: DailyFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ['attendanceDaily', filters],
    queryFn: () => attendanceApi.getDaily(filters),
    // A day's punches only move when the sync runs; a short stale time here
    // just re-fetches the same 300 rows on every filter toggle.
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useAttendanceSummary(filters?: DailyFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ['attendanceSummary', filters],
    queryFn: () => attendanceApi.getSummary(filters),
    staleTime: 60 * 1000,
    enabled,
  });
}

/** The status and reason-code lists, straight from the backend's own enums. */
export function useAttendanceVocabulary() {
  return useQuery({
    queryKey: ['attendanceVocabulary'],
    queryFn: () => attendanceApi.getVocabulary(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAttendanceSourceStatus() {
  return useQuery({
    queryKey: ['attendanceSourceStatus'],
    queryFn: () => attendanceApi.getSourceStatus(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useOverrideHistory(id: number | null) {
  return useQuery({
    queryKey: ['attendanceHistory', id],
    queryFn: () => attendanceApi.getHistory(id as number),
    enabled: id !== null,
  });
}

export function useOverrideStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OverrideRequest }) =>
      attendanceApi.override(id, payload),
    onSuccess: (_data, variables) => {
      invalidateSheet(queryClient);
      queryClient.invalidateQueries({ queryKey: ['attendanceHistory', variables.id] });
    },
  });
}

export function useRevertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      attendanceApi.revert(id, reason),
    onSuccess: (_data, variables) => {
      invalidateSheet(queryClient);
      queryClient.invalidateQueries({ queryKey: ['attendanceHistory', variables.id] });
    },
  });
}

export function useSyncAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) =>
      attendanceApi.sync(dateFrom, dateTo),
    onSuccess: () => {
      invalidateSheet(queryClient);
      queryClient.invalidateQueries({ queryKey: ['attendanceSourceStatus'] });
    },
  });
}
