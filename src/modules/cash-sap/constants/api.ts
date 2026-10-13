/**
 * The cash book -> SAP endpoints, kept inside this module.
 *
 * Separate mode (FA_GRPO_SEPARATE_MODE.md §3): the shared
 * `config/constants/api.constants.ts` is not edited on this branch, so the
 * paths live here. They are relative to the shared axios client's base URL,
 * which already ends in `/api/v1`, exactly as every block of
 * `API_ENDPOINTS` is written. The backend mounts `cash_sap/urls.py` at
 * `api/v1/cash-sap/`; the names in the comments are its URL names.
 */
export const CASH_SAP_API = {
  /** GET -- lists, switches and this user's rights (`cash-sap-options`). */
  OPTIONS: '/cash-sap/options/',
  /** GET `?ids=1,2,3` (at most 200) -- one badge per bunch (`cash-sap-bunch-statuses`). */
  BUNCH_STATUSES: '/cash-sap/bunches/',
  /** GET the plan; DELETE resets it while nothing is in SAP (`cash-sap-bunch-plan`). */
  BUNCH_PLAN: (bunchId: number) => `/cash-sap/bunches/${bunchId}/`,
  /** POST `{sap_company_code?}` -- freeze, queue, send one (`cash-sap-bunch-post`). */
  BUNCH_POST: (bunchId: number) => `/cash-sap/bunches/${bunchId}/post/`,
  /** POST `{include_failed, skip_posting_ids}` -- one SAP write (`cash-sap-bunch-send-next`). */
  BUNCH_SEND_NEXT: (bunchId: number) => `/cash-sap/bunches/${bunchId}/send-next/`,
  /** POST `{reason}` (`cash-sap-bunch-stop`). */
  BUNCH_STOP: (bunchId: number) => `/cash-sap/bunches/${bunchId}/stop/`,
  /** POST -- read SAP back (`cash-sap-bunch-recheck`). */
  BUNCH_RECHECK: (bunchId: number) => `/cash-sap/bunches/${bunchId}/recheck/`,
  /** POST `{note}` -- accept what changed in the cash book (`cash-sap-bunch-accept-changes`). */
  BUNCH_ACCEPT_CHANGES: (bunchId: number) => `/cash-sap/bunches/${bunchId}/accept-changes/`,
  /** POST -- close the PO in SAP after a voucher was left out (`cash-sap-batch-close-po`). */
  BATCH_CLOSE_PO: (bunchId: number, batchId: number) =>
    `/cash-sap/bunches/${bunchId}/batches/${batchId}/close-po/`,
  /** PATCH -- how one voucher posts, and its bill facts (`cash-sap-voucher-override`). */
  VOUCHER_OVERRIDE: (bunchId: number, entryId: number) =>
    `/cash-sap/bunches/${bunchId}/vouchers/${entryId}/`,
  /** POST `{reason}` (`cash-sap-voucher-leave-out`). */
  VOUCHER_LEAVE_OUT: (bunchId: number, entryId: number) =>
    `/cash-sap/bunches/${bunchId}/vouchers/${entryId}/leave-out/`,
  /** PATCH `{posting_date?, gate_entry_no?}` (`cash-sap-grpo-redate`). */
  GRPO_REDATE: (bunchId: number, grpoId: number) => `/cash-sap/bunches/${bunchId}/grpos/${grpoId}/`,
  /** GET / PATCH the voucher's bill date, G.no. and bill no. (`cash-sap-voucher-info`). */
  VOUCHER_INFO: (entryId: number) => `/cash-sap/vouchers/${entryId}/info/`,
  /** POST multipart `file` -- a posting bill (`cash-sap-voucher-bills`). */
  VOUCHER_BILLS: (entryId: number) => `/cash-sap/vouchers/${entryId}/bills/`,
  /** DELETE a posting bill that is not in SAP yet (`cash-sap-bill-detail`). */
  BILL_DETAIL: (billId: number) => `/cash-sap/bills/${billId}/`,
  /** GET every branch with its routing (`cash-sap-routing`). */
  ROUTING: '/cash-sap/routing/',
  /** PATCH one branch's routing (`cash-sap-routing-detail`). */
  ROUTING_DETAIL: (branchId: number) => `/cash-sap/routing/${branchId}/`,
  /** GET `?sap_company_code=&include_retired=true` / POST a row (`cash-sap-gl-map`). */
  GL_MAP: '/cash-sap/gl-map/',
  /** PATCH a row; DELETE retires it (`cash-sap-gl-map-detail`). */
  GL_MAP_DETAIL: (rowId: number) => `/cash-sap/gl-map/${rowId}/`,
  /** GET `?sap_company_code=&search=` (`cash-sap-items`). */
  ITEMS: '/cash-sap/items/',
} as const;

/**
 * The cash book's own bunch endpoints, read (never written) by the Cash -> SAP
 * list. The same paths as `API_ENDPOINTS.CASH_BOOK.BUNCHES` / `BUNCH_DETAIL`;
 * repeated here so this module calls them from its own API file.
 */
export const CASH_BOOK_BUNCH_API = {
  BUNCHES: '/cash-book/bunches/',
  BUNCH_DETAIL: (bunchId: number) => `/cash-book/bunches/${bunchId}/`,
} as const;

/**
 * Post, send-next, close-po and re-check each make at most one SAP call, but
 * a Service Layer writer may wait 120-180 s; the axios default is 30 s. Same
 * figure as `grpo.api.ts` (`SAP_SERVICE_GRPO_POST_TIMEOUT_MS`).
 */
export const CASH_SAP_SEND_TIMEOUT_MS = 5 * 60 * 1000;

/** The backend refuses a status request naming more bunches (`MAX_STATUS_IDS`). */
export const MAX_STATUS_IDS = 200;

/** The plan is polled this often while anything is QUEUED or IN_APPROVAL. */
export const PLAN_POLL_MS = 15_000;
