import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';
import type { AttachmentLine as SapAttachmentLine, DocumentDetail } from '@/modules/sap-documents/api';

import type {
  SapActionResult,
  SapApprovalDetail,
  SapApprovalFilters,
  SapApprovalListResponse,
  SapDecisionInput,
  SapPendingCount,
} from '../types';

const E = API_ENDPOINTS.SAP_APPROVALS;

/** Query string without the filters left blank, so the server applies its defaults. */
export function listParams(filters: SapApprovalFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    params[key] = typeof value === 'string' ? value.trim() : value;
  }
  return params;
}

/**
 * The decision body. A blank SAP password is left out entirely, so the server
 * signs with the stored one; a typed one is sent exactly as typed (never
 * trimmed) and is not kept anywhere by this module after the call.
 */
export function buildDecisionPayload(input: SapDecisionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    approve: input.approve,
    remarks: input.remarks.trim(),
  };
  if (input.confirmDuplicate) payload.confirm_duplicate = true;
  if (input.sapPassword) payload.sap_password = input.sapPassword;
  return payload;
}

/** The withdraw body: empty unless a password was typed. */
export function buildWithdrawPayload(sapPassword?: string): Record<string, unknown> {
  return sapPassword ? { sap_password: sapPassword } : {};
}

export const sapApprovalsApi = {
  async list(filters: SapApprovalFilters): Promise<SapApprovalListResponse> {
    const { data } = await apiClient.get<SapApprovalListResponse>(E.REQUESTS, {
      params: listParams(filters),
    });
    return data;
  },

  async detail(wddCode: number): Promise<SapApprovalDetail> {
    const { data } = await apiClient.get<SapApprovalDetail>(E.REQUEST(wddCode));
    return data;
  },

  /**
   * Approve or reject in SAP as the caller's own SAP user. The dialog shows
   * SAP's refusal itself (a stale request, a posted duplicate, a wrong
   * password), so the global toast is suppressed.
   */
  async decide(wddCode: number, input: SapDecisionInput): Promise<SapActionResult> {
    const { data } = await apiClient.post<SapActionResult>(
      E.DECISION(wddCode),
      buildDecisionPayload(input),
      { suppressErrorToast: true },
    );
    return data;
  },

  async withdraw(wddCode: number, sapPassword?: string): Promise<SapActionResult> {
    const { data } = await apiClient.post<SapActionResult>(
      E.WITHDRAW(wddCode),
      buildWithdrawPayload(sapPassword),
      { suppressErrorToast: true },
    );
    return data;
  },

  /**
   * The request's draft as the document browser shows it — every line, TDS,
   * the journal preview, base documents — on the inbox's own right. Read only
   * when the approver asks for it.
   */
  async document(wddCode: number): Promise<SapApprovalDraftDocument> {
    const res = await apiClient.get<SapApprovalDraftDocument>(API_ENDPOINTS.SAP_APPROVALS.DOCUMENT(wddCode), {
      suppressErrorToast: true,
    });
    return res.data;
  },

  async attachmentLines(wddCode: number, absEntry: number): Promise<SapAttachmentLine[]> {
    const res = await apiClient.get<{ lines: SapAttachmentLine[] }>(
      API_ENDPOINTS.SAP_APPROVALS.ATTACHMENT_LINES(wddCode, absEntry),
      { suppressErrorToast: true },
    );
    return res.data.lines;
  },

  /** One file as a blob; the error body is a blob too (read with attachmentErrorMessage). */
  async downloadAttachment(wddCode: number, absEntry: number, line: number): Promise<Blob> {
    const res = await apiClient.get<Blob>(API_ENDPOINTS.SAP_APPROVALS.ATTACHMENT_DOWNLOAD(wddCode, absEntry, line), {
      responseType: 'blob',
      suppressErrorToast: true,
    });
    return res.data;
  },

  async pendingCount(): Promise<SapPendingCount> {
    // Background poll behind the sidebar badge, mounted on every page: a HANA
    // blip must not toast app-wide — the badge simply renders nothing.
    const { data } = await apiClient.get<SapPendingCount>(E.PENDING_COUNT, {
      suppressErrorToast: true,
    });
    return data;
  },
};

/** GET requests/<wdd>/document/. */
export interface SapApprovalDraftDocument {
  type: { key: string; label: string };
  document: DocumentDetail;
  attachment_sources: { label: string; abs_entry: number }[];
}
