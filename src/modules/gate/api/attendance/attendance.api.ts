import { apiClient } from '@/core/api';

// ===== Types =====

export interface AttendanceEmployee {
  id: number;
  employee_code: string;
  name: string;
  department: number;
  department_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateEmployeeRequest {
  employee_code: string;
  name: string;
  department: number;
  is_active?: boolean;
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
  is_active?: boolean;
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
  // ----- Employees (config) -----
  getEmployees: async (filters?: EmployeeFilters): Promise<AttendanceEmployee[]> => {
    const params: Record<string, string | number> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.department) params.department = filters.department;
    if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);
    const response = await apiClient.get<AttendanceEmployee[]>('/attendance/employees/', {
      params,
    });
    return response.data;
  },

  createEmployee: async (data: CreateEmployeeRequest): Promise<AttendanceEmployee> => {
    const response = await apiClient.post<AttendanceEmployee>('/attendance/employees/', data);
    return response.data;
  },

  updateEmployee: async (
    id: number,
    data: CreateEmployeeRequest,
  ): Promise<AttendanceEmployee> => {
    const response = await apiClient.put<AttendanceEmployee>(
      `/attendance/employees/${id}/`,
      data,
    );
    return response.data;
  },

  deleteEmployee: async (id: number): Promise<void> => {
    await apiClient.delete(`/attendance/employees/${id}/`);
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
