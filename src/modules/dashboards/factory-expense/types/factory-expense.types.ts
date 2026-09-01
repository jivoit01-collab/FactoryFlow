/**
 * Factory Expense board — the shapes the backend returns.
 *
 * Money arrives as strings because DRF serialises `DecimalField` that way;
 * every consumer runs it through `Number()` at the edge rather than trusting
 * arithmetic on a string.
 */

export type ExpenseBucketKey = 'LABOUR' | 'SALARY' | 'ELECTRICITY' | 'MAINTENANCE';

export type RateShift = 'ANY' | 'DAY' | 'NIGHT';

export interface ExpenseBucketFigures {
  today: string;
  mtd: string;
  budget: string | null;
  /** Month-to-date as a percentage of the month's budget; null when unbudgeted. */
  budget_used_pct: number | null;
  /** The physical quantity behind the money — headcount, employees, units. */
  unit: string | number | null;
  unit_label: string | null;
  /** Why this bucket is empty, when it is. Shown on the tile. */
  warning: string | null;
}

export interface ExpenseTrendPoint {
  date: string;
  is_today: boolean;
  labour: string;
  salary: string;
  electricity: string;
  maintenance: string;
  total: string;
  headcount: number;
  units: string;
}

export interface LabourDepartmentRow {
  department: string;
  headcount: number;
  cost: string;
}

export interface LabourContractorRow {
  contractor: string;
  headcount: number;
  cost: string;
}

export interface SalaryDepartmentRow {
  department: string;
  department_id: number;
  employees: number;
  monthly: string;
  daily: string;
  per_employee: string | null;
}

export interface MeterRow {
  meter: string;
  units: string;
  cost: string;
  rate: string;
}

export interface MaintenanceItemRow {
  label: string;
  kind: string;
  amount: string;
}

export interface ExpenseBoardSettings {
  show_labour: boolean;
  show_salary: boolean;
  show_electricity: boolean;
  show_maintenance: boolean;
  refresh_seconds: number;
  rotate_seconds: number;
}

export interface ExpenseBoard {
  date: string;
  month: string;
  company_code: string;
  settings: ExpenseBoardSettings;
  buckets: Record<ExpenseBucketKey, ExpenseBucketFigures>;
  total: {
    today: string;
    mtd: string;
    budget: string | null;
    budget_used_pct: number | null;
  };
  trend: ExpenseTrendPoint[];
  labour_departments: LabourDepartmentRow[];
  labour_contractors: LabourContractorRow[];
  salary_departments: SalaryDepartmentRow[];
  meters: MeterRow[];
  maintenance_items: MaintenanceItemRow[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DepartmentOption {
  id: number;
  name: string;
}

export interface LabourRate {
  id: number;
  department: number | null;
  department_name: string | null;
  shift: RateShift;
  shift_display: string;
  rate_per_person_per_day: string;
  effective_from: string;
  notes: string;
  is_active: boolean;
  updated_at: string;
}

export type LabourRatePayload = Omit<
  LabourRate,
  'id' | 'department_name' | 'shift_display' | 'updated_at'
>;

export interface DepartmentSalary {
  id: number;
  department: number;
  department_name: string;
  month: string;
  employee_count: number;
  monthly_amount: string;
  per_employee: number | null;
  notes: string;
  is_active: boolean;
  updated_at: string;
}

export type DepartmentSalaryPayload = Omit<
  DepartmentSalary,
  'id' | 'department_name' | 'per_employee' | 'updated_at'
>;

export interface MonthlyBudgetRow {
  id: number;
  bucket: ExpenseBucketKey;
  bucket_display: string;
  month: string;
  amount: string;
  notes: string;
  is_active: boolean;
  updated_at: string;
}

export type MonthlyBudgetPayload = Omit<
  MonthlyBudgetRow,
  'id' | 'bucket_display' | 'updated_at'
>;

export interface FactoryExpenseSettings extends ExpenseBoardSettings {
  maintenance_include_spares: boolean;
  maintenance_include_indents: boolean;
  electricity_only_company_meters: boolean;
  updated_at: string;
}
