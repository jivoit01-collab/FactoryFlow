import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ---------------------------------------------------------------------------
// Shapes, as `factory_app/sap_documents/services.py` sends them.
// ---------------------------------------------------------------------------

export type DocumentKind = 'marketing' | 'draft' | 'transfer' | 'journal' | 'payment' | 'payment_draft';
export type DocumentStatus = 'open' | 'closed' | 'cancelled' | '';

export interface DocumentTypeInfo {
  key: string;
  label: string;
  group: string;
  kind: DocumentKind;
  object_type: string;
  filters: {
    number: string;
    partner: boolean;
    statuses: { value: string; label: string }[];
  };
}

export interface DocumentFilters {
  number?: string;
  partner?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  top?: number;
  skip?: number;
}

/** One list row; which fields are filled depends on the kind. */
export interface DocumentRow {
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  due_date: string | null;
  status: DocumentStatus;
  attachment_entry: number | null;
  card_code?: string;
  card_name?: string;
  comments?: string;
  total?: number | null;
  total_note?: string;
  currency?: string;
  object_label?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  memo?: string;
  reference?: string;
  approval_status?: string;
}

export interface DocumentPage {
  type: string;
  label: string;
  kind: DocumentKind;
  results: DocumentRow[];
  top: number;
  skip: number;
  has_more: boolean;
}

export interface JournalLine {
  line_id: number | null;
  account: string;
  account_name: string;
  short_name: string;
  debit: number;
  credit: number;
  contra_account: string;
  line_memo: string;
  cost_centers: string[];
}

export interface JournalEntry {
  trans_id: number | null;
  number: number | null;
  /** A reconstruction — SAP has posted nothing yet. */
  preview: boolean;
  ref_date: string | null;
  due_date: string | null;
  tax_date: string | null;
  memo: string;
  base_ref: string;
  trans_type: string;
  trans_type_label: string;
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
}

export interface DocumentLine {
  line_num: number | null;
  item_code: string;
  description: string;
  quantity: number | null;
  uom: string;
  unit_price: number | null;
  line_total: number | null;
  tax_code: string;
  tax_percent: number | null;
  tax_amount: number | null;
  warehouse_code: string;
  warehouse_name: string;
  from_warehouse_code: string;
  from_warehouse_name: string;
  account_code: string;
  account_name: string;
  sac_code: string;
  sac_name: string;
  location_code: string;
  location_name: string;
  dimensions: { code: string; name: string }[];
  project: string;
  base_type: string;
  base_label: string;
  base_entry: number | null;
  base_ref: string;
  received_qty: number | null;
  dispatched_qty: number | null;
  litres: number | null;
  bilty_no: string;
  ar_no: string;
  sub_account: string;
  udf_card_code: string;
  purpose: string;
  remarks: string;
}

/** Header facts. Journal, payment and document kinds fill different ones. */
export interface DocumentHeader {
  doc_entry?: number | null;
  doc_num?: number | null;
  doc_date?: string | null;
  due_date?: string | null;
  tax_date?: string | null;
  num_at_card?: string;
  card_code?: string;
  card_name?: string;
  party_role?: 'vendor' | 'customer';
  party_gstin?: string;
  party_pan?: string;
  party_state?: string;
  branch_gstin?: string;
  sales_person?: string;
  payment_terms?: string;
  shipping_type?: string;
  branch_id?: number | null;
  branch_name?: string;
  control_account?: string;
  ship_to_code?: string;
  pay_to_code?: string;
  reference?: string;
  reference2?: string;
  reference3?: string;
  period?: string;
  created_on?: string | null;
  created_time?: string;
  currency?: string;
  status?: DocumentStatus;
  subtype?: string;
  draft_key?: number | null;
  object_label?: string;
  comments?: string;
  journal_memo?: string;
  bill_to?: string;
  ship_to?: string;
  original_ref_no?: string;
  original_ref_date?: string | null;
  from_warehouse?: string;
  from_warehouse_name?: string;
  to_warehouse?: string;
  to_warehouse_name?: string;
  memo?: string;
  reversal_date?: string | null;
  transaction_code?: string;
  project?: string;
  approval_status?: string;
  series?: number | null;
}

export interface DocumentTotals {
  currency?: string;
  net?: number | null;
  discount?: number | null;
  tax?: number | null;
  withholding?: number | null;
  down_payment?: number | null;
  rounding?: number | null;
  total?: number | null;
  paid_to_date?: number | null;
  balance_due?: number | null;
  gross_profit?: number | null;
}

export interface TdsRow {
  code: string;
  name: string;
  section: string;
  rate: number | null;
  amount: number | null;
  taxable: number | null;
}

export interface ShipFrom {
  code: string;
  name: string;
  gstin: string;
  branch: string;
  state: string;
  address: string;
}

export interface BaseDocument {
  base_type: string;
  base_entry: number;
  type_label: string;
  doc_num: number | null;
  doc_date: string | null;
  base_ref: string | null;
  attachment_entry: number | null;
}

export interface PostedAs {
  object_type: string;
  type_label: string;
  doc_entry: number | null;
  doc_num: number | null;
  trans_id: number | null;
}

export interface PaymentDetail {
  cash_account: string;
  cash_sum: number | null;
  check_account: string;
  check_sum: number | null;
  credit_sum: number | null;
  transfer_account: string;
  transfer_sum: number | null;
  transfer_date: string | null;
  transfer_reference: string;
  counter_reference: string;
  on_account_sum: number | null;
  wt_account: string;
  wt_amount: number | null;
  wt_rate: number | null;
  payment_mode: string;
  accounts: {
    account_code: string;
    account_name: string;
    description: string;
    sum_paid: number | null;
    gross_amount: number | null;
    tax_code: string;
    cost_centers: string[];
  }[];
  invoices: {
    doc_entry: number | null;
    doc_num: number | null;
    doc_date: string | null;
    invoice_type: string;
    sum_applied: number | null;
    doc_total: number | null;
  }[];
  checks: { check_number: string; bank_code: string; due_date: string | null; check_sum: number | null }[];
}

export interface DocumentDetail {
  type: string;
  label: string;
  kind: DocumentKind;
  header: DocumentHeader;
  totals: DocumentTotals;
  lines: DocumentLine[];
  tds: TdsRow[];
  tds_section: string;
  ship_from: ShipFrom[] | null;
  base_documents: BaseDocument[];
  attachment_entry: number | null;
  journal_entry: JournalEntry | null;
  in_transit_journal_entries: JournalEntry[];
  journal_preview: JournalEntry | null;
  posted_as: PostedAs | null;
  payment: PaymentDetail | null;
  warnings: string[];
}

export interface AttachmentLine {
  line: number;
  file_name: string;
  stem: string;
  extension: string;
  attached_on: string | null;
}

function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Partial<T>;
}

export const sapDocumentsApi = {
  types: async (): Promise<DocumentTypeInfo[]> => {
    const { data } = await apiClient.get<DocumentTypeInfo[]>(API_ENDPOINTS.SAP_DOCUMENTS.TYPES);
    return data;
  },

  list: async (type: string, filters: DocumentFilters): Promise<DocumentPage> => {
    const { data } = await apiClient.get<DocumentPage>(API_ENDPOINTS.SAP_DOCUMENTS.LIST(type), {
      params: compact(filters),
    });
    return data;
  },

  detail: async (type: string, docEntry: number): Promise<DocumentDetail> => {
    const { data } = await apiClient.get<DocumentDetail>(API_ENDPOINTS.SAP_DOCUMENTS.DETAIL(type, docEntry));
    return data;
  },

  paymentDraft: async (docEntry: number): Promise<DocumentDetail> => {
    const { data } = await apiClient.get<DocumentDetail>(API_ENDPOINTS.SAP_DOCUMENTS.PAYMENT_DRAFT(docEntry));
    return data;
  },

  attachments: async (absEntry: number): Promise<AttachmentLine[]> => {
    const { data } = await apiClient.get<{ abs_entry: number; lines: AttachmentLine[] }>(
      API_ENDPOINTS.SAP_DOCUMENTS.ATTACHMENTS(absEntry),
    );
    return data.lines;
  },

  /**
   * One attachment file as a blob.
   *
   * Fetched through the API rather than linked to: the endpoint checks both
   * rights, so the request has to carry the auth header. The global toast is
   * suppressed because a blob error body cannot be read there; the caller
   * reads it with `attachmentErrorMessage`.
   */
  downloadAttachment: async (absEntry: number, line: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(API_ENDPOINTS.SAP_DOCUMENTS.ATTACHMENT_DOWNLOAD(absEntry, line), {
      responseType: 'blob',
      suppressErrorToast: true,
    });
    return data;
  },
};

function blobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** The server's `detail` from a failed blob request, or a plain fallback. */
export async function attachmentErrorMessage(error: unknown): Promise<string> {
  const fallback = 'The attachment could not be opened.';
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await blobText(data)) as { detail?: unknown };
      if (typeof parsed.detail === 'string' && parsed.detail) return parsed.detail;
    } catch {
      return fallback;
    }
  }
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : fallback;
}
