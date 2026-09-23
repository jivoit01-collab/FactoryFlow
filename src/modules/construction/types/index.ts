/**
 * Types for the construction module.
 *
 * Written from the backend's documented payloads
 * (`factory_app/docs/construction_projects/README.md` section 5), not from
 * whatever the API happened to return — a field the doc does not promise is a
 * field that will move.
 *
 * Every money value is a STRING. The backend quantises and stringifies on the
 * way out so no amount is ever a float; keep it a string until it is formatted
 * for display or parsed for arithmetic.
 */

export type ProjectStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type RevisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export type StopReason =
  | 'RAIN'
  | 'NO_MATERIAL'
  | 'NO_LABOUR'
  | 'NO_POWER'
  | 'HOLIDAY'
  | 'APPROVAL_PENDING'
  | 'SAFETY'
  | 'OTHER';

export type ExpenseCategory =
  | 'MATERIAL'
  | 'LABOUR'
  | 'CONTRACTOR'
  | 'EQUIPMENT_HIRE'
  | 'TRANSPORT'
  | 'PROFESSIONAL_FEES'
  | 'STATUTORY'
  | 'OTHER';

export type DimensionUnit = 'FT' | 'M';

export type ExpenseBatchStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

export type PaymentMode = 'CASH' | 'BANK' | 'CHEQUE' | 'UPI' | 'CREDIT';

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface ProjectListItem {
  id: number;
  code: string;
  name: string;
  location: string;
  status: ProjectStatus;
  status_display: string;
  /** Null on a draft: nothing below is required until the project is sent
   *  for approval, which is what `services.REQUIRED_TO_SUBMIT` enforces. */
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  estimated_cost: string | null;
  /** How big it is. All optional — a boundary wall has no meaningful breadth. */
  length: string | null;
  breadth: string | null;
  height: string | null;
  dimension_unit: DimensionUnit;
  /** Derived; null unless the sides it needs are set. */
  area: string | null;
  area_unit: string;
  volume: string | null;
  volume_unit: string;
  sanctioned_budget: string;
  spent_amount: string;
  remaining_budget: string;
  percent_used: string;
  is_over_budget: boolean;
  is_overdue: boolean;
  /** Negative once late; null once the project has an actual end date. */
  days_left: number | null;
  progress_percent: string;
  manager: number | null;
  manager_name: string | null;
}

export interface ProjectDetail extends ProjectListItem {
  description: string;
  site_incharge: number | null;
  site_incharge_name: string | null;
  submitted_at: string | null;
  submitted_by_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  /** Set only on approval. The single test for "is the money sanctioned". */
  sanctioned_at: string | null;
  decision_note: string;
  is_editable: boolean;
  days_elapsed: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/** The header every screen shows. */
export interface ProjectSummary {
  id: number;
  code: string;
  name: string;
  status: ProjectStatus;
  status_display: string;
  location: string;
  sanctioned_budget: string;
  spent_amount: string;
  remaining: string;
  percent_used: string;
  is_over_budget: boolean;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  days_elapsed: number | null;
  days_left: number | null;
  is_overdue: boolean;
  progress_percent: string;
  last_log_date: string | null;
  /** A project nobody has written up for days is the first sign of a stall. */
  days_since_last_log: number | null;
  revisions: { count: number; pending: number };
  spent_today: string;
  /** `spent_amount` is approved + pending; these break it out. */
  approved_amount: string;
  pending_amount: string;
  pending_count: number;
  /** False while any spend is unapproved — no more budget until the last lot
   *  is accounted for. */
  can_request_revision: boolean;
  open_batch: {
    id: number;
    batch_no: number;
    status: ExpenseBatchStatus;
    line_count: number;
    total: string;
  } | null;
}

export interface ProjectPayload {
  name: string;
  description?: string;
  location?: string;
  /** A draft may be saved with any of these still empty. */
  start_date: string | null;
  expected_end_date: string | null;
  estimated_cost: string | null;
  manager: number | null;
  site_incharge?: number | null;
  length?: string | null;
  breadth?: string | null;
  height?: string | null;
  dimension_unit?: DimensionUnit;
}

/** One row of the estimate sheet: 700 BAG of CEMENT at 350 = 245000. */
export interface EstimateLine {
  id: number;
  line_no: number;
  material: string;
  quantity: string;
  unit: string;
  rate: string;
  /** Derived, never sent. */
  amount: string;
  notes: string;
}

export interface EstimateLinePayload {
  line_no?: number;
  material: string;
  quantity?: string;
  unit?: string;
  rate?: string;
  notes?: string;
}

export interface Estimate {
  lines: EstimateLine[];
  total: string;
  estimated_cost: string;
  is_editable: boolean;
}

export interface ProjectFilters {
  status?: string;
  manager?: number;
  search?: string;
  mine?: 'true';
  over_budget?: 'true';
  overdue?: 'true';
}

export interface DecisionPayload {
  note?: string;
}

export interface CompletePayload extends DecisionPayload {
  actual_end_date?: string;
}

// ---------------------------------------------------------------------------
// The daily loop
// ---------------------------------------------------------------------------

/** A paper that belongs to the project: a quotation, a drawing, the sanction
 *  letter. Distinct from a DailyLogPhoto, which belongs to one day. */
export type AttachmentKind = 'MAP' | 'DOCUMENT';

export interface ProjectAttachment {
  id: number;
  file: string;
  filename: string | null;
  title: string;
  kind: AttachmentKind;
  kind_display: string;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface DailyLogPhoto {
  id: number;
  photo: string;
  caption: string;
  created_at: string;
}

export interface DailyLog {
  id: number;
  project: number;
  log_date: string;
  work_done: string;
  workers_count: number;
  progress_percent: string | null;
  work_stopped: boolean;
  /** A day can be stopped for several reasons at once. */
  stopped_reasons: StopReason[];
  stopped_reasons_display: string[];
  notes: string;
  photos: DailyLogPhoto[];
  logged_by_name: string | null;
  /** What that day cost. Always a number-as-string, 0.00 when nothing. */
  spent_on_day: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  project: number;
  project_code: string;
  project_name: string;
  spend_date: string;
  category: ExpenseCategory;
  category_display: string;
  description: string;
  amount: string;
  paid_to: string;
  payment_mode: PaymentMode;
  payment_mode_display: string;
  reference_no: string;
  bill: string | null;
  /** Lines are not approved one at a time — they belong to a batch, and the
   *  batch is what somebody approves. */
  batch: number;
  batch_no: number;
  batch_status: ExpenseBatchStatus;
  /** Only while its batch is still the site's to change. */
  is_editable: boolean;
  recorded_by_name: string | null;
  created_at: string;
}

/** A project's running set of payments, settled by one decision. */
export interface ExpenseBatch {
  id: number;
  project: number;
  project_code: string;
  project_name: string;
  batch_no: number;
  status: ExpenseBatchStatus;
  status_display: string;
  total: string;
  line_count: number;
  is_editable: boolean;
  submitted_at: string | null;
  submitted_by_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  decision_note: string;
  created_at: string;
}

export interface ExpenseBatchDetail extends ExpenseBatch {
  expenses: Expense[];
}

export interface ExpenseBatchList {
  batches: ExpenseBatch[];
  /** The one still collecting, or null when everything is settled. */
  open: ExpenseBatchDetail | null;
}

export interface BatchDecisionPayload {
  decision: 'APPROVED' | 'RETURNED';
  note?: string;
}


export interface DailyLogPayload {
  log_date: string;
  work_done: string;
  workers_count?: number;
  progress_percent?: string | null;
  work_stopped?: boolean;
  stopped_reasons?: StopReason[];
  notes?: string;
}

export interface ExpensePayload {
  spend_date: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  paid_to?: string;
  payment_mode?: PaymentMode;
  reference_no?: string;
}

/** What the payments table asks the server for. Ordering is whitelisted there. */
export interface ExpenseListFilters {
  search?: string;
  category?: string;
  payment_mode?: string;
  batch_status?: string;
  batch?: number;
  from?: string;
  to?: string;
  /** A column name, "-" prefixed for descending. */
  ordering?: string;
}

/** The list carries its own count and filtered total, so the table's footer
 *  does not re-add what it was just sent. */
export interface ExpenseList {
  results: Expense[];
  total: string;
  count: number;
}

/** The overrun block. Present on any write that pushes spend past the budget. */
export interface BudgetWarning {
  code: 'budget_exceeded';
  sanctioned: string;
  spent: string;
  over_by: string;
  message: string;
}

export interface DailyLogSaveResponse {
  log: DailyLog;
  warning: BudgetWarning | null;
}

export interface ExpenseSaveResponse {
  expense: Expense;
  warning: BudgetWarning | null;
}

/** The screen the whole module is for. */
export interface DayView {
  date: string;
  log: DailyLog | null;
  expenses: Expense[];
  spent_today: string;
  spent_to_date: string;
  budget_remaining: string;
}

export interface SpendSummary {
  total_spent: string;
  sanctioned_budget: string;
  by_category: { category: ExpenseCategory; amount: string; count: number }[];
  by_month: { month: string; amount: string }[];
  days_logged: number;
  days_lost: { reason: StopReason; days: number }[];
  days_lost_total: number;
}

// ---------------------------------------------------------------------------
// Revisions — more money, more time, or both
// ---------------------------------------------------------------------------

export interface ProjectRevision {
  id: number;
  project: number;
  project_code: string;
  project_name: string;
  revision_no: number;
  additional_amount: string;
  new_end_date: string | null;
  reason: string;
  budget_before: string;
  budget_after: string;
  end_date_before: string;
  end_date_after: string;
  extension_days: number;
  status: RevisionStatus;
  status_display: string;
  requested_by_name: string | null;
  requested_at: string;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string;
}

export interface RevisionPayload {
  additional_amount?: string;
  new_end_date?: string | null;
  reason: string;
}

export interface ApprovalQueue {
  projects: ProjectListItem[];
  revisions: ProjectRevision[];
  /** Batches waiting to be checked. Empty unless you may approve them. */
  batches: ExpenseBatchDetail[];
}

/** The module's one error shape. `code` is stable; `detail` may be reworded. */
export interface ConstructionError {
  detail: string;
  code: string;
  context: Record<string, string | number>;
}
