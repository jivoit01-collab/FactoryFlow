// Material indent types — a departmental requisition that, once approved, generates
// a gate pass and appears in the gate's Material Out screen.

export type MaterialIndentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type MaterialIndentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface MaterialIndentItem {
  id: number;
  indent: number;
  line_num: number;
  particulars: string;
  specification: string;
  quantity: string;
  unit: string;
  priority: MaterialIndentPriority;
  remarks: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndent {
  id: number;
  company: number;
  indent_no: string;
  indent_date: string;
  purpose: string;
  department: number | null;
  department_name: string;
  requested_by_name: string;
  contact_no: string;
  is_returnable: boolean;
  status: MaterialIndentStatus;
  status_display: string;
  remarks: string;
  submitted_by: number | null;
  submitted_by_name: string;
  submitted_at: string | null;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  decision_remarks: string;
  // The gate pass generated on approval — the bridge into Gate → Material Out.
  generated_gate_pass: number | null;
  generated_pass_no: string;
  items: MaterialIndentItem[];
  total_items: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndentItemInput {
  particulars: string;
  specification?: string;
  quantity: string;
  unit?: string;
  priority?: MaterialIndentPriority;
  remarks?: string;
}

export interface MaterialIndentPayload {
  indent_date: string;
  purpose?: string;
  department?: number | null;
  requested_by_name?: string;
  contact_no?: string;
  is_returnable?: boolean;
  remarks?: string;
  items_input?: MaterialIndentItemInput[];
}

export type MaterialIndentUpdatePayload = Partial<MaterialIndentPayload>;

export interface MaterialIndentDecisionPayload {
  decision_remarks?: string;
}

export interface MaterialIndentFilters {
  search?: string;
  status?: MaterialIndentStatus | 'ALL';
  department?: number | 'ALL';
  is_returnable?: boolean;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
}
