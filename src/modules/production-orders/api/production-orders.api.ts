import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ---------------------------------------------------------------------------
// Shapes, as `factory_app/production_orders/views.py` sends them. Quantities
// come as decimal strings (SAP keeps six places); dates as YYYY-MM-DD.
// ---------------------------------------------------------------------------

export type EntryStatus = 'DRAFT' | 'PLANNED' | 'RELEASED' | 'ISSUED' | 'RECEIVED' | 'CLOSED';
export type StepKey = 'PLAN' | 'RELEASE' | 'ISSUE' | 'RECEIPT' | 'CLOSE';
export type PostingStatus = 'SENDING' | 'QUEUED' | 'POSTED' | 'REJECTED' | 'CANCELLED';
export type PostOutcome = 'POSTED' | 'WAITING' | 'REJECTED' | 'IN_PROGRESS';

/** The steps in the order SAP takes them. */
export const STEPS: readonly StepKey[] = ['PLAN', 'RELEASE', 'ISSUE', 'RECEIPT', 'CLOSE'];

export interface SapLogin {
  sap_user_code: string;
  ready: boolean;
  message: string;
}

export interface ProductionOrdersMe {
  supported: boolean;
  rights: Record<StepKey, boolean>;
  can_view: boolean;
  sap_login: SapLogin;
  line_codes: { code: string; label: string }[];
}

export interface ProductOption {
  item_code: string;
  item_name: string;
  uom: string;
  pieces_per_box: string;
  variety: string;
  warehouse: string;
}

export interface Variety {
  code: string;
  name: string;
}

export interface StockCap {
  key: string;
  label: string;
  litres: string;
  limit: string;
  on_order: boolean;
  on_receipt: boolean;
  over: boolean;
}

export interface BatchPick {
  batch_number: string;
  quantity: string;
}

// --- Plan -------------------------------------------------------------------

export interface PlanInput {
  item_code: string;
  boxes: number;
  loose_pieces: number;
  posting_date?: string;
  remarks?: string;
}

export interface PlanPreview {
  item_code: string;
  item_name: string;
  uom: string;
  pieces_per_box: string;
  litres_per_piece: string | null;
  boxes: number;
  loose_pieces: number;
  quantity: string;
  litres: string | null;
  warehouse: string;
  bom_quantity: string;
  variety: string;
  posting_date: string;
  remarks: string;
  line_count: number;
  caps: StockCap[];
  series: string;
  warnings: string[];
}

// --- Issue ------------------------------------------------------------------

export interface IssueLine {
  id: number;
  position: number;
  item_code: string;
  item_name: string;
  item_type: 'item' | 'resource';
  base_quantity: string;
  planned_quantity: string;
  warehouse: string;
  uom: string;
  batch_managed: boolean;
  on_hand: string | null;
  short: string | null;
  batches: BatchPick[];
  batches_chosen: boolean;
  available: {
    batch_number: string;
    quantity: string;
    released: boolean;
    in_date: string | null;
  }[];
}

export interface IssuePreview {
  issue_date: string;
  variety: string;
  series: string;
  lines: IssueLine[];
  warnings: string[];
}

export interface IssueInput {
  issue_date?: string;
  variety?: string;
  lines?: { line_id: number; batches: BatchPick[] }[];
}

// --- Receipt ----------------------------------------------------------------

export interface ReceiptInput {
  receipt_date?: string | null;
  line_code?: string;
  oil_code?: string;
  mfg_date?: string | null;
  batch_sequence?: number | null;
  expiry_date?: string | null;
}

export interface ReceiptPreview {
  receipt_date: string;
  line_code: string;
  oil_code: string;
  mfg_date: string | null;
  batch_sequence: number | null;
  batch_number: string;
  expiry_date: string | null;
  quantity: string;
  warehouse: string;
  variety: string;
  series: string;
  caps: StockCap[];
  warnings: string[];
  complete: boolean;
}

// --- Close ------------------------------------------------------------------

export interface CloseInput {
  close_date?: string;
}

export type StepInput = PlanInput | IssueInput | ReceiptInput | CloseInput | Record<string, never>;

// --- Entries ----------------------------------------------------------------

export interface EntryRow {
  id: number;
  entry_no: string;
  kind: string;
  status: EntryStatus;
  status_label: string;
  next_step: StepKey | null;
  item_code: string;
  item_name: string;
  boxes: number;
  loose_pieces: number;
  quantity: string;
  pieces_per_box: string;
  uom: string;
  warehouse: string;
  batch_number: string;
  posting_date: string;
  sap_order_num: number | null;
  sap_issue_num: number | null;
  sap_receipt_num: number | null;
  created_at: string;
  created_by_name: string;
}

export interface EntryLine {
  id: number;
  position: number;
  item_code: string;
  item_name: string;
  item_type: 'item' | 'resource';
  issue_method: 'M' | 'B';
  base_quantity: string;
  planned_quantity: string;
  warehouse: string;
  uom: string;
  batch_managed: boolean;
  sap_line_num: number | null;
  batches: BatchPick[];
}

export interface EntryStepPosting {
  id: number;
  status: PostingStatus;
  status_label: string;
  attempts: number;
  last_error: string;
  updated_at: string;
}

export interface EntryStep {
  step: StepKey;
  label: string;
  done: boolean;
  is_next: boolean;
  by: string;
  at: string | null;
  sap_doc_num: number | null;
  can_take: boolean;
  posting: EntryStepPosting | null;
}

export interface EntryDetail extends EntryRow {
  litres_per_piece: string | null;
  bom_quantity: string;
  remarks: string;
  variety: string;
  issue_date: string | null;
  receipt_date: string | null;
  line_code: string;
  line_label: string;
  oil_code: string;
  batch_sequence: number | null;
  mfg_date: string | null;
  expiry_date: string | null;
  close_date: string | null;
  sap_order_entry: number | null;
  sap_issue_entry: number | null;
  sap_receipt_entry: number | null;
  lines: EntryLine[];
  steps: EntryStep[];
  /** The latest posting of each change to the order in SAP. */
  changes: { replan: EntryStepPosting | null; unrelease: EntryStepPosting | null };
  updated_at: string;
}

export interface EntryFilters {
  status?: EntryStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EntryList {
  count: number;
  status_counts: Partial<Record<EntryStatus, number>>;
  results: EntryRow[];
}

/** ``OWOR.Status``: planned, released, closed, cancelled. */
export type SapOrderStatus = 'P' | 'R' | 'L' | 'C';
/** ``OWOR.Type``: standard, special, disassembly. */
export type SapOrderType = 'S' | 'P' | 'D';

export interface SapOrderFilters {
  status?: SapOrderStatus;
  type?: SapOrderType;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/** A production order as SAP has it, whoever made it. */
export interface SapOrderRow {
  doc_entry: number;
  doc_num: number;
  type: SapOrderType;
  type_label: string;
  status: SapOrderStatus;
  status_label: string;
  item_code: string;
  item_name: string;
  planned_quantity: string;
  completed_quantity: string;
  uom: string;
  warehouse: string;
  posting_date: string | null;
  close_date: string | null;
  /** SAP user who saved it (``OWOR.UserSign``). */
  created_by: string;
  sap_user: string;
  /** Issued so far, of the components' planned quantity. */
  issued_quantity: string;
  issued_of: string;
  /** The entry here that made it; null for an order made in SAP. */
  entry: { id: number; entry_no: string } | null;
}

export interface SapOrderList {
  count: number;
  status_counts: Partial<Record<SapOrderStatus, number>>;
  results: SapOrderRow[];
}

export interface PostResult {
  /** A step, or a change: REPLAN (a planned order changed), UNRELEASE (back to planned). */
  step: StepKey | 'REPLAN' | 'UNRELEASE';
  outcome: PostOutcome;
  message: string;
  posting_id?: number;
}

/** A step saved (and posted, when asked): the entry as it now stands, and how SAP took it. */
export interface StepResponse {
  entry: EntryDetail;
  result: PostResult | null;
}

const E = API_ENDPOINTS.PRODUCTION_ORDERS;

// Writes report their own errors (with the server's words), not the client's toast.
const QUIET = { suppressErrorToast: true } as const;

export const productionOrdersApi = {
  me: async (): Promise<ProductionOrdersMe> => (await apiClient.get(E.ME)).data,

  // The picker and the variety list show their own failure; SAP being down is
  // already on the banner, so no toast on top.
  products: async (search: string): Promise<ProductOption[]> =>
    (await apiClient.get(E.PRODUCTS, { params: { search }, ...QUIET })).data,

  varieties: async (): Promise<Variety[]> => (await apiClient.get(E.VARIETIES, QUIET)).data,

  planPreview: async (input: PlanInput): Promise<PlanPreview> =>
    (await apiClient.post(E.PLAN_PREVIEW, input, QUIET)).data,

  entries: async (filters: EntryFilters): Promise<EntryList> =>
    (await apiClient.get(E.ENTRIES, { params: filters })).data,

  entry: async (id: number): Promise<EntryDetail> => (await apiClient.get(E.ENTRY(id))).data,

  sapOrders: async (filters: SapOrderFilters): Promise<SapOrderList> =>
    (await apiClient.get(E.SAP_ORDERS, { params: filters })).data,

  create: async (input: PlanInput, post: boolean): Promise<StepResponse> =>
    (await apiClient.post(E.ENTRIES, { ...input, post }, QUIET)).data,

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(E.ENTRY(id), QUIET);
  },

  /** What a step's page shows, read from SAP now. */
  stepPreview: async <T>(id: number, step: StepKey): Promise<T> =>
    (await apiClient.get(E.ENTRY_STEP(id, step), QUIET)).data,

  saveStep: async (
    id: number,
    step: StepKey,
    input: StepInput,
    post: boolean,
  ): Promise<StepResponse> =>
    (await apiClient.put(E.ENTRY_STEP(id, step), { ...input, post }, QUIET)).data,

  /** Take a released order (nothing issued) back to planned in SAP. */
  unrelease: async (id: number): Promise<StepResponse> =>
    (await apiClient.post(E.ENTRY_UNRELEASE(id), {}, QUIET)).data,

  receiptPreview: async (id: number, input: ReceiptInput): Promise<ReceiptPreview> =>
    (await apiClient.post(E.RECEIPT_PREVIEW(id), input, QUIET)).data,
};
