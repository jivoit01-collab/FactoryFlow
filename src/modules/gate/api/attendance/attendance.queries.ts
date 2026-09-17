import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  attendanceApi,
  type AttendanceRecordFilters,
  type CreateAttendanceRequest,
  type EmployeeFilters,
} from './attendance.api';

// ===== Employees (read-only; maintained in the Employees module) =====

export function useAttendanceEmployees(filters?: EmployeeFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ['attendanceEmployees', filters],
    queryFn: () => attendanceApi.getEmployees(filters),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}




// ===== Attendance records =====

export function useAttendanceRecords(filters?: AttendanceRecordFilters) {
  return useQuery({
    queryKey: ['attendanceRecords', filters],
    queryFn: () => attendanceApi.getRecords(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttendanceRequest) => attendanceApi.createRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attendanceApi.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });
}
