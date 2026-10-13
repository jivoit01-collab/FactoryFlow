import { apiClient } from '@/core/api';

import { FA_GRPO_ENDPOINTS, FA_GRPO_POST_TIMEOUT_MS } from '../constants/api';
import type {
  FAAllEntry,
  FAClosureRequest,
  FAClosureResponse,
  FAEntryDetail,
  FAGRPOHistoryEntry,
  FAGRPOSummary,
  FAListParams,
  FANeedsPOEntry,
  FAOpenPOsResponse,
  FAPendingEntry,
  FAPOLinkRequest,
  FAPOLinkResponse,
  FAPOReceipt,
  FAPostRequest,
  FAPostResponse,
  GRPOPrintPayload,
  PaginatedResponse,
  PreviewPOReceipt,
} from '../types';

/**
 * Fixed Asset GRPO API: every call goes to `api/v1/fixed-asset-grpo/`, the new
 * backend app, never to grpo's own endpoints (whose rights are different and
 * whose catch-alls do not check the entry type).
 *
 * Self-contained on purpose: it imports no gate or grpo API file, so the gate
 * wizard and the material GRPO screens are untouched by this feature.
 */

// A list endpoint answers with grpo's DRF-style envelope. Tolerate a bare array
// too (as grpo.api.ts does), so the page never crashes on an unexpected shape.
function isPaginated<T>(data: unknown): data is PaginatedResponse<T> {
  return !!data && !Array.isArray(data) && Array.isArray((data as PaginatedResponse<T>).results);
}

export function normalizePage<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
  params?: { page?: number; page_size?: number },
): PaginatedResponse<T> {
  if (isPaginated<T>(data)) return data;
  const results = Array.isArray(data) ? data : [];
  return {
    results,
    count: results.length,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? results.length,
    total_pages: 1,
    next: null,
    previous: null,
  };
}

export interface FAAllEntriesResponse extends PaginatedResponse<FAAllEntry> {
  /** Per-state counts over the whole (unsearched) month, plus ALL. */
  counts: Record<string, number>;
}

export const faGrpoApi = {
  // ─── lists ───────────────────────────────────────────────────

  async getSummary(): Promise<FAGRPOSummary> {
    const response = await apiClient.get<FAGRPOSummary>(FA_GRPO_ENDPOINTS.SUMMARY);
    return response.data;
  },

  async getAllEntries(params: FAListParams = {}): Promise<FAAllEntriesResponse> {
    const response = await apiClient.get<
      FAAllEntry[] | (PaginatedResponse<FAAllEntry> & { counts?: Record<string, number> })
    >(FA_GRPO_ENDPOINTS.ALL_ENTRIES, { params });
    const page = normalizePage(response.data, params);
    const counts =
      response.data && !Array.isArray(response.data) && response.data.counts
        ? response.data.counts
        : { ALL: page.results.length };
    return { ...page, counts };
  },

  /** "Ready to post": a PO is linked and not yet posted. */
  async getPendingEntries(params: FAListParams = {}): Promise<PaginatedResponse<FAPendingEntry>> {
    const response = await apiClient.get<FAPendingEntry[] | PaginatedResponse<FAPendingEntry>>(
      FA_GRPO_ENDPOINTS.PENDING,
      { params },
    );
    return normalizePage(response.data, params);
  },

  /** Completed FA gate entries with no PO linked yet. */
  async getNeedsPO(params: FAListParams = {}): Promise<PaginatedResponse<FANeedsPOEntry>> {
    const response = await apiClient.get<FANeedsPOEntry[] | PaginatedResponse<FANeedsPOEntry>>(
      FA_GRPO_ENDPOINTS.NEEDS_PO,
      { params },
    );
    return normalizePage(response.data, params);
  },

  async getHistory(params: FAListParams = {}): Promise<PaginatedResponse<FAGRPOHistoryEntry>> {
    const response = await apiClient.get<
      FAGRPOHistoryEntry[] | PaginatedResponse<FAGRPOHistoryEntry>
    >(FA_GRPO_ENDPOINTS.HISTORY, { params });
    return normalizePage(response.data, params);
  },

  async getDetail(postingId: number): Promise<FAGRPOHistoryEntry> {
    const response = await apiClient.get<FAGRPOHistoryEntry>(
      FA_GRPO_ENDPOINTS.HISTORY_DETAIL(postingId),
    );
    return response.data;
  },

  /** SAP's own Goods Receipt Note for a posted (not simulated) FA GRPO. */
  async getPrint(postingId: number): Promise<GRPOPrintPayload> {
    const response = await apiClient.get<GRPOPrintPayload>(FA_GRPO_ENDPOINTS.PRINT(postingId));
    return response.data;
  },

  /** Delete a simulated post so the PO can be posted for real (204). */
  async discardSimulated(postingId: number): Promise<void> {
    await apiClient.post(FA_GRPO_ENDPOINTS.DISCARD_SIMULATED(postingId));
  },

  // ─── one entry ───────────────────────────────────────────────

  async getEntry(vehicleEntryId: number): Promise<FAEntryDetail> {
    const response = await apiClient.get<FAEntryDetail>(FA_GRPO_ENDPOINTS.ENTRY(vehicleEntryId));
    return response.data;
  },

  async getPOReceipts(vehicleEntryId: number): Promise<FAPOReceipt[]> {
    const response = await apiClient.get<FAPOReceipt[]>(
      FA_GRPO_ENDPOINTS.PO_RECEIPTS(vehicleEntryId),
    );
    return response.data;
  },

  /** Open SAP PO lines of the supplier in a fixed-asset warehouse. */
  async getOpenFAPOs(vehicleEntryId: number, supplierCode: string): Promise<FAOpenPOsResponse> {
    const response = await apiClient.get<FAOpenPOsResponse>(
      FA_GRPO_ENDPOINTS.OPEN_POS(vehicleEntryId),
      { params: { supplier_code: supplierCode } },
    );
    return response.data;
  },

  /** The late link: attach an open SAP PO's lines to a completed FA entry (201). */
  async linkPO(vehicleEntryId: number, data: FAPOLinkRequest): Promise<FAPOLinkResponse> {
    const response = await apiClient.post<FAPOLinkResponse>(
      FA_GRPO_ENDPOINTS.PO_RECEIPTS(vehicleEntryId),
      data,
    );
    return response.data;
  },

  /** Change the linked PO (another PO, other lines or quantities). */
  async updatePOLink(
    vehicleEntryId: number,
    poReceiptId: number,
    data: FAPOLinkRequest,
  ): Promise<FAPOLinkResponse> {
    const response = await apiClient.put<FAPOLinkResponse>(
      FA_GRPO_ENDPOINTS.PO_RECEIPT_DETAIL(vehicleEntryId, poReceiptId),
      data,
    );
    return response.data;
  },

  /** Unlink the PO (204). Unsent drafts of it are discarded by the backend. */
  async unlinkPO(vehicleEntryId: number, poReceiptId: number): Promise<void> {
    await apiClient.delete(FA_GRPO_ENDPOINTS.PO_RECEIPT_DETAIL(vehicleEntryId, poReceiptId));
  },

  /** grpo's preview of the entry, optionally narrowed to some PO receipts. */
  async getPreview(vehicleEntryId: number, poReceiptIds?: number[]): Promise<PreviewPOReceipt[]> {
    const params =
      poReceiptIds && poReceiptIds.length > 0
        ? { po_receipt_ids: poReceiptIds.join(',') }
        : undefined;
    const response = await apiClient.get<PreviewPOReceipt[]>(
      FA_GRPO_ENDPOINTS.PREVIEW(vehicleEntryId),
      params ? { params } : undefined,
    );
    return response.data;
  },

  /** "Done in SAP by hand" (201). One of `sap_doc_num` / `note` is needed. */
  async closeEntry(vehicleEntryId: number, data: FAClosureRequest): Promise<FAClosureResponse> {
    const response = await apiClient.post<FAClosureResponse>(
      FA_GRPO_ENDPOINTS.CLOSE(vehicleEntryId),
      data,
    );
    return response.data;
  },

  /** Undo "done in SAP by hand" (204). */
  async reopenEntry(vehicleEntryId: number): Promise<void> {
    await apiClient.delete(FA_GRPO_ENDPOINTS.CLOSE(vehicleEntryId));
  },

  // ─── posting ─────────────────────────────────────────────────

  /**
   * Save the GRPO and send it to SAP (or simulate it).
   *
   * Always multipart: grpo's request as JSON in a `data` part (with
   * `grpo_posting_id` when an open draft is reused) and each file as an
   * `attachments` part. No files: the backend sends the gate's invoice photo.
   *
   * - 201 posted, or simulated (`simulated: true`).
   * - 202 SAP is not answering: resolved with `queued: true`; the worker posts it.
   * - 409 `code: SAP_QUEUED` (already on its way), 400 / 502 refusals: rejected
   *   as an `ApiError`. The page reports every outcome inline, so the global
   *   error toast is suppressed.
   */
  async post(data: FAPostRequest): Promise<FAPostResponse> {
    const { attachments, ...jsonData } = data;
    const formData = new FormData();
    formData.append('data', JSON.stringify(jsonData));
    (attachments ?? []).forEach((file) => formData.append('attachments', file));

    const response = await apiClient.post<FAPostResponse>(FA_GRPO_ENDPOINTS.POST, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: FA_GRPO_POST_TIMEOUT_MS,
      suppressErrorToast: true,
    });
    const body = response.data ?? ({} as FAPostResponse);
    // A 202 is "saved, waiting for SAP" -- say so even if the body forgot to.
    return response.status === 202 ? { ...body, queued: true } : body;
  },

  /** Discard an unsent draft: DRAFT, FAILED, or a QUEUED one whose queue row was cancelled. */
  async discardDraft(postingId: number): Promise<void> {
    await apiClient.delete(FA_GRPO_ENDPOINTS.DRAFT(postingId));
  },
};
