/**
 * The QA Procedures audit log — who changed which controlled PDF, and when.
 *
 * Mirrors `quality_control.models.qc_document_file_audit`. Reads are not
 * logged: the library exists to be read, so a row per open would bury the
 * handful of events that matter. Only UPLOADED / EDITED / RETIRED are events.
 */

export type QCDocumentFileAuditAction = 'UPLOADED' | 'EDITED' | 'RETIRED';

/** One field that moved. `old` is null on an upload — there was no before. */
export interface QCDocumentFileAuditChange {
  old: string | boolean | null;
  new: string | boolean | null;
}

export interface QCDocumentFileAuditEntry {
  id: number;
  /** Null once the underlying record has been erased outright. */
  document: number | null;
  /**
   * Code and title **as they were at the time**, not as they read today —
   * so a later rename cannot rewrite what the trail says happened.
   */
  document_code: string;
  title: string;
  document_missing: boolean;
  action: QCDocumentFileAuditAction;
  action_label: string;
  changes: Record<string, QCDocumentFileAuditChange>;
  /** The whole diff on one line, rendered by the server so CSV and UI agree. */
  changes_summary: string;
  user: number | null;
  user_name: string | null;
  user_email: string | null;
  company_name: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface QCDocumentFileAuditFilters {
  document?: number | null;
  user?: number | null;
  action?: QCDocumentFileAuditAction | '';
  /** YYYY-MM-DD, inclusive, read in factory (IST) days. */
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface QCDocumentFileAuditPage {
  results: QCDocumentFileAuditEntry[];
  count: number;
  /** Breakdown of the *filtered* set, not of the whole table. */
  action_counts: Record<QCDocumentFileAuditAction, number>;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
}

/**
 * Dropdown values, built from the rows themselves rather than the user
 * directory — so the list is exactly the people who have touched a procedure.
 */
export interface QCDocumentFileAuditFilterOptions {
  users: Array<{ id: number; name: string; email: string }>;
  documents: Array<{ id: number; document_code: string; title: string }>;
  actions: Array<{ value: QCDocumentFileAuditAction; label: string }>;
}
