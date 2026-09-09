/**
 * The shapes the employee-hierarchy API sends and takes.
 *
 * One convention runs through all of it and is worth stating once: a `salary`
 * of `null` means **"not yours to see"**, while `{ amount: null }` means
 * "nobody has put a salary on record yet". The screens say different things
 * for the two, so nothing here collapses them into a falsy check.
 */

export type EmploymentStatus =
  | 'ACTIVE'
  | 'PROBATION'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'RETIRED';

export type SalaryStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'REJECTED';

export type RevisionType =
  | 'ANNUAL_INCREMENT'
  | 'PROMOTION'
  | 'PERFORMANCE'
  | 'ROLE_CHANGE'
  | 'DEPARTMENT_TRANSFER'
  | 'MARKET_ADJUSTMENT'
  | 'BONUS'
  | 'INITIAL'
  | 'OTHER';

export type RecordStatus = 'ACTIVE' | 'INACTIVE';

export interface Choice {
  value: string;
  label: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
}

/** What the viewer may see or do. Every screen renders against this. */
export interface EmployeePermissionFlags {
  can_view_employees: boolean;
  can_manage_employees: boolean;
  can_manage_structure: boolean;
  can_view_reports: boolean;
  can_view_audit: boolean;
  salary: {
    any: boolean;
    own: boolean;
    subordinates: boolean;
    department: boolean;
    all: boolean;
    history: boolean;
    create: boolean;
    update: boolean;
    approve: boolean;
  };
  /** Which employee this login is, so a page can say "this is you". */
  self_employee_id: number | null;
  self_employee_code: string | null;
}

/** `null` = hidden from this viewer. `amount: null` = none on record. */
export interface SalarySummary {
  amount: string | null;
  currency: string | null;
  effective_from?: string | null;
  can_view_history: boolean;
}

export interface EmployeeBrief {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  photo: string | null;
  initials: string;
  job_title: string;
  department: number | null;
  department_name: string | null;
  designation: number | null;
  designation_name: string | null;
  employment_status: EmploymentStatus;
  status_display: string;
  hierarchy_level: number;
  is_manager: boolean;
  location: string;
}

export interface EmployeeListItem extends EmployeeBrief {
  first_name: string;
  last_name: string;
  joining_date: string;
  reporting_manager: number | null;
  manager_name: string | null;
  manager_code: string | null;
  direct_report_count: number;
  salary: SalarySummary | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string;
  head: number | null;
  head_detail: EmployeeBrief | null;
  parent: number | null;
  parent_name: string | null;
  status: RecordStatus;
  sort_order: number;
  employee_count: number;
  /** Including sub-departments — what somebody reading the tree means. */
  total_employee_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Designation {
  id: number;
  name: string;
  code: string;
  description: string;
  level: number;
  is_managerial: boolean;
  status: RecordStatus;
  employee_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeDetail extends EmployeeBrief {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  joining_date: string;
  exit_date: string | null;
  department_detail: Department | null;
  designation_detail: Designation | null;
  manager: EmployeeBrief | null;
  reporting_manager: number | null;
  hierarchy_path: string;
  direct_report_count: number;
  user: number | null;
  user_detail: UserBrief | null;
  salary: SalarySummary | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeMeta {
  departments: Department[];
  designations: Designation[];
  managers: EmployeeBrief[];
  /**
   * App logins not yet claimed by an employee.
   *
   * The link is what makes "own salary" mean anything — without it the app
   * knows a login and the directory knows a person, and nothing joins them.
   */
  assignable_users: UserBrief[];
  employment_statuses: Choice[];
  revision_types: Choice[];
  salary_statuses: Choice[];
  history_events: Choice[];
  sort_options: string[];
  headcount: number;
  permissions: EmployeePermissionFlags;
}

/** The repo's usual list envelope, plus the directory's own extras. */
export interface PagedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
}

export interface EmployeeListResponse extends PagedResponse<EmployeeListItem> {
  status_counts: Record<string, number>;
  applied_sort: string;
}

export interface EmployeeFilters {
  q?: string;
  department?: number[];
  designation?: number[];
  manager?: number;
  manager_deep?: boolean;
  status?: EmploymentStatus[];
  level?: number[];
  location?: string;
  managers_only?: boolean;
  top_level_only?: boolean;
  joined_from?: string;
  joined_to?: string;
  salary_min?: string;
  salary_max?: string;
  include_past?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

/** One node of the org chart. `children` is nested; `subtree_size` is below. */
export interface OrgTreeNode extends EmployeeBrief {
  direct_report_count: number;
  manager_id: number | null;
  subtree_size: number;
  children: OrgTreeNode[];
}

export interface OrgTreeResponse {
  roots: OrgTreeNode[];
  total: number;
  root_employee: EmployeeBrief | null;
  chain_to_root: EmployeeBrief[];
}

export interface ReportingInfo {
  employee: EmployeeBrief;
  manager: EmployeeBrief | null;
  managers_manager: EmployeeBrief | null;
  /** Top-most first: CEO → … → this person's manager. */
  management_chain: EmployeeBrief[];
  direct_reports: EmployeeListItem[];
  peers: EmployeeBrief[];
  subordinate_count: number;
  direct_report_count: number;
  organisational_path: string[];
  department_path: string[];
}

export interface SalaryRevisionSummary {
  id: number;
  revision_type: RevisionType;
  revision_type_display: string;
  previous_amount: string | null;
  new_amount: string;
  change_amount: string | null;
  change_percent: number | null;
  reason: string;
  notes: string;
  effective_date: string;
  revision_date: string;
}

export interface SalaryRecord {
  id: number;
  basic_salary: string;
  allowances: string;
  bonuses: string;
  deductions: string;
  total_compensation: string;
  currency: string;
  effective_from: string;
  revision_date: string;
  status: SalaryStatus;
  status_display: string;
  approved_by: number | null;
  approved_by_detail: UserBrief | null;
  approved_at: string | null;
  notes: string;
  revision: SalaryRevisionSummary | null;
  created_at: string;
  created_by_detail: UserBrief | null;
}

export interface EmployeeSalaryResponse {
  employee: EmployeeBrief;
  current: SalaryRecord | null;
  records: SalaryRecord[];
  can_view_history: boolean;
  can_create: boolean;
  can_approve: boolean;
  pending_count: number;
}

export interface SalaryRevisionRow {
  id: number;
  employee: number;
  employee_detail: EmployeeBrief;
  salary_record: number;
  previous_amount: string | null;
  new_amount: string;
  change_amount: string | null;
  currency: string;
  effective_date: string;
  revision_date: string;
  revision_type: RevisionType;
  revision_type_display: string;
  reason: string;
  notes: string;
  status: SalaryStatus;
  approved_by_detail: UserBrief | null;
  created_by_detail: UserBrief | null;
  created_at: string;
}

export interface PendingSalaryRow extends SalaryRecord {
  employee: EmployeeBrief;
}

export interface HistoryEntry {
  id: number;
  event: string;
  event_display: string;
  occurred_on: string;
  from_value: string;
  to_value: string;
  notes: string;
  created_at: string;
  created_by_detail: UserBrief | null;
}

export interface AuditEntry {
  id: number;
  action: string;
  action_display: string;
  field: string;
  previous_value: string;
  new_value: string;
  performed_at: string;
  performed_by_detail: UserBrief | null;
  reason: string;
  notes: string;
}

// -- write payloads ---------------------------------------------------------

export interface SalaryPayload {
  basic_salary: string;
  allowances?: string;
  bonuses?: string;
  deductions?: string;
  currency?: string;
  effective_from: string;
  revision_type?: RevisionType;
  reason?: string;
  notes?: string;
  approve?: boolean;
}

export interface EmployeePayload {
  employee_code: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string | null;
  joining_date: string;
  employment_status?: EmploymentStatus;
  department?: number | null;
  designation?: number | null;
  job_title?: string;
  location?: string;
  reporting_manager?: number | null;
  is_manager?: boolean;
  /** The app login this employee is. Required for them to see their own pay. */
  user?: number | null;
  initial_salary?: SalaryPayload | null;
}

/**
 * Editing an employee's plain details.
 *
 * `photo` is a `File` and is the reason this is a separate type: a photo has to
 * go up as multipart, which cannot carry the nested joining salary that
 * *creating* an employee can — so a photo is always a second step, against
 * somebody who already exists.
 */
export interface EmployeeEditPayload
  extends Omit<Partial<EmployeePayload>, 'initial_salary'> {
  photo?: File | null;
  reason?: string;
}

export interface ManagerChangePayload {
  manager: number | null;
  /** Default true: a manager who moves takes their team. */
  carry_team?: boolean;
  reason?: string;
}

export interface DepartmentChangePayload {
  department: number | null;
  include_team?: boolean;
  reason?: string;
}

export interface DesignationChangePayload {
  designation: number | null;
  promotion?: boolean;
  reason?: string;
}

export interface PromotionPayload {
  designation?: number | null;
  manager?: number | null;
  department?: number | null;
  salary?: SalaryPayload | null;
  reason?: string;
}

export interface StatusChangePayload {
  status: EmploymentStatus;
  exit_date?: string | null;
  reassign_reports_to?: number | null;
  reason?: string;
}

export interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
  head?: number | null;
  parent?: number | null;
  status?: RecordStatus;
  sort_order?: number;
}

export interface DesignationPayload {
  name: string;
  code: string;
  description?: string;
  level: number;
  is_managerial?: boolean;
  status?: RecordStatus;
}

// -- reports ----------------------------------------------------------------

export interface WorkforceTotals {
  headcount: number;
  managers: number;
  managers_with_reports: number;
  top_level: number;
  levels_deep: number;
  average_team_size: number;
  joined_this_month: number;
  joined_this_year: number;
  earliest_joining: string | null;
  departments: number;
  designations: number;
}

export interface CountByDepartment {
  id: number | null;
  name: string;
  code: string;
  count: number;
  managers: number;
}

export interface CountByDesignation {
  id: number | null;
  name: string;
  level: number | null;
  count: number;
}

export interface ManagerTeamSize {
  id: number;
  name: string;
  employee_code: string;
  department: string;
  direct_reports: number;
  total_reports: number;
}

export interface SalaryReport {
  visible: boolean;
  scope: 'none' | 'partial' | 'all';
  people_with_salary?: number;
  total_payroll?: string | null;
  average?: string | null;
  median?: number | null;
  lowest?: string | null;
  highest?: string | null;
  currency?: string;
  distribution?: { label: string; from: number | null; to: number | null; count: number }[];
  by_department?: {
    id: number | null;
    name: string;
    people: number;
    total: string | null;
    average: string | null;
  }[];
  revisions_by_type?: { type: RevisionType; label: string; count: number }[];
  pending_approvals?: number;
}

export interface WorkforceReports {
  generated_at: string;
  include_past: boolean;
  totals: WorkforceTotals;
  by_department: CountByDepartment[];
  by_designation: CountByDesignation[];
  by_level: { level: number; count: number }[];
  by_status: { status: EmploymentStatus; label: string; count: number }[];
  by_manager: ManagerTeamSize[];
  joining_trend: { month: string; label: string; joined: number }[];
  turnover: {
    series: { month: string; label: string; exits: number }[];
    exits_12m: number;
    in_service: number;
    rate_percent: number;
  };
  salary: SalaryReport;
}
