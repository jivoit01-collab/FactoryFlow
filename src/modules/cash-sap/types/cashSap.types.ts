/**
 * The cash book -> SAP shapes, field for field as the backend sends them.
 *
 * Source of truth: `factory_app/cash_sap` -- `plan.py` (the dataclasses behind
 * `BunchPlan.as_dict()`), `services.py` (options, send-next, stop, re-check,
 * voucher info) and `serializers.py` (routing, G/L map, bills). Decimals come
 * as strings and dates as ISO `YYYY-MM-DD`, because `plan._native` converts
 * them before the response is written.
 */

/** Where one SAP document the app makes has got to (`SapDocStatus`). */
export type SapDocStatus =
  | 'PLANNED'
  | 'QUEUED'
  | 'IN_APPROVAL'
  | 'POSTED'
  | 'FAILED'
  | 'NOT_NEEDED';

/** What a voucher became (`VoucherTreatment`, plus the plan's `UNROUTED`). */
export type VoucherTreatment = 'ITEM' | 'SERVICE' | 'SKIP' | 'UNROUTED';

/** Where the treatment came from (`plan.SOURCE_*`). */
export type TreatmentSource = 'MAP' | 'DEFAULT' | 'OVERRIDE' | 'RULE' | 'FROZEN';

/** What a G/L head becomes in one target company (`HeadTreatment`). */
export type HeadTreatment = 'ITEM' | 'SERVICE' | 'NEVER';

export type PostingMode = 'PO_GRPO' | 'AP_DRAFT_ONLY';

export type GrpoGrouping = 'NONE' | 'GATE_NO' | 'BILL_NO';

/** `BunchSapStatus` -- the bunch's freeze, as `plan.bunch.sap_state`. */
export type BunchSapState = 'OPEN' | 'FROZEN' | 'CHANGED';

/** The sap_postings row status (`SapPostingStatus`). */
export type SapPostingStatus = 'SENDING' | 'QUEUED' | 'POSTED' | 'REJECTED' | 'CANCELLED';

/** The four sap_postings kinds this app registers (`constants.KIND_*`). */
export type CashSapKind =
  | 'cash_sap.po'
  | 'cash_sap.grpo'
  | 'cash_sap.ap_draft'
  | 'cash_sap.po_close';

/** The bunch list badge (`plan.STATE_LABELS`). */
export type BunchSummaryState =
  | 'NOT_STARTED'
  | 'NOTHING_SENT'
  | 'BUNCH_CHANGED'
  | 'NEEDS_ATTENTION'
  | 'POSTED'
  | 'SIMULATED'
  | 'IN_PROGRESS';

export interface ChoiceOption<T extends string = string> {
  value: T;
  label: string;
}

/** `GET options/` (`services.options`). */
export interface CashSapOptions {
  sap_companies: string[];
  home_company: string;
  modes: ChoiceOption<PostingMode>[];
  treatments: ChoiceOption<'ITEM' | 'SERVICE' | 'SKIP'>[];
  head_treatments: ChoiceOption<HeadTreatment>[];
  groupings: ChoiceOption<GrpoGrouping>[];
  enabled: boolean;
  simulate: boolean;
  allow_live: boolean;
  send_series: boolean;
  /** Company code -> its databases are `TEST_` ones. */
  test_targets: Record<string, boolean>;
  can_post: boolean;
  can_manage_settings: boolean;
}

/** `plan.Problem`. A non-blocking one is a warning or a note. */
export interface SapProblem {
  code: string;
  message: string;
  blocking: boolean;
}

/** One entry of `voucher_date_warnings` (`{code, field, message}`). */
export interface DateWarning {
  code: 'DATE_OLD' | 'BILL_AFTER_ENTRY' | 'BILL_OTHER_MONTH' | 'LOOKS_SWAPPED' | string;
  field: 'entry_date' | 'bill_date' | string;
  message: string;
}

/** `plan.VoucherPlan`. */
export interface VoucherSapPlan {
  entry_id: number;
  serial_number: number | null;
  entry_date: string | null;
  /** The effective bill date: the bill's own, else the voucher date. */
  bill_date: string | null;
  gate_entry_no: string;
  supplier_bill_no: string;
  branch_id: number | null;
  branch_name: string;
  gl_account_code: string;
  gl_account_name: string;
  /** The account in the target company (G/L mapped across charts). */
  account_code: string;
  item: string;
  detail: string;
  amount: string;
  sap_company_code: string;
  routing_id: number | null;
  treatment: VoucherTreatment;
  treatment_source: TreatmentSource;
  skip_reason: string;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  tax_code: string;
  ocr_code: string;
  ocr_code2: string;
  ocr_code3: string;
  ocr_code5: string;
  has_bill: boolean;
  bill_count: number;
  overridden: boolean;
  frozen: boolean;
  left_out_after_po: boolean;
  grpo_id: number | null;
  po_line_num: number | null;
  warnings: DateWarning[];
  problems: SapProblem[];
}

/** `plan._posting_dict` -- the newest sap_postings row of a unit. */
export interface SapPostingRef {
  id: number;
  status: SapPostingStatus;
  attempts: number;
  last_error: string;
}

/** `plan.UnitStatus`. */
export interface UnitStatus {
  kind: CashSapKind;
  source_id: number;
  status: SapDocStatus;
  doc_num: number | null;
  error: string;
  simulated: boolean;
  sap_posting: SapPostingRef | null;
  draft_entry: number | null;
  /** Its newest posting was cancelled while the unit was not done. */
  stopped: boolean;
  label: string;
}

/** One entry of `GroupPlan.grpos`; `id` is null in the preview before the freeze. */
export interface GrpoSapPlan {
  id: number | null;
  group_key: string;
  voucher_ids: number[];
  bill_date: string | null;
  posting_date: string | null;
  gate_entry_no: string;
  amount: string;
  num_at_card: string;
  status: SapDocStatus;
  doc_num: number | null;
  error: string;
  simulated: boolean;
  sap_posting: SapPostingRef | null;
  stopped?: boolean;
  marker?: string;
}

/** `plan._batch_dict` -- one SAP PO (bunch x SAP company). */
export interface BatchSapInfo {
  id: number;
  po_status: SapDocStatus;
  po_doc_num: number | null;
  po_doc_entry: number | null;
  po_draft_entry: number | null;
  po_error: string;
  po_round: number;
  po_close_status: SapDocStatus;
  po_close_error: string;
  simulated: boolean;
  marker: string;
  requested_by_name: string;
  requested_at: string | null;
  last_sent_by_name: string;
  last_sent_at: string | null;
}

/** `plan.GroupPlan` -- one SAP company of the bunch. */
export interface GroupSapPlan {
  sap_company_code: string;
  mode: PostingMode | '';
  vendor_code: string;
  bpl_id: number | null;
  warehouse_code: string;
  ap_drafts_enabled: boolean;
  grpo_grouping: GrpoGrouping;
  is_test_target: boolean;
  expense_month: string | null;
  po_doc_date: string | null;
  po_due_date: string | null;
  item_total: string;
  service_total: string;
  total: string;
  sendable: boolean;
  vouchers: VoucherSapPlan[];
  grpos: GrpoSapPlan[];
  problems: SapProblem[];
  notes: string[];
  batch: BatchSapInfo | null;
  po: UnitStatus | null;
  po_close: UnitStatus | null;
  ap_drafts: UnitStatus[];
  /** Already ANDed with the caller's right by the view. */
  can_post: boolean;
}

/** `drift.compare`: `{}` when nothing changed. */
export interface BunchDrift {
  added?: number[];
  removed?: number[];
  /** Entry id -> field -> [then, now]. */
  changed?: Record<string, Record<string, [unknown, unknown]>>;
}

/** `plan.bunch_status_summary` -- the bunch list's badge. */
export interface BunchSapSummary {
  bunch_id: number;
  state: BunchSummaryState;
  label: string;
  po_doc_nums: number[];
  grpo_posted: number;
  grpo_total: number;
  failed: number;
  simulated: boolean;
}

/** `plan.bunch` of `BunchPlan.as_dict()`. */
export interface BunchSapHeader {
  id: number;
  number: number;
  remarks: string;
  sent_at: string | null;
  entry_count: number;
  total: string;
  frozen_at: string | null;
  sap_state: BunchSapState;
  drift: BunchDrift;
}

/**
 * `GET bunches/<id>/` -- the whole plan. Stop, re-check, accept-changes and
 * leave-out answer with the plan too, plus their own extras.
 */
export interface BunchSapPlan {
  bunch: BunchSapHeader;
  enabled: boolean;
  simulate: boolean;
  allow_live: boolean;
  groups: GroupSapPlan[];
  unrouted: VoucherSapPlan[];
  skipped: VoucherSapPlan[];
  problems: SapProblem[];
  can_post: boolean;
  summary: BunchSapSummary;
  /** Re-check, stop and leave-out: what happened, one sentence each. */
  notes?: string[];
  /** Stop only. */
  stopped?: number;
  /** Stop only: units being sent right now, which could not be stopped. */
  sending?: string[];
}

/** `sap_postings.Outcome.kind`, lower-cased by `services.send_next`. */
export type SendOutcome = 'posted' | 'waiting' | 'rejected' | 'in_progress' | string;

/** `send_next`'s `sent`: what this one call did. */
export interface SentUnit {
  kind: CashSapKind;
  source_id: number;
  label: string;
  outcome: SendOutcome;
  message: string;
  sap_posting_id: number;
}

/** `POST post/`, `send-next/`, `close-po/`. */
export interface SendResult {
  sent: SentUnit | null;
  remaining: number;
  plan: BunchSapPlan;
}

export interface SendNextPayload {
  include_failed?: boolean;
  skip_posting_ids?: number[];
}

/**
 * `PATCH bunches/<id>/vouchers/<entry>/` (`VoucherOverrideSerializer`). Every
 * field optional; an empty string clears an override. Bill facts ride along.
 */
export interface VoucherOverridePayload {
  sap_company_code?: string;
  treatment?: '' | 'ITEM' | 'SERVICE' | 'SKIP';
  item_code?: string;
  /** Dim1. */
  ocr_code?: string;
  /** Dim3 (budget head). */
  ocr_code3?: string;
  note?: string;
  bill_date?: string | null;
  gate_entry_no?: string;
  supplier_bill_no?: string;
}

/** `GET/PATCH vouchers/<entry>/info/` (`services.voucher_info`). */
export interface VoucherSapInfo {
  entry_id: number;
  /** The bill's own date; null means "same as the voucher date". */
  bill_date: string | null;
  effective_bill_date: string | null;
  gate_entry_no: string;
  supplier_bill_no: string;
  updated_by_name: string;
  updated_at: string | null;
  warnings: DateWarning[];
}

export interface VoucherInfoPayload {
  bill_date?: string | null;
  gate_entry_no?: string;
  supplier_bill_no?: string;
}

/** `PATCH bunches/<id>/grpos/<g>/` (`GrpoRedateSerializer`). */
export interface GrpoRedatePayload {
  posting_date?: string;
  gate_entry_no?: string;
}

/** `BillSerializer` -- a posting bill added on the SAP page. */
export interface VoucherBill {
  id: number;
  entry_id: number;
  original_filename: string;
  size_bytes: number;
  url: string;
  uploaded_by_name: string;
  created_at: string;
}

/** `BranchRoutingSerializer` -- every branch, configured or not. */
export interface CashBranchRouting {
  branch_id: number;
  branch_name: string;
  branch_is_active: boolean;
  configured: boolean;
  id: number | null;
  updated_by_name: string;
  updated_at: string | null;
  enabled: boolean;
  sap_company_code: string;
  mode: PostingMode;
  vendor_code: string;
  bpl_id: number | null;
  warehouse_code: string;
  ocr_code: string;
  ocr_code3: string;
  ocr_code5: string;
  item_tax_code: string;
  service_tax_code: string;
  ap_drafts_enabled: boolean;
  grpo_needs_attachment: boolean;
  grpo_grouping: GrpoGrouping;
  po_series_hint: string;
  grpo_series_hint: string;
  ap_series_hint: string;
  cutover_date: string | null;
}

/** `BranchRoutingWriteSerializer`. */
export type RoutingPayload = Partial<
  Pick<
    CashBranchRouting,
    | 'enabled'
    | 'sap_company_code'
    | 'mode'
    | 'vendor_code'
    | 'bpl_id'
    | 'warehouse_code'
    | 'ocr_code'
    | 'ocr_code3'
    | 'ocr_code5'
    | 'item_tax_code'
    | 'service_tax_code'
    | 'ap_drafts_enabled'
    | 'grpo_needs_attachment'
    | 'grpo_grouping'
    | 'po_series_hint'
    | 'grpo_series_hint'
    | 'ap_series_hint'
    | 'cutover_date'
  >
>;

/** `GLItemMapSerializer`. */
export interface GLItemMapRow {
  id: number;
  sap_company_code: string;
  gl_account_code: string;
  gl_account_name: string;
  /** The account in `sap_company_code`'s own chart, when it is not the home company. */
  target_account_code: string;
  treatment: HeadTreatment;
  item_code: string;
  item_name: string;
  ocr_code3: string;
  needs_review: boolean;
  is_active: boolean;
  updated_by_name: string;
  updated_at: string;
}

/** `GLItemMapWriteSerializer`. */
export type GLItemMapPayload = Partial<
  Pick<
    GLItemMapRow,
    | 'sap_company_code'
    | 'gl_account_code'
    | 'gl_account_name'
    | 'target_account_code'
    | 'treatment'
    | 'item_code'
    | 'item_name'
    | 'ocr_code3'
    | 'needs_review'
  >
>;

/** POST / PATCH `gl-map/` answer: the row and anything SAP could not check. */
export interface GLItemMapSaveResult {
  row: GLItemMapRow;
  warnings: string[];
}

/** `HanaLookupReader.search_items`. */
export interface SapItem {
  item_code: string;
  item_name: string;
  uom: string;
  last_purchase_price: number;
}

/**
 * A cash book bunch as `GET /cash-book/bunches/` lists it (`CashBunch` in the
 * accounts module, re-declared to the fields this module reads).
 */
export interface CashBookBunch {
  id: number;
  number: number;
  remarks: string;
  created_at: string;
  created_by_name: string | null;
  sent_at: string | null;
  sent_by_name: string | null;
  is_sent: boolean;
  entry_count: number;
  total: string;
}
