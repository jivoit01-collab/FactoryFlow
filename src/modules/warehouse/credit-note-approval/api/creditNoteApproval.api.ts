import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ARInvoicePrintPayload } from '../../ar-invoice/types';
import type {
  CreditNoteApproval,
  CreditNoteApprovalStatus,
  CreditNoteDecisionPayload,
  CreditNoteDecisionResult,
  CreditNoteFamily,
  CreditNotePendingCount,
} from '../types';

const E = API_ENDPOINTS.WAREHOUSE;

export const creditNoteApprovalApi = {
  /**
   * `status: 'ALL'` drops the status filter; `family: 'ALL'` covers both A/R
   * and A/P. The history views ask for more rows than the live queue — pending
   * is a backlog that should stay short, approved/rejected is a log people
   * scroll back through. The server clamps at 500 either way.
   */
  async list(
    status: CreditNoteApprovalStatus | 'ALL' = 'PENDING',
    family: CreditNoteFamily | 'ALL' = 'ALL',
  ): Promise<CreditNoteApproval[]> {
    const res = await apiClient.get<CreditNoteApproval[]>(E.CREDIT_NOTE_APPROVALS, {
      params: { status, family, limit: status === 'PENDING' ? 100 : 300 },
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
