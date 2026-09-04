// ============================================================================
// Filters
// ============================================================================

export type BudgetApprovalStatus = '' | 'pending' | 'approved' | 'rejected';

/** Excel-style per-column value filters: column field -> selected values. */
export type ColumnFiltersMap = Record<string, string[]>;

export type SortDirection = 'asc' | 'desc';

export interface BudgetApprovalFilters {
  status: BudgetApprovalStatus;
  branch: string;
  effect_month: string;
  search: string;
  column_filters: ColumnFiltersMap;
  sort_by: string;
  sort_dir: SortDirection;
  page: number;
  page_size: number;
}

// ============================================================================
// Draft Approval Line
// ============================================================================

export interface BudgetApprovalLine {
  branch: string;
  doc_entry: number;
  obj_type: string;
  obj_type_label: string;
  line_num: number | null;
  acct_code: string;
  acct_name: string;
  card_code: string;
  card_name: string;
  effect_month: string;
  budget: string;
  sub_budget: string;
  state: string;
  doc_date: string | null;
  amount: number;
  current_month: string;
  current_month_posted_amount: number;
  /** Raw SAP approval status: W = pending, Y = approved, N = rejected. */
  status: string;
  owner: string;
  /** Approver name(s); several approvers on one stage are comma-joined. */
  approver: string;
  created_date: string | null;
  created_time: string;
  line_remarks: string;
  comments: string;
  process_status: string;
  update_date: string | null;
  ocr_code: string;
}

// ============================================================================
// Summary
// ============================================================================

export interface StatusSummary {
  status: string;
  status_label: string;
  line_count: number;
  total_amount: number;
}

export interface ReportSummary {
  total_lines: number;
  total_documents: number;
  total_amount: number;
  pending_lines: number;
  pending_amount: number;
  by_status: StatusSummary[];
}

// ============================================================================
// Response
// ============================================================================

export interface ReportOptions {
  branches: string[];
  effect_months: string[];
}

export interface ReportMeta {
  budget: string;
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
  fetched_at: string;
  from_cache: boolean;
}

export interface BudgetApprovalReportResponse {
  data: BudgetApprovalLine[];
  summary: ReportSummary;
  options: ReportOptions;
  meta: ReportMeta;
}

// ============================================================================
// Column Values (Excel-style filter dropdowns)
// ============================================================================

export interface ColumnValue {
  value: string;
  count: number;
}

export interface ColumnValuesResponse {
  field: string;
  values: ColumnValue[];
  meta: {
    total_values: number;
    truncated: boolean;
    fetched_at: string;
  };
}
