/**
 * SAP's approval queue on credit-note drafts, as the backend reads it out of
 * HANA (`sap_client/hana/credit_note_approval_reader.py`).
 */

export type CreditNoteApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A/R credits a customer; A/P debits a vendor. Different people, one queue. */
export type CreditNoteFamily = 'AR' | 'AP';

/** ODRF.DocType — 'I' item lines, 'S' service (G/L account) lines. */
export type CreditNoteLineType = 'I' | 'S';

export interface CreditNoteApprovalLine {
  line_num: number;
  /** Null on a service line — that line has an account instead. */
  item_code: string | null;
  description: string | null;
  quantity: number | null;
  warehouse: string | null;
  /** Decimal strings: money must not go through a float. */
  price: string | null;
  line_total: string | null;
  /** Service lines: the G/L account the money lands on. */
  account_code: string | null;
  account_name: string | null;
  /** On hand at this line's warehouse right now; null for a service line. */
  warehouse_stock: number | null;
  /** The document this line was copied from, if any. */
  base_ref: string | null;
  base_type_label: string | null;
}

export interface CreditNoteApproval {
  /** OWDD.WddCode — the id the decision endpoint acts on. */
  id: number;
  /** '14' A/R credit note, '19' A/P credit note. */
  obj_type: string;
  doc_type_label: string;
  family: CreditNoteFamily;
  line_type: CreditNoteLineType;
  line_type_label: string;
  /** False for a service credit note: it is money only, no goods move. */
  moves_stock: boolean;
  /** 'IN' (customer returning) or 'OUT' (going back to a vendor); null if none. */
  stock_direction: 'IN' | 'OUT' | null;
  draft_entry: number;
  /**
   * The DRAFT's number — provisional. Open drafts share it and the add takes
   * whatever the series is on then, so it is frequently not the number the
   * document keeps. Never offer it as something to search for;
   * `posted_doc_num` is the real one.
   */
  doc_num: number | null;
  posted_doc_entry: number | null;
  /** The number SAP actually gave the document; null while nothing was added. */
  posted_doc_num: number | null;
  card_code: string;
  party_name: string;
  /** Decimal strings straight from HANA. */
  total_amount: string | null;
  tax_amount: string | null;
  currency: string | null;
  branch: string | null;
  doc_date: string | null;
  comments: string | null;
  /** The party's own reference on the document (ODRF.NumAtCard). */
  reference: string | null;
  /** What it was raised against, e.g. "A/R Invoice 626040363". */
  base_documents: string[];
  warehouses: string[];
  status: CreditNoteApprovalStatus;
  rejection_reason: string | null;
  current_step: number | null;
  /** The single SAP user this request is waiting on. */
  approver_code: string | null;
  approver_name: string | null;
  /** Who signed the decision in SAP, and when — null while still pending. */
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  /** Whether we hold that user's SAP password. */
  credentials_configured: boolean;
  /** The caller's own mapped SAP account IS this request's authorizer. */
  is_mine: boolean;
  /** mine + password configured + still pending + caller may approve. */
  can_decide: boolean;
  lines: CreditNoteApprovalLine[];
  created_at: string | null;
  created_by: string | null;
}

export interface CreditNoteDecisionPayload {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
}

export interface CreditNoteDecisionResult {
  message: string;
  /** The SAP user the decision was signed as. */
  signed_as: string;
}

export interface CreditNotePendingCount {
  total: number;
}
