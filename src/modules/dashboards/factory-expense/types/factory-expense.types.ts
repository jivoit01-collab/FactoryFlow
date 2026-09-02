/**
 * Factory Expense board — the shapes the backend returns.
 *
 * Money arrives as strings because DRF serialises `DecimalField` that way;
 * every consumer runs it through `Number()` at the edge rather than trusting
 * arithmetic on a string.
 */

export type ExpenseBucketKey = 'LABOUR' | 'SALARY' | 'ELECTRICITY' | 'MAINTENANCE';

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
  /** Inside the selected from/to span. Days outside it are context only. */
  in_range: boolean;
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
  /** Null for the company-wide blanket row, which has no department. */
  department_id: number | null;
  monthly: string;
  daily: string;
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
  date_from: string;
  date_to: string;
  /** Days in the selected span, inclusive. 1 when from and to are the same. */
  days: number;
  is_single_day: boolean;
  month: string;
  /** "All companies" when the board spans more than one. */
  company_code: string;
  company_codes: string[];
  company_count: number;
  settings: ExpenseBoardSettings;
  buckets: Record<ExpenseBucketKey, ExpenseBucketFigures>;
  total: {
    /** The selected span's total. Named `today` because a single day is the default. */
    today: string;
    mtd: string;
    per_day: string;
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

/**
 * One Cost Master row the board could price with, as read back for display.
 *
 * Mirrors `cost_master.CostRate`. Read-only here on purpose: rates are created
 * and edited in Admin > Cost Master, so the board can never become a second
 * place where a rate is set.
 */
export interface ResolvedRate {
  id: number;
  scope: 'FACTORY' | 'COMPANY' | 'DEPARTMENT' | 'VALUE';
  scope_display: string;
  company_code: string | null;
  department: string | null;
  basis: string;
  basis_display: string;
  rate: string;
  effective_from: string;
  notes: string;
}

export interface ResolvedRateGroup {
  cost_type_code: string;
  rates: ResolvedRate[];
}

export interface ResolvedRates {
  date: string;
  labour: ResolvedRateGroup;
  salary: ResolvedRateGroup;
}

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

export type MonthlyBudgetPayload = Omit<MonthlyBudgetRow, 'id' | 'bucket_display' | 'updated_at'>;

export interface FactoryExpenseSettings extends ExpenseBoardSettings {
  maintenance_include_spares: boolean;
  maintenance_include_indents: boolean;
  electricity_only_company_meters: boolean;
  updated_at: string;
}

/** Whether the board covers every company the viewer can see, or just one. */
export type ExpenseScope = 'all' | 'company';
