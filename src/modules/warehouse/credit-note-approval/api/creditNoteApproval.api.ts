import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { DocumentDetail } from '@/modules/sap-documents/api';

import type { ARInvoicePrintPayload } from '../../ar-invoice/types';
import type {
  CreditNoteActions,
  CreditNoteApproval,
  CreditNoteApprovalStatus,
  CreditNoteAttachmentSource,
  CreditNoteDecisionPayload,
  CreditNoteDecisionResult,
  CreditNoteFamily,
  CreditNoteListFilters,
  CreditNotePendingCount,
} from '../types';

/** Rows per page. Each costs a HANA read of the draft's lines, so pages stay small. */
export const CREDIT_NOTE_PAGE_SIZE = 100;

/** Only the filters actually set, so an empty box never reaches SAP as a search. */
function filterParams(filters: CreditNoteListFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, (value ?? '').trim()])
      .filter(([, value]) => value !== ''),
  );
}

const E = API_ENDPOINTS.WAREHOUSE;

export const creditNoteApprovalApi = {
  /**
   * One page of the queue, newest first. `status: 'ALL'` drops the status
   * filter; `family: 'ALL'` covers both A/R and A/P. `filters` are searched in
   * SAP (SAP Portal's party / document / request / date filters), so a search
   * reaches the whole history, not just the rows already loaded; `offset`
   * pages on.
   */
  async list(
    status: CreditNoteApprovalStatus | 'ALL' = 'PENDING',
    family: CreditNoteFamily | 'ALL' = 'ALL',
    filters: CreditNoteListFilters = {},
    offset = 0,
  ): Promise<CreditNoteApproval[]> {
    const res = await apiClient.get<CreditNoteApproval[]>(E.CREDIT_NOTE_APPROVALS, {
      params: { status, family, limit: CREDIT_NOTE_PAGE_SIZE, offset, ...filterParams(filters) },
    });
    return res.data;
  },

  /**
   * Approve or reject in SAP. The backend re-reads the current stage and signs
   * as that authorizer, so no approver is sent from here.
   */
  async decide(
    wddCode: number,
    payload: CreditNoteDecisionPayload,
  ): Promise<CreditNoteDecisionResult> {
    const res = await apiClient.patch<CreditNoteDecisionResult>(
      E.CREDIT_NOTE_APPROVAL_STATUS(wddCode),
      payload,
    );
    return res.data;
  },

  /**
   * The printed credit note, as data for the sheet.
   *
   * `docEntry` is SAP's id for the POSTED document (`posted_doc_entry` on a
   * row), not the approval request: a request is a decision waiting to be
   * taken and has nothing to print. Read fresh from SAP on every press — the
   * document can still be edited there after it is added.
   */
  async getPrint(docEntry: number): Promise<ARInvoicePrintPayload> {
    const res = await apiClient.get<ARInvoicePrintPayload>(E.CREDIT_NOTE_PRINT(docEntry));
    return res.data;
  },

  /**
   * Withdraw and Without Qty Posting for one request (from SAP Portal's
   * credit-note screen). Read when a row is opened; a failure just hides the
   * extras, so no toast.
   */
  async actions(wddCode: number): Promise<CreditNoteActions> {
    const res = await apiClient.get<CreditNoteActions>(
      `${E.CREDIT_NOTE_APPROVALS}${wddCode}/actions/`,
      { suppressErrorToast: true },
    );
    return res.data;
  },

  /**
   * The originator withdraws their own pending request, signed as themselves —
   * with the SAP password they typed, or the stored one when none is sent.
   */
  async withdraw(wddCode: number, sapPassword?: string): Promise<CreditNoteDecisionResult> {
    const res = await apiClient.post<CreditNoteDecisionResult>(
      `${E.CREDIT_NOTE_APPROVALS}${wddCode}/withdraw/`,
      sapPassword ? { sap_password: sapPassword } : {},
    );
    return res.data;
  },

  /** The credit note in full: its draft as the document browser shapes it. */
  async document(wddCode: number): Promise<DocumentDetail> {
    const res = await apiClient.get<{ document: DocumentDetail }>(
      `${E.CREDIT_NOTE_APPROVALS}${wddCode}/document/`,
      { suppressErrorToast: true },
    );
    return res.data.document;
  },

  /** The files of this credit note and of the documents it was copied from. */
  async attachments(wddCode: number): Promise<CreditNoteAttachmentSource[]> {
    const res = await apiClient.get<{ sources: CreditNoteAttachmentSource[] }>(
      `${E.CREDIT_NOTE_APPROVALS}${wddCode}/attachments/`,
      { suppressErrorToast: true },
    );
    return res.data.sources;
  },

  /**
   * One file as a blob. Fetched through the API rather than linked to, because
   * the endpoint checks the queue's rights; the error body is a blob too, so
   * the caller reads it with `attachmentErrorMessage`.
   */
  async downloadAttachment(wddCode: number, absEntry: number, line: number): Promise<Blob> {
    const res = await apiClient.get<Blob>(
      `${E.CREDIT_NOTE_APPROVALS}${wddCode}/attachments/${absEntry}/${line}/download/`,
      { responseType: 'blob', suppressErrorToast: true },
    );
    return res.data;
  },

  async pendingCount(): Promise<CreditNotePendingCount> {
    // Background poll driving the sidebar badge — mounted on every page for
    // everyone who can view the queue. Suppress the global error toast so a
    // HANA blip doesn't spam a toast app-wide; the badge simply renders nothing.
    const res = await apiClient.get<CreditNotePendingCount>(
      E.CREDIT_NOTE_APPROVAL_PENDING_COUNT,
      { suppressErrorToast: true },
    );
    return res.data;
  },
};
