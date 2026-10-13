/**
 * Fixed Asset GRPO endpoints, module-local on purpose.
 *
 * The backend app is `fixed_asset_grpo`, mounted at `api/v1/fixed-asset-grpo/`
 * (see `factory_app/fixed_asset_grpo/urls.py`). The shared axios client already
 * prefixes `/api/v1` and adds the `Company-Code` header, so every path here
 * starts at the app's own mount point. They live in this module rather than in
 * `config/constants/api.constants.ts` so the feature ships without editing a
 * shared file.
 *
 * | Path | Backend view | Right |
 * |---|---|---|
 * | `summary/` | FAGRPODashboardSummaryAPI | view |
 * | `all-entries/` | FAAllEntriesListAPI | view |
 * | `pending/` | FAPendingGRPOListAPI ("Ready to post") | view |
 * | `needs-po/` | FANeedsPOListAPI | view |
 * | `history/`, `history/<id>/` | FAGRPOPostingHistoryAPI, FAGRPOPostingDetailAPI | view |
 * | `history/<id>/print/` | FAGRPOPrintAPI | view |
 * | `history/<id>/discard-simulated/` | FAGRPODiscardSimulatedAPI | post |
 * | `entries/<id>/` | FAEntryDetailAPI | view |
 * | `entries/<id>/po-receipts/[<po_id>/]` | FAPOReceiptListCreateAPI, FAPOReceiptDetailAPI | view (GET) / link |
 * | `entries/<id>/open-pos/?supplier_code=` | FAOpenPOListAPI | link |
 * | `entries/<id>/preview/` | FAGRPOPreviewAPI | view |
 * | `entries/<id>/close/` | FAEntryCloseAPI (POST close, DELETE reopen) | post |
 * | `post/` | FAPostGRPOAPI | post |
 * | `drafts/<posting_id>/` | FAGRPODraftAPI (DELETE) | post |
 */

const BASE = '/fixed-asset-grpo';

export const FA_GRPO_ENDPOINTS = {
  // ── lists ──
  SUMMARY: `${BASE}/summary/`,
  ALL_ENTRIES: `${BASE}/all-entries/`,
  PENDING: `${BASE}/pending/`,
  NEEDS_PO: `${BASE}/needs-po/`,
  HISTORY: `${BASE}/history/`,
  HISTORY_DETAIL: (postingId: number) => `${BASE}/history/${postingId}/`,
  PRINT: (postingId: number) => `${BASE}/history/${postingId}/print/`,
  DISCARD_SIMULATED: (postingId: number) => `${BASE}/history/${postingId}/discard-simulated/`,

  // ── one entry ──
  ENTRY: (vehicleEntryId: number) => `${BASE}/entries/${vehicleEntryId}/`,
  PO_RECEIPTS: (vehicleEntryId: number) => `${BASE}/entries/${vehicleEntryId}/po-receipts/`,
  PO_RECEIPT_DETAIL: (vehicleEntryId: number, poReceiptId: number) =>
    `${BASE}/entries/${vehicleEntryId}/po-receipts/${poReceiptId}/`,
  OPEN_POS: (vehicleEntryId: number) => `${BASE}/entries/${vehicleEntryId}/open-pos/`,
  PREVIEW: (vehicleEntryId: number) => `${BASE}/entries/${vehicleEntryId}/preview/`,
  CLOSE: (vehicleEntryId: number) => `${BASE}/entries/${vehicleEntryId}/close/`,

  // ── posting ──
  POST: `${BASE}/post/`,
  DRAFT: (postingId: number) => `${BASE}/drafts/${postingId}/`,
} as const;

/**
 * The post makes at most one SAP document write per request, and the writer
 * waits up to 180 s, so the browser waits five minutes rather than the
 * client's 30 s default -- the same budget `grpo.api.ts` gives a service GRPO.
 */
export const FA_GRPO_POST_TIMEOUT_MS = 5 * 60 * 1000;
