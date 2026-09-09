/**
 * Employee Hierarchy & Compensation Permissions
 *
 * These map 1:1 to the custom Django permissions on
 * `employee_hierarchy.EmployeePermission`.
 *
 * The split that matters is **directory vs salary**, and the frontend has to
 * respect it as strictly as the API does. `VIEW` opens the org chart and the
 * whole directory and reveals no money at all; every figure on every screen is
 * behind one of the four salary grants, and the API returns `salary: null` for
 * anybody the viewer may not see. Being someone's manager is not, on its own,
 * one of those grants — `VIEW_SUBORDINATE_SALARY` is, and it is granted
 * deliberately.
 *
 * `UPDATE_SALARY` drafts a revision; `APPROVE_SALARY` is what puts one in
 * force. A screen that offers the second to somebody holding only the first is
 * a button that 403s, so both are checked separately wherever they are used.
 */

export const EMPLOYEE_PERMISSIONS = {
  /** Open the directory and the org chart */
  VIEW: 'employee_hierarchy.can_view_employees',
  /** Add and edit employees, and move them in the tree */
  MANAGE: 'employee_hierarchy.can_manage_employees',
  /** Maintain departments and designations */
  MANAGE_STRUCTURE: 'employee_hierarchy.can_manage_org_structure',
  /** Headcount and org reports */
  VIEW_REPORTS: 'employee_hierarchy.can_view_workforce_reports',
  /** Who changed what about an employee */
  VIEW_AUDIT: 'employee_hierarchy.can_view_employee_audit',

  /** Their own salary, and nobody else's */
  VIEW_OWN_SALARY: 'employee_hierarchy.can_view_own_salary',
  /** Anyone below them in the tree, at any depth */
  VIEW_SUBORDINATE_SALARY: 'employee_hierarchy.can_view_subordinate_salary',
  /** Their department, and any they head, including sub-departments */
  VIEW_DEPARTMENT_SALARY: 'employee_hierarchy.can_view_department_salary',
  /** Everybody (HR, Finance, an administrator) */
  VIEW_ALL_SALARIES: 'employee_hierarchy.can_view_all_salaries',
  /** Past records, not just the one in force */
  VIEW_SALARY_HISTORY: 'employee_hierarchy.can_view_salary_history',
  /** Enter a salary record */
  CREATE_SALARY: 'employee_hierarchy.can_create_salary',
  /** Draft a revision */
  UPDATE_SALARY: 'employee_hierarchy.can_update_salary',
  /** Put a revision in force */
  APPROVE_SALARY: 'employee_hierarchy.can_approve_salary_revision',
} as const;

export const EMPLOYEE_MODULE_PREFIX = 'employee_hierarchy';

/** Anything that should reveal the module in the sidebar. */
export const EMPLOYEE_ACCESS: readonly string[] = [
  EMPLOYEE_PERMISSIONS.VIEW,
  EMPLOYEE_PERMISSIONS.MANAGE,
  EMPLOYEE_PERMISSIONS.MANAGE_STRUCTURE,
  EMPLOYEE_PERMISSIONS.VIEW_REPORTS,
];

/** The department and designation masters. */
export const EMPLOYEE_STRUCTURE_ACCESS: readonly string[] = [
  EMPLOYEE_PERMISSIONS.MANAGE_STRUCTURE,
];

/** The workforce reports page. */
export const EMPLOYEE_REPORTS_ACCESS: readonly string[] = [
  EMPLOYEE_PERMISSIONS.VIEW_REPORTS,
  EMPLOYEE_PERMISSIONS.MANAGE,
];

/** Any grant that lets someone see *some* salary figure. */
export const SALARY_ACCESS: readonly string[] = [
  EMPLOYEE_PERMISSIONS.VIEW_OWN_SALARY,
  EMPLOYEE_PERMISSIONS.VIEW_SUBORDINATE_SALARY,
  EMPLOYEE_PERMISSIONS.VIEW_DEPARTMENT_SALARY,
  EMPLOYEE_PERMISSIONS.VIEW_ALL_SALARIES,
];

export type EmployeePermission =
  (typeof EMPLOYEE_PERMISSIONS)[keyof typeof EMPLOYEE_PERMISSIONS];
