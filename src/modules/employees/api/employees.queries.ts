/**
 * React-query hooks for the module.
 *
 * The invalidation rules are the interesting part, and they follow the shape of
 * the data rather than being sprayed at everything.
 *
 * A structural change — a manager move, a transfer, a promotion — can alter
 * *other* people's rows (a manager who moves takes their team, and an exit
 * re-points a team one level up), so those mutations invalidate the whole
 * module: the tree, the directory, the reports. There is no honest way to patch
 * one row in the cache when the server has just rewritten a subtree.
 *
 * A salary write is narrower. It cannot move anybody, so it invalidates that
 * employee's salary, the approval queue and the reports — and the directory,
 * because the cached figure a row shows has just changed.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DepartmentChangePayload,
  DepartmentPayload,
  DesignationChangePayload,
  DesignationPayload,
  EmployeeEditPayload,
  EmployeeFilters,
  EmployeePayload,
  ManagerChangePayload,
  PromotionPayload,
  SalaryPayload,
  StatusChangePayload,
} from '../types';
import { employeesApi } from './employees.api';

export const EMPLOYEE_KEYS = {
  all: ['employee-hierarchy'] as const,
  meta: () => ['employee-hierarchy', 'meta'] as const,
  list: (filters: EmployeeFilters) => ['employee-hierarchy', 'list', filters] as const,
  detail: (employeeId: number) => ['employee-hierarchy', 'employee', employeeId] as const,
  reporting: (employeeId: number) =>
    ['employee-hierarchy', 'employee', employeeId, 'reporting'] as const,
  history: (employeeId: number) =>
    ['employee-hierarchy', 'employee', employeeId, 'history'] as const,
  audit: (employeeId: number) => ['employee-hierarchy', 'employee', employeeId, 'audit'] as const,
  salary: (employeeId: number) =>
    ['employee-hierarchy', 'employee', employeeId, 'salary'] as const,
  tree: (params: Record<string, unknown>) => ['employee-hierarchy', 'tree', params] as const,
  departments: () => ['employee-hierarchy', 'departments'] as const,
  designations: () => ['employee-hierarchy', 'designations'] as const,
  approvals: (page: number) => ['employee-hierarchy', 'salary-approvals', page] as const,
  revisions: (params: Record<string, unknown>) =>
    ['employee-hierarchy', 'salary-revisions', params] as const,
  reports: (includePast: boolean) => ['employee-hierarchy', 'reports', includePast] as const,
};

/** The masters and this user's rights. Stable enough to keep for a while. */
export function useEmployeeMeta() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.meta(),
    queryFn: () => employeesApi.getMeta(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.list(filters),
    queryFn: () => employeesApi.getEmployees(filters),
    // The directory is typed into; keeping the previous page on screen while
    // the next one loads stops the list flickering to empty on every keystroke.
    placeholderData: (previous) => previous,
  });
}

export function useEmployee(employeeId: number | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.detail(employeeId ?? 0),
    queryFn: () => employeesApi.getEmployee(employeeId as number),
    enabled: !!employeeId,
  });
}

export function useReporting(employeeId: number | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.reporting(employeeId ?? 0),
    queryFn: () => employeesApi.getReporting(employeeId as number),
    enabled: !!employeeId,
  });
}

export function useEmployeeHistory(employeeId: number | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.history(employeeId ?? 0),
    queryFn: () => employeesApi.getHistory(employeeId as number),
    enabled: !!employeeId,
  });
}

export function useEmployeeAudit(employeeId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.audit(employeeId ?? 0),
    queryFn: () => employeesApi.getAudit(employeeId as number),
    enabled: !!employeeId && enabled,
  });
}

/**
 * One employee's salary.
 *
 * `enabled` is how the profile page avoids asking at all for somebody it
 * already knows it may not see: the API would answer 403, and a 403 on page
 * load is a toast the user can do nothing about.
 */
export function useEmployeeSalary(employeeId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.salary(employeeId ?? 0),
    queryFn: () => employeesApi.getSalary(employeeId as number),
    enabled: !!employeeId && enabled,
    retry: false,
  });
}

export function useOrgTree(params: { root?: number; department?: number; include_past?: boolean }) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.tree(params),
    queryFn: () => employeesApi.getTree(params),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.departments(),
    queryFn: () => employeesApi.getDepartments(),
  });
}

export function useDesignations() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.designations(),
    queryFn: () => employeesApi.getDesignations(),
  });
}

export function useSalaryApprovals(page = 1, enabled = true) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.approvals(page),
    queryFn: () => employeesApi.getSalaryApprovals(page),
    enabled,
    retry: false,
  });
}

export function useSalaryRevisions(
  params: { revision_type?: string; employee?: number; year?: number; page?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.revisions(params),
    queryFn: () => employeesApi.getSalaryRevisions(params),
    enabled,
    retry: false,
  });
}

export function useWorkforceReports(includePast = false) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.reports(includePast),
    queryFn: () => employeesApi.getReports(includePast),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Everything in the module — what a structural change can touch. */
function useInvalidateModule() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
}

export function useCreateEmployee() {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: EmployeePayload) => employeesApi.createEmployee(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(employeeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeEditPayload) =>
      employeesApi.updateEmployee(employeeId, payload),
    onSuccess: (employee) => {
      queryClient.setQueryData(EMPLOYEE_KEYS.detail(employeeId), employee);
      queryClient.invalidateQueries({ queryKey: ['employee-hierarchy', 'list'] });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.history(employeeId) });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.audit(employeeId) });
    },
  });
}

export function useChangeManager(employeeId: number) {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: ManagerChangePayload) =>
      employeesApi.changeManager(employeeId, payload),
    onSuccess: invalidate,
  });
}

export function useChangeDepartment(employeeId: number) {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: DepartmentChangePayload) =>
      employeesApi.changeDepartment(employeeId, payload),
    onSuccess: invalidate,
  });
}

export function useChangeDesignation(employeeId: number) {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: DesignationChangePayload) =>
      employeesApi.changeDesignation(employeeId, payload),
    onSuccess: invalidate,
  });
}

export function usePromote(employeeId: number) {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: PromotionPayload) => employeesApi.promote(employeeId, payload),
    onSuccess: invalidate,
  });
}

export function useChangeStatus(employeeId: number) {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (payload: StatusChangePayload) => employeesApi.changeStatus(employeeId, payload),
    onSuccess: invalidate,
  });
}

/** A salary write moves nobody, so it invalidates money and rows, not the tree. */
function useInvalidateSalary(employeeId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.salary(employeeId) });
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.history(employeeId) });
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.audit(employeeId) });
    queryClient.invalidateQueries({ queryKey: ['employee-hierarchy', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['employee-hierarchy', 'salary-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['employee-hierarchy', 'salary-revisions'] });
    queryClient.invalidateQueries({ queryKey: ['employee-hierarchy', 'reports'] });
  };
}

export function useCreateSalary(employeeId: number) {
  const invalidate = useInvalidateSalary(employeeId);
  return useMutation({
    mutationFn: (payload: SalaryPayload) => employeesApi.createSalary(employeeId, payload),
    onSuccess: invalidate,
  });
}

export function useDecideSalary(employeeId: number) {
  const invalidate = useInvalidateSalary(employeeId);
  return useMutation({
    mutationFn: ({
      recordId,
      decision,
      reason,
    }: {
      recordId: number;
      decision: 'approve' | 'reject';
      reason?: string;
    }) => employeesApi.decideSalary(recordId, decision, reason ?? ''),
    onSuccess: invalidate,
  });
}

export function useSaveDepartment() {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: DepartmentPayload }) =>
      id ? employeesApi.updateDepartment(id, payload) : employeesApi.createDepartment(payload),
    onSuccess: invalidate,
  });
}

export function useRetireDepartment() {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (departmentId: number) => employeesApi.retireDepartment(departmentId),
    onSuccess: invalidate,
  });
}

export function useSaveDesignation() {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: DesignationPayload }) =>
      id ? employeesApi.updateDesignation(id, payload) : employeesApi.createDesignation(payload),
    onSuccess: invalidate,
  });
}

export function useRetireDesignation() {
  const invalidate = useInvalidateModule();
  return useMutation({
    mutationFn: (designationId: number) => employeesApi.retireDesignation(designationId),
    onSuccess: invalidate,
  });
}
