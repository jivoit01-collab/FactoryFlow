/** A/P invoice drafts — a vendor's bill put into SAP against its GRPO, audited. */

export type SapDraftStatus = 'PENDING' | 'CREATED' | 'FAILED';
export type InvoiceReadStatus = 'PENDING' | 'READING' | 'READ' | 'FAILED';
/** The app's finding: OK, Not OK, a person has to look, or nothing to judge yet. */
export type CheckStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'UNKNOWN';
export type ReviewDecision = '' | 'OK' | 'NOT_OK';

/** A GRPO a bill can be entered against (open, material). */
export interface OpenGRPO {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  /** OPDN.NumAtCard — the bill number the store keyed in. */
  reference: string;
  vendor_code: string;
  vendor_name: string;
  total: string;
  comments: string;
  warehouses: string[];
  /** Open A/P drafts SAP already holds for it (usually made by hand). */
  sap_draft_entries: number[];
  /** This app's entry for it, if any — such a GRPO cannot be picked again. */
  entry_no: string;
}

/** Where a GRPO's A/P invoice stands in SAP, for the GRPO pages. */
export type GRPOAPInvoiceState = 'POSTED' | 'PARTIAL' | 'DRAFT' | 'CLOSED' | 'NONE';

export interface GRPOAPStatus {
  status: GRPOAPInvoiceState;
  /** A/P invoices SAP made from the GRPO (not cancelled). */
  invoices: { doc_entry: number; doc_num: string; doc_date: string | null }[];
  /** Open A/P drafts SAP holds for it. */
  sap_draft_entries: number[];
  /** This app's entry for it, if any. */
  entry: {
    id: number;
    entry_no: string;
    sap_status: SapDraftStatus;
    sap_draft_entry: number | null;
  } | null;
}

/** Keyed by the GRPO's SAP DocEntry; a GRPO SAP does not have is left out. */
export type GRPOAPStatusMap = Record<string, GRPOAPStatus>;

export interface APInvoiceDraftCheck {
  key: string;
  position: number;
  label: string;
  status: CheckStatus;
  detail: string;
  facts: Record<string, unknown>;
  review_decision: ReviewDecision;
  review_remark: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
  /** A person's decision when there is one, else the app's finding. */
  effective_status: CheckStatus;
}

export type CheckCounts = Record<CheckStatus, number>;

export interface APInvoiceDraftListItem {
  id: number;
  entry_no: string;
  company_code: string;
  grpo_doc_entry: number;
  grpo_doc_num: string;
  grpo_date: string | null;
  grpo_reference: string;
  vendor_code: string;
  vendor_name: string;
  grpo_total: string | null;
  sap_status: SapDraftStatus;
  sap_draft_entry: number | null;
  sap_draft_adopted: boolean;
  invoice_read_status: InvoiceReadStatus;
  check_counts: CheckCounts;
  created_by_name: string;
  created_at: string;
}

/** What OCR read off the bill (on the server). Every field may be missing. */
export interface InvoiceData {
  pages?: number;
  /** The printed text, one entry per line of the page. */
  rows?: { page: number; y: number; text: string }[];
  /** JIVO PO numbers printed anywhere on the bill. */
  po_numbers?: string[];
  /** The date handwritten in the gate's receiving stamp, as written. */
  gate_stamp_date?: string;
  /** The Rate Check line: ink left once the stamp's own rule is erased. */
  rate_check?: { found: boolean; ink?: number | null; signed?: boolean | null; text?: string };
}

export interface APInvoiceDraftDetail extends APInvoiceDraftListItem {
  invoice_file_url: string;
  invoice_filename: string;
  invoice_data: InvoiceData;
  invoice_read_error: string;
  invoice_read_model: string;
  invoice_read_at: string | null;
  sap_error: string;
  sap_attachment_entry: number | null;
  sap_attachment_error: string;
  sap_created_at: string | null;
  grpo_posting: number | null;
  gate_entry_no: string;
  checks: APInvoiceDraftCheck[];
  checks_run_at: string | null;
}

export interface CreateAPInvoiceDraftPayload {
  grpo_doc_entry: number;
  invoice_file: File;
}

export interface ReviewCheckPayload {
  decision: ReviewDecision;
  remark?: string;
}
