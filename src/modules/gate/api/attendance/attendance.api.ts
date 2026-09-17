import { apiClient } from '@/core/api';

// ===== Types =====

/**
 * The directory entry, served from `employee_hierarchy.Employee`.
 *
 * This module used to keep its own parallel employee master. Two masters for
 * one workforce meant somebody could exist for attendance and not for HR — and
 * the punch machines key on the JWPL code the HR directory holds, so a person
 * missing from it simply never matched their own punches. The master is gone;
 * this endpoint is read-only now, and employees are maintained in Employees.
 */
export interface AttendanceEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department: number | null;
  department_name?: string | null;
  designation_name?: string | null;
  sap_segment?: string;
  employment_status: string;
}

export type AttendanceDirection = 'IN' | 'OUT';

export interface AttendanceRecord {
  id: number;
  employee: number;
  employee_detail?: AttendanceEmployee;
  direction: AttendanceDirection;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  photo: string;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAttendanceRequest {
  employee: number;
  direction: AttendanceDirection;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (seconds optional)
  photo: File;
}

export interface EmployeeFilters {
  search?: string;
  department?: number;
}

export interface AttendanceRecordFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  employee?: number;
  department?: number;
  direction?: AttendanceDirection;
}

export interface AttendanceExportFilters {
  date_from?: string;
  date_to?: string;
  employee?: number;
  department?: number;
  direction?: AttendanceDirection;
}

// ===== Service =====

export const attendanceApi = {
  // ----- Employees (read-only; maintained in the Employees module) -----
  getEmployees: async (filters?: EmployeeFilters): Promise<AttendanceEmployee[]> => {
    const params: Record<string, string | number> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.department) params.department = filters.department;
    const response = await apiClient.get<AttendanceEmployee[]>('/attendance/employees/', {
      params,
    });
    return response.data;
  },


  // ----- Attendance records -----
  getRecords: async (filters?: AttendanceRecordFilters): Promise<AttendanceRecord[]> => {
    const params: Record<string, string | number> = {};
    if (filters?.date) params.date = filters.date;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.employee) params.employee = filters.employee;
    if (filters?.department) params.department = filters.department;
    const response = await apiClient.get<AttendanceRecord[]>('/attendance/records/', { params });
    return response.data;
  },

  createRecord: async (data: CreateAttendanceRequest): Promise<AttendanceRecord> => {
    const formData = new FormData();
    formData.append('employee', String(data.employee));
    formData.append('direction', data.direction);
    formData.append('date', data.date);
    formData.append('time', data.time);
    formData.append('photo', data.photo);

    const response = await apiClient.post<AttendanceRecord>('/attendance/records/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteRecord: async (id: number): Promise<void> => {
    await apiClient.delete(`/attendance/records/${id}/`);
  },

  exportRecords: async (filters: AttendanceExportFilters): Promise<Blob> => {
    const params: Record<string, string | number> = {};
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.employee) params.employee = filters.employee;
    if (filters.department) params.department = filters.department;
    if (filters.direction) params.direction = filters.direction;
    const response = await apiClient.get('/attendance/records/export/', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
