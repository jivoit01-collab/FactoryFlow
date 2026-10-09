/**
 * SAP approval requests as `factory_app/sap_approvals` sends them — read live
 * from HANA by `sap_client/hana/approval_inbox_reader.py`.
 */

/** The draft-aware status: a request SAP still lists as pending but whose
 * draft's approval ended is reported with the draft's outcome. */
export type SapApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'GENERATED' | 'CANCELLED';

export type SapApprovalScope = 'waiting_on_me' | 'raised_by_me' | 'all';

export interface SapApprovalFilters {
  scope: SapApprovalScope;
  status: SapApprovalStatus | 'ALL';
  object_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}

/** An already-posted copy of the document — approving would post it again. */
export interface PostedDocument {
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  total_amount: string | null;
  currency: string | null;
  table: string;
  from_draft_entry: number | null;
}

/** Another live request SAP opened on the same draft (one per template). */
export interface SiblingRequest {
  wdd_code: number;
  status: SapApprovalStatus;
  template_code: number | null;
  template_name: string | null;
  created_at: string | null;
}

export interface SapApprovalDocument {
  /** The draft's number — provisional, shared by open drafts. A hint, not a key. */
  doc_num: number | null;
  doc_type: string | null;
  card_code: string | null;
  party_name: string | null;
  reference: string | null;
  /** Decimal string: money must not go through a float. */
  total_amount: string | null;
  currency: string | null;
  doc_date: string | null;
  comments: string | null;
}

export interface SapApprovalRequest {
  /** OWDD.WddCode — the id every endpoint acts on. */
  wdd_code: number;
  object_type: string;
  object_type_label: string;
  draft_entry: number | null;
  is_draft: boolean;
  status: SapApprovalStatus;
  /** SAP still says pending, but the draft (or a newer request) says otherwise. */
  stale_pending: boolean;
  /** The draft was edited and SAP opened a newer request for it. */
  superseded: boolean;
  current_step: number | null;
  template_code: number | null;
  template_name: string | null;
  remarks: string | null;
  created_at: string | null;
  originator_code: string | null;
  originator_name: string | null;
  /** The authorizer the current stage waits on (pending only). */
  approver_code: string | null;
  approver_name: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  document: SapApprovalDocument;
  request_count: number;
  pending_request_count: number;
  sibling_requests: SiblingRequest[];
  already_posted_as: PostedDocument | null;
  posted_duplicates: PostedDocument[];
  is_duplicate: boolean;
  /** Pending at a stage of the caller's own SAP user. */
  is_mine: boolean;
  /** The caller raised it in SAP. */
  is_originator: boolean;
  /** A password is stored for the caller's SAP user, so typing one is optional. */
  credentials_configured: boolean;
  /** The server's answer to "may I approve/reject this": the buttons follow it. */
  can_decide: boolean;
  /** Approved or rejected by the caller's own SAP user and not yet posted: they
   * may change it to the other decision. SAP still accepts or refuses it. */
  can_change_decision: boolean;
  /** The server's answer to "may I withdraw this". */
  can_withdraw: boolean;
}

export interface SapApprovalStage {
  step_code: number | null;
  stage_name: string | null;
  user_code: string | null;
  user_name: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null;
  remarks: string | null;
  decided_at: string | null;
  is_current: boolean;
}

export interface SapApprovalLine {
  line_num: number;
  item_code: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  price: string | null;
  line_total: string | null;
  tax_code: string | null;
  warehouse: string | null;
  account_code: string | null;
  base_type_label: string | null;
  base_ref: string | null;
  without_qty_posting: boolean;
}

export interface SapApprovalDetail extends SapApprovalRequest {
  stages: SapApprovalStage[];
  lines: SapApprovalLine[];
  /** False for payment drafts, whose lines are not read here. */
  lines_available: boolean;
}

export interface SapApprovalIdentity {
  sap_user_code: string;
  credentials_configured: boolean;
}

export interface SapApprovalListResponse {
  results: SapApprovalRequest[];
  count: number;
  limit: number;
  /** Where this page starts. */
  offset?: number;
  /** A full page: there may be more — ask for the next offset. */
  truncated: boolean;
  /** Null when the caller is not mapped to a SAP user in this company. */
  identity: SapApprovalIdentity | null;
  message?: string;
  object_types: { code: string; label: string }[];
}

/** What kind of entry was rejected — `RejectionCategory` in sap_approvals/constants.py. */
export type SapRejectionCategory =
  | 'CASH_VOUCHER'
  | 'ELECTRICITY'
  | 'FUEL'
  | 'IMPREST'
  | 'RENT'
  | 'REPAIRS'
  | 'SERVICE'
  | 'SUBSCRIPTION'
  | 'TRANSPORT'
  | 'UTILITY'
  | 'OTHER';

/** What the decision dialog collects. The password is never kept beyond it. */
export interface SapDecisionInput {
  approve: boolean;
  remarks: string;
  /** Required to reject; never sent on an approval. */
  category?: SapRejectionCategory | '';
  sapPassword?: string;
  confirmDuplicate?: boolean;
}

export interface SapActionResult {
  message: string;
  signed_as: string;
  wdd_code: number;
  action: 'APPROVE' | 'REJECT' | 'WITHDRAW';
  /** The outcome a changed decision replaced; null for a first decision. */
  changed_from?: 'APPROVED' | 'REJECTED' | null;
}

export interface SapPendingCount {
  total: number;
}

export interface SapRejectionFilters {
  date_from?: string;
  date_to?: string;
  /** A SAP user code (USER39); blank for everybody. */
  originator?: string;
  /** Every SAP company the caller belongs to, not just the one selected. */
  all_companies?: boolean;
}

/** Where a rejected entry stands now. */
export type SapRejectionStage =
  | 'STILL_REJECTED'
  | 'PENDING'
  | 'APPROVED'
  | 'POSTED'
  | 'REJECTED_AGAIN'
  | 'CLOSED';

export interface SapRejectionNow {
  stage: SapRejectionStage;
  /** How it was found: its own request, or the re-keyed document's reference or amount. */
  via: 'same_request' | 'reference' | 'amount' | null;
  /** The re-keyed draft's or posted document's number. */
  doc_num: number | null;
  posted: boolean;
}

/** One rejected request — `GET rejections/`. */
export interface SapRejection {
  wdd_code: number;
  object_type: string;
  object_type_label: string;
  draft_entry: number | null;
  raised_on: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  /** As SAP holds it, with the app's signature. */
  remarks: string | null;
  /** As it was typed: the app's " — <name> (Factory app)" taken off. */
  reason: string;
  /** Who raised the entry — whose mistake it counts as. */
  originator_code: string | null;
  originator_name: string | null;
  doc_num: number | null;
  doc_date: string | null;
  card_code: string | null;
  party_name: string | null;
  /** The vendor's reference (NumAtCard). */
  reference: string | null;
  /** Decimal string. */
  total_amount: string | null;
  gl_account: string | null;
  gl_account_name: string | null;
  /** Blank unless it was picked in this app when rejecting. */
  category: SapRejectionCategory | '';
  /** The picked category, else the GL account's name, else the document type. */
  category_label: string;
  category_source: 'app' | 'gl' | 'document';
  /** Null only when SAP could not be asked. */
  now: SapRejectionNow | null;
  company_code: string;
  company_name: string;
}

export interface SapRejectionsByOriginator {
  originator_code: string | null;
  originator_name: string | null;
  count: number;
  /** Of those, how many nobody has corrected yet. */
  still_rejected: number;
  /** Decimal string. */
  amount: string;
}

export interface SapRejectionHistory {
  date_from: string;
  date_to: string;
  companies: { code: string; name: string }[];
  /** Companies SAP could not answer for: their rejections are missing. */
  unavailable: { code: string; name: string }[];
  results: SapRejection[];
  count: number;
  truncated: boolean;
  /** Most rejections first. */
  by_originator: SapRejectionsByOriginator[];
  categories: { value: SapRejectionCategory; label: string }[];
}
