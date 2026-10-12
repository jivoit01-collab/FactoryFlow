/**
 * Editing a GRPO that is already in SAP (any GRPO, not only the app's own).
 * Mirrors factory_app `grpo/views_sap_edit.py`.
 */

/** SAP's OPDN.DocType: I = items (material), S = service. */
export type SapGRPOType = 'I' | 'S';

export type SapGRPOFieldType = 'text' | 'date' | 'integer' | 'number' | 'choice';

export type SapGRPOFieldValue = string | number | null;

export interface SapGRPOFieldOption {
  value: number | string;
  label: string;
}

export interface SapGRPOHeaderField {
  key: string;
  label: string;
  type: SapGRPOFieldType;
  max_length: number | null;
  /** What SAP holds now, normalised: ISO dates, trimmed text, ints. */
  value: SapGRPOFieldValue;
  options?: SapGRPOFieldOption[];
}

export interface SapGRPOLineField {
  key: 'amount' | 'month';
  label: string;
  type: SapGRPOFieldType;
}

export interface SapGRPOLine {
  line_num: number;
  item_code: string;
  description: string;
  quantity: string | null;
  unit_price: string | null;
  discount_percent: string;
  amount: string | null;
  tax_amount: string | null;
  tax_code: string;
  gl_account: string;
  variety: string;
  month: string;
  budget: string;
  line_status: 'O' | 'C';
  closed_reason: string;
  ap_invoice_doc_num: number | null;
  editable: boolean;
}

export type SapGRPOEditStatus = 'WAITING' | 'POSTED' | 'REFUSED';

export interface SapGRPOHeaderChange {
  label: string;
  before: SapGRPOFieldValue;
  after: SapGRPOFieldValue;
}

export interface SapGRPOLineChange {
  line_num: number;
  field: 'amount' | 'month';
  label: string;
  before: SapGRPOFieldValue;
  after: SapGRPOFieldValue;
}

export interface SapGRPOEdit {
  id: number;
  status: SapGRPOEditStatus;
  status_label: string;
  message: string;
  summary: string;
  changes: {
    header?: Record<string, SapGRPOHeaderChange>;
    lines?: SapGRPOLineChange[];
    attachments_removed?: { filename: string; label: string }[];
  };
  attachments: string[];
  requested_by: string;
  created_at: string | null;
  posted_at: string | null;
}

export interface SapGRPODocument {
  doc_entry: number;
  doc_num: number;
  doc_type: SapGRPOType;
  doc_type_label: string;
  doc_status: 'O' | 'C';
  cancelled: boolean;
  doc_date: string | null;
  card_code: string;
  card_name: string;
  branch_name: string;
  doc_total: string | null;
  vat_sum: string | null;
  created_by: string;
  created_on: string | null;
  /** The person holds the right for this GRPO's type. */
  can_edit: boolean;
  permission_message: string;
  /** Why nothing can change (a cancelled GRPO), or "". */
  blocked_reason: string;
  /** Posted before SAP's back-date window for the app's login. */
  back_date: { floor: string; message: string } | null;
  header_fields: SapGRPOHeaderField[];
  line_fields: SapGRPOLineField[];
  month_options: { code: string; name: string }[];
  lines: SapGRPOLine[];
  attachments: { line: number; filename: string; date: string | null }[];
  /** Why files cannot be removed here (the entry is shared), or "". */
  attachments_shared_message: string;
  edits: SapGRPOEdit[];
  material_posting_id: number | null;
  service_posting_id: number | null;
}

export interface SapGRPOMatch {
  doc_entry: number;
  doc_num: number;
  doc_type: SapGRPOType;
  doc_type_label: string;
  doc_date: string | null;
  card_name: string;
  cancelled: boolean;
}

export interface SapGRPOFindResult {
  /** The GRPOs with that number, of the type asked for. */
  results: SapGRPOMatch[];
  /** Found, but of the other type: edited on the other screen. */
  other_type: { doc_entry: number; doc_type: SapGRPOType; doc_type_label: string }[];
}

export interface SapGRPOEditRequest {
  header: Record<string, { before: SapGRPOFieldValue; after: SapGRPOFieldValue }>;
  lines: { line_num: number; field: 'amount' | 'month'; before: SapGRPOFieldValue; after: SapGRPOFieldValue }[];
  /** Files to take off the GRPO's attachments in SAP. */
  remove_attachments?: { filename: string }[];
}

export interface SapGRPOEditResponse {
  edit: SapGRPOEdit;
  outcome: 'POSTED' | 'WAITING' | 'REJECTED';
  message: string;
  detail?: string;
}
