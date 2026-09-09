/**
 * HTTP calls for the employee-hierarchy module.
 *
 * Thin on purpose: one function per endpoint, no massaging. The one thing this
 * layer does do is turn a filter object into the query string the directory
 * expects, including repeating a key for each value of a multi-select
 * (`?department=3&department=4`) — which is what the backend's
 * `getlist` reads, and easy to get subtly wrong at each call site.
 */
import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AuditEntry,
  Department,
  DepartmentChangePayload,
  DepartmentPayload,
  Designation,
  DesignationChangePayload,
  DesignationPayload,
  EmployeeDetail,
  EmployeeEditPayload,
  EmployeeFilters,
  EmployeeListResponse,
  EmployeeMeta,
  EmployeePayload,
  EmployeeSalaryResponse,
  HistoryEntry,
  ManagerChangePayload,
  OrgTreeResponse,
  PagedResponse,
  PendingSalaryRow,
  PromotionPayload,
  ReportingInfo,
  SalaryPayload,
  SalaryRecord,
  SalaryRevisionRow,
  StatusChangePayload,
  WorkforceReports,
} from '../types';

const EP = API_ENDPOINTS.EMPLOYEE_HIERARCHY;

/** Filters → query string. Arrays repeat their key; empty values are dropped. */
export function toQuery(filters: EmployeeFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
      return;
    }
    if (typeof value === 'boolean') {
      // Only send a boolean when it is true: the backend's flags all default
      // to the reading that matters, and `?managers_only=false` means
      // "non-managers only", which is not the same as not filtering.
      if (value) params.set(key, '1');
      return;
    }
    params.set(key, String(value));
  });
  return params;
}

export const employeesApi = {
  async getMeta(): Promise<EmployeeMeta> {
    const response = await apiClient.get<EmployeeMeta>(EP.META);
    return response.data;
  },

  async getEmployees(filters: EmployeeFilters = {}): Promise<EmployeeListResponse> {
    const response = await apiClient.get<EmployeeListResponse>(EP.EMPLOYEES, {
      params: toQuery(filters),
    });
    return response.data;
  },

  async getEmployee(employeeId: number): Promise<EmployeeDetail> {
    const response = await apiClient.get<EmployeeDetail>(EP.EMPLOYEE_DETAIL(employeeId));
    return response.data;
  },

  async createEmployee(payload: EmployeePayload): Promise<EmployeeDetail> {
    const response = await apiClient.post<EmployeeDetail>(EP.EMPLOYEES, payload);
    return response.data;
  },

  /**
   * Edit the plain details, and optionally replace the photo.
   *
   * A `File` in the payload switches the request to multipart, because that is
   * the only way an image travels; everything else goes as JSON, which keeps
   * nulls meaning null (multipart would send the string "null" and blank a
   * field somebody meant to clear).
   */
  async updateEmployee(
    employeeId: number,
    payload: EmployeeEditPayload,
  ): Promise<EmployeeDetail> {
    if (!(payload.photo instanceof File)) {
      // No file: send JSON, and drop the (empty) photo key rather than sending
      // a null that would clear a photo nobody asked to remove.
      const fields = { ...payload };
      delete fields.photo;
      const response = await apiClient.patch<EmployeeDetail>(
        EP.EMPLOYEE_DETAIL(employeeId),
        fields,
      );
      return response.data;
    }

    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, value instanceof File ? value : String(value));
    });
    const response = await apiClient.patch<EmployeeDetail>(
      EP.EMPLOYEE_DETAIL(employeeId),
      form,
    );
    return response.data;
  },

  async getReporting(employeeId: number): Promise<ReportingInfo> {
    const response = await apiClient.get<ReportingInfo>(EP.EMPLOYEE_REPORTING(employeeId));
    return response.data;
  },

  async getHistory(employeeId: number, page = 1): Promise<PagedResponse<HistoryEntry>> {
    const response = await apiClient.get<PagedResponse<HistoryEntry>>(
      EP.EMPLOYEE_HISTORY(employeeId),
      { params: { page, page_size: 50 } },
    );
    return response.data;
  },

  async getAudit(employeeId: number, page = 1): Promise<PagedResponse<AuditEntry>> {
    const response = await apiClient.get<PagedResponse<AuditEntry>>(
      EP.EMPLOYEE_AUDIT(employeeId),
      { params: { page, page_size: 50 } },
    );
    return response.data;
  },

  async getTree(params: {
    root?: number;
    department?: number;
    include_past?: boolean;
  } = {}): Promise<OrgTreeResponse> {
    const response = await apiClient.get<OrgTreeResponse>(EP.TREE, {
      params: toQuery(params as never),
    });
    return response.data;
  },

  async changeManager(
    employeeId: number,
    payload: ManagerChangePayload,
  ): Promise<{ team_moved: number; reports_reassigned?: number; employee: EmployeeDetail }> {
    const response = await apiClient.post(EP.EMPLOYEE_MANAGER(employeeId), payload);
    return response.data;
  },

  async changeDepartment(
    employeeId: number,
    payload: DepartmentChangePayload,
  ): Promise<{ team_moved: number; employee: EmployeeDetail }> {
    const response = await apiClient.post(EP.EMPLOYEE_DEPARTMENT(employeeId), payload);
    return response.data;
  },

  async changeDesignation(
    employeeId: number,
    payload: DesignationChangePayload,
  ): Promise<{ changed: boolean; employee: EmployeeDetail }> {
    const response = await apiClient.post(EP.EMPLOYEE_DESIGNATION(employeeId), payload);
    return response.data;
  },

  async promote(
    employeeId: number,
    payload: PromotionPayload,
  ): Promise<{ employee: EmployeeDetail; salary_record_id: number | null }> {
    const response = await apiClient.post(EP.EMPLOYEE_PROMOTE(employeeId), payload);
    return response.data;
  },

  async changeStatus(
    employeeId: number,
    payload: StatusChangePayload,
  ): Promise<{ reports_reassigned: number; employee: EmployeeDetail }> {
    const response = await apiClient.post(EP.EMPLOYEE_STATUS(employeeId), payload);
    return response.data;
  },

  async getSalary(employeeId: number): Promise<EmployeeSalaryResponse> {
    const response = await apiClient.get<EmployeeSalaryResponse>(
      EP.EMPLOYEE_SALARY(employeeId),
    );
    return response.data;
  },

  async createSalary(employeeId: number, payload: SalaryPayload): Promise<SalaryRecord> {
    const response = await apiClient.post<SalaryRecord>(
      EP.EMPLOYEE_SALARY(employeeId),
      payload,
    );
    return response.data;
  },

  async decideSalary(
    recordId: number,
    decision: 'approve' | 'reject',
    reason = '',
  ): Promise<SalaryRecord> {
    const url = decision === 'approve' ? EP.SALARY_APPROVE(recordId) : EP.SALARY_REJECT(recordId);
    const response = await apiClient.post<SalaryRecord>(url, { reason });
    return response.data;
  },

  async getSalaryApprovals(
    page = 1,
  ): Promise<PagedResponse<PendingSalaryRow> & { can_approve: boolean }> {
    const response = await apiClient.get(EP.SALARY_APPROVALS, { params: { page } });
    return response.data;
  },

  async getSalaryRevisions(params: {
    revision_type?: string;
    employee?: number;
    year?: number;
    page?: number;
  } = {}): Promise<PagedResponse<SalaryRevisionRow>> {
    const response = await apiClient.get<PagedResponse<SalaryRevisionRow>>(
      EP.SALARY_REVISIONS,
      { params },
    );
    return response.data;
  },

  async getDepartments(): Promise<{ results: Department[]; count: number }> {
    const response = await apiClient.get(EP.DEPARTMENTS);
    return response.data;
  },

  async createDepartment(payload: DepartmentPayload): Promise<Department> {
    const response = await apiClient.post<Department>(EP.DEPARTMENTS, payload);
    return response.data;
  },

  async updateDepartment(
    departmentId: number,
    payload: Partial<DepartmentPayload>,
  ): Promise<Department> {
    const response = await apiClient.patch<Department>(
      EP.DEPARTMENT_DETAIL(departmentId),
      payload,
    );
    return response.data;
  },

  /** Retires it — nothing in this module is ever deleted. */
  async retireDepartment(departmentId: number): Promise<Department> {
    const response = await apiClient.delete<Department>(EP.DEPARTMENT_DETAIL(departmentId));
    return response.data;
  },

  async getDesignations(): Promise<{ results: Designation[]; count: number }> {
    const response = await apiClient.get(EP.DESIGNATIONS);
    return response.data;
  },

  async createDesignation(payload: DesignationPayload): Promise<Designation> {
    const response = await apiClient.post<Designation>(EP.DESIGNATIONS, payload);
    return response.data;
  },

  async updateDesignation(
    designationId: number,
    payload: Partial<DesignationPayload>,
  ): Promise<Designation> {
    const response = await apiClient.patch<Designation>(
      EP.DESIGNATION_DETAIL(designationId),
      payload,
    );
    return response.data;
  },

  async retireDesignation(designationId: number): Promise<Designation> {
    const response = await apiClient.delete<Designation>(EP.DESIGNATION_DETAIL(designationId));
    return response.data;
  },

  async getReports(includePast = false): Promise<WorkforceReports> {
    const response = await apiClient.get<WorkforceReports>(EP.REPORTS, {
      params: includePast ? { include_past: 1 } : {},
    });
    return response.data;
  },
};
