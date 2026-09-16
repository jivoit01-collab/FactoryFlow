/**
 * Types for the department ownership chart.
 *
 * Two shapes on purpose: what the API returns (every row has an `id`) and what
 * the editor holds (`*Draft` — a row being added has no id yet, and carries a
 * `key` so React keeps track of it while it is still nameless).
 */

export interface OrgFunctionRow {
  id: number;
  /** Section. Blank for a department that is not sub-divided. */
  name: string;
  /** Second line under the section — "Storage / OIL" vs "Storage / Packing material". */
  subtitle: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
  sort_order: number;
}

export interface OrgDepartmentBlock {
  id: number;
  name: string;
  /** Who heads the whole department. Blank when the chart names nobody. */
  head: string;
  sort_order: number;
  functions: OrgFunctionRow[];
}

export interface OrgChart {
  /** Title of the chart, e.g. "Oil Plant". */
  plant_name: string;
  /** Who heads the plant. Blank when the chart names nobody. */
  plant_head: string;
  departments: OrgDepartmentBlock[];
  /** Whether this user may edit the chart (`org_chart.can_manage_org_chart`). */
  can_manage: boolean;
}

export interface OrgFunctionDraft {
  /** Stable React key for the lifetime of the edit — not sent to the API. */
  key: string;
  id?: number;
  name: string;
  subtitle: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
}

export interface OrgDepartmentDraft {
  key: string;
  id?: number;
  name: string;
  head: string;
  functions: OrgFunctionDraft[];
}

/** The chart as the API takes it back: order is position in the array. */
export interface OrgChartSavePayload {
  plant_name: string;
  plant_head: string;
  departments: {
    id?: number;
    name: string;
    head: string;
    functions: {
      id?: number;
      name: string;
      subtitle: string;
      owners: string[];
      level_1: string[];
      level_2: string[];
    }[];
  }[];
}

/** The three people columns, in chart order. */
export type OrgLevelKey = 'owners' | 'level_1' | 'level_2';

/* ------------------------------------------------------------------ *
 * Request Labour — what each department needs on the next day's shifts.
 *
 * Two counts live on every row and they mean different things:
 * `requested_count` is what the department asked for, `approved_count` is what
 * the approver granted (never more, sometimes less, zero on a rejection).
 * `effective_count` is the backend's single answer to "so how many people is
 * the plant arranging?" — the ask while pending, the grant once approved, zero
 * once rejected — so the screen never has to re-derive that rule.
 * ------------------------------------------------------------------ */

export type LabourRequestShift = 'DAY' | 'NIGHT';

export type LabourRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LabourRequest {
  id: number;
  company: number;
  department: number;
  department_name: string;
  work_date: string;
  shift: LabourRequestShift;
  requested_count: number;
  note: string;
  status: LabourRequestStatus;
  status_display: string;
  /** Null until a decision is made; 0 on a rejection. */
  approved_count: number | null;
  /** What the plant should actually arrange — see the block comment above. */
  effective_count: number;
  decision_note: string;
  decided_at: string | null;
  decided_by_name: string | null;
  is_deleted: boolean;
  /** Whether a soft-deleted request is still inside the restore grace window. */
  can_restore: boolean;
  created_by_name: string | null;
  updated_by_name: string | null;
  deleted_by_name: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LabourRequestAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'REOPEN'
  | 'DELETE'
  | 'RESTORE';

export interface LabourRequestAudit {
  id: number;
  action: LabourRequestAuditAction;
  action_display: string;
  detail: string;
  old_value: number | null;
  new_value: number | null;
  performed_by_name: string | null;
  created_at: string;
}

export interface RaiseRequestPayload {
  department: number;
  work_date: string;
  shift: LabourRequestShift;
  requested_count: number;
  note?: string;
}

export interface UpdateRequestPayload {
  requested_count?: number;
  note?: string;
}

export interface DecideRequestPayload {
  decision: Extract<LabourRequestStatus, 'APPROVED' | 'REJECTED'>;
  /** Approval only. Defaults to the full ask on the backend; never above it. */
  approved_count?: number;
  note?: string;
}
