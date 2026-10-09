/** A/P invoice drafts — a vendor's bill put into SAP against its GRPO. */

export type SapDraftStatus = 'PENDING' | 'CREATED' | 'FAILED';

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
  created_by_name: string;
  created_at: string;
}

export interface APInvoiceDraftDetail extends APInvoiceDraftListItem {
  invoice_file_url: string;
  invoice_filename: string;
  sap_error: string;
  sap_attachment_entry: number | null;
  sap_attachment_error: string;
  sap_created_at: string | null;
}

export interface CreateAPInvoiceDraftPayload {
  grpo_doc_entry: number;
  invoice_file: File;
}
