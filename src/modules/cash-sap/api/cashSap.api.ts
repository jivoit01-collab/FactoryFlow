import { apiClient } from '@/core/api';

import {
  CASH_BOOK_BUNCH_API,
  CASH_SAP_API,
  CASH_SAP_SEND_TIMEOUT_MS,
  MAX_STATUS_IDS,
} from '../constants/api';
import type {
  BunchSapPlan,
  BunchSapSummary,
  CashBookBunch,
  CashBranchRouting,
  CashSapOptions,
  GLItemMapPayload,
  GLItemMapRow,
  GLItemMapSaveResult,
  GrpoRedatePayload,
  RoutingPayload,
  SapItem,
  SendNextPayload,
  SendResult,
  VoucherBill,
  VoucherInfoPayload,
  VoucherOverridePayload,
  VoucherSapInfo,
} from '../types';

/**
 * Every write here passes `suppressErrorToast`: the pages say what went wrong
 * in their own words (and show `BUNCH_CHANGED` as a panel, not a toast), so
 * the client's global error toast would only repeat the server's sentence on
 * top. Reads keep the global toast, except the bunch list, its badges and
 * the plan: the plan is polled every 15 s while anything waits, and both pages
 * say themselves when they cannot be read.
 *
 * The four calls that may reach SAP -- post, send-next, close-po and re-check
 * -- carry the five-minute timeout. Each makes at most one SAP call, but a
 * Service Layer writer can wait two to three minutes, and the axios default
 * is 30 s.
 */
const QUIET = { suppressErrorToast: true } as const;
const SEND = { timeout: CASH_SAP_SEND_TIMEOUT_MS, suppressErrorToast: true } as const;

export const cashSapApi = {
  async options(): Promise<CashSapOptions> {
    const { data } = await apiClient.get<CashSapOptions>(CASH_SAP_API.OPTIONS);
    return data;
  },

  /**
   * The cash book's bunches (read only; the cash book owns them). Needs a
   * cash book view / manage / approve right (`CanViewCashBook`), which a
   * cash_sap right alone does not give: the list page says so itself, so the
   * global toast is off.
   */
  async bunches(state?: 'SENT' | 'UNSENT'): Promise<CashBookBunch[]> {
    const { data } = await apiClient.get<CashBookBunch[]>(CASH_BOOK_BUNCH_API.BUNCHES, {
      params: state ? { state } : {},
      suppressErrorToast: true,
    });
    return data;
  },

  /**
   * One badge per bunch. The backend takes at most 200 ids, so a longer list
   * is asked for in slices and joined back together.
   */
  async bunchStatuses(ids: number[]): Promise<BunchSapSummary[]> {
    if (ids.length === 0) return [];
    const slices: number[][] = [];
    for (let i = 0; i < ids.length; i += MAX_STATUS_IDS) {
      slices.push(ids.slice(i, i + MAX_STATUS_IDS));
    }
    const answers = await Promise.all(
      slices.map((slice) =>
        apiClient.get<{ results: BunchSapSummary[] }>(CASH_SAP_API.BUNCH_STATUSES, {
          params: { ids: slice.join(',') },
          suppressErrorToast: true,
        }),
      ),
    );
    return answers.flatMap(({ data }) => data.results ?? []);
  },

  async plan(bunchId: number): Promise<BunchSapPlan> {
    const { data } = await apiClient.get<BunchSapPlan>(CASH_SAP_API.BUNCH_PLAN(bunchId), QUIET);
    return data;
  },

  /** Freeze the bunch (or one SAP company of it), queue its documents and send one. */
  async post(bunchId: number, sapCompanyCode?: string): Promise<SendResult> {
    const { data } = await apiClient.post<SendResult>(
      CASH_SAP_API.BUNCH_POST(bunchId),
      sapCompanyCode ? { sap_company_code: sapCompanyCode } : {},
      SEND,
    );
    return data;
  },

  /** Send the next document: at most one SAP write. */
  async sendNext(bunchId: number, payload: SendNextPayload = {}): Promise<SendResult> {
    const { data } = await apiClient.post<SendResult>(
      CASH_SAP_API.BUNCH_SEND_NEXT(bunchId),
      {
        include_failed: payload.include_failed ?? false,
        skip_posting_ids: payload.skip_posting_ids ?? [],
      },
      SEND,
    );
    return data;
  },

  async stop(bunchId: number, reason: string): Promise<BunchSapPlan> {
    const { data } = await apiClient.post<BunchSapPlan>(
      CASH_SAP_API.BUNCH_STOP(bunchId),
      { reason },
      QUIET,
    );
    return data;
  },

  /** Read SAP back. Reads only, but HANA can be slow: the long timeout. */
  async recheck(bunchId: number): Promise<BunchSapPlan> {
    const { data } = await apiClient.post<BunchSapPlan>(
      CASH_SAP_API.BUNCH_RECHECK(bunchId),
      {},
      SEND,
    );
    return data;
  },

  async acceptChanges(bunchId: number, note: string): Promise<BunchSapPlan> {
    const { data } = await apiClient.post<BunchSapPlan>(
      CASH_SAP_API.BUNCH_ACCEPT_CHANGES(bunchId),
      { note },
      QUIET,
    );
    return data;
  },

  /** Close the PO in SAP once a voucher was left out and the rest are in. */
  async closePO(bunchId: number, batchId: number): Promise<SendResult> {
    const { data } = await apiClient.post<SendResult>(
      CASH_SAP_API.BATCH_CLOSE_PO(bunchId, batchId),
      {},
      SEND,
    );
    return data;
  },

  /** Throw the bunch's SAP plan away -- only while nothing is in SAP. */
  async reset(bunchId: number): Promise<BunchSapPlan> {
    const { data } = await apiClient.delete<BunchSapPlan>(CASH_SAP_API.BUNCH_PLAN(bunchId), QUIET);
    return data;
  },

  async overrideVoucher(
    bunchId: number,
    entryId: number,
    payload: VoucherOverridePayload,
  ): Promise<BunchSapPlan> {
    const { data } = await apiClient.patch<BunchSapPlan>(
      CASH_SAP_API.VOUCHER_OVERRIDE(bunchId, entryId),
      payload,
      QUIET,
    );
    return data;
  },

  async leaveOut(bunchId: number, entryId: number, reason: string): Promise<BunchSapPlan> {
    const { data } = await apiClient.post<BunchSapPlan>(
      CASH_SAP_API.VOUCHER_LEAVE_OUT(bunchId, entryId),
      { reason },
      QUIET,
    );
    return data;
  },

  async redateGrpo(
    bunchId: number,
    grpoId: number,
    payload: GrpoRedatePayload,
  ): Promise<BunchSapPlan> {
    const { data } = await apiClient.patch<BunchSapPlan>(
      CASH_SAP_API.GRPO_REDATE(bunchId, grpoId),
      payload,
      QUIET,
    );
    return data;
  },

  async voucherInfo(entryId: number): Promise<VoucherSapInfo> {
    const { data } = await apiClient.get<VoucherSapInfo>(CASH_SAP_API.VOUCHER_INFO(entryId));
    return data;
  },

  async updateVoucherInfo(entryId: number, payload: VoucherInfoPayload): Promise<VoucherSapInfo> {
    const { data } = await apiClient.patch<VoucherSapInfo>(
      CASH_SAP_API.VOUCHER_INFO(entryId),
      payload,
      QUIET,
    );
    return data;
  },

  /** A posting bill: a photo added here because an APPROVED voucher is locked in the cash book. */
  async attachBill(entryId: number, file: File): Promise<VoucherBill> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<VoucherBill>(CASH_SAP_API.VOUCHER_BILLS(entryId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      suppressErrorToast: true,
    });
    return data;
  },

  async removeBill(billId: number): Promise<void> {
    await apiClient.delete(CASH_SAP_API.BILL_DETAIL(billId), QUIET);
  },

  async routing(): Promise<CashBranchRouting[]> {
    const { data } = await apiClient.get<CashBranchRouting[]>(CASH_SAP_API.ROUTING);
    return data;
  },

  async saveRouting(branchId: number, payload: RoutingPayload): Promise<CashBranchRouting> {
    const { data } = await apiClient.patch<CashBranchRouting>(
      CASH_SAP_API.ROUTING_DETAIL(branchId),
      payload,
      QUIET,
    );
    return data;
  },

  async glMap(
    params: { sapCompanyCode?: string; includeRetired?: boolean } = {},
  ): Promise<GLItemMapRow[]> {
    const query: Record<string, string> = {};
    if (params.sapCompanyCode) query.sap_company_code = params.sapCompanyCode;
    if (params.includeRetired) query.include_retired = 'true';
    const { data } = await apiClient.get<GLItemMapRow[]>(CASH_SAP_API.GL_MAP, { params: query });
    return data;
  },

  async createGlMapRow(payload: GLItemMapPayload): Promise<GLItemMapSaveResult> {
    const { data } = await apiClient.post<GLItemMapSaveResult>(CASH_SAP_API.GL_MAP, payload, QUIET);
    return data;
  },

  async updateGlMapRow(rowId: number, payload: GLItemMapPayload): Promise<GLItemMapSaveResult> {
    const { data } = await apiClient.patch<GLItemMapSaveResult>(
      CASH_SAP_API.GL_MAP_DETAIL(rowId),
      payload,
      QUIET,
    );
    return data;
  },

  /** DELETE retires the row; the answer is the retired row. */
  async retireGlMapRow(rowId: number): Promise<GLItemMapRow> {
    const { data } = await apiClient.delete<GLItemMapRow>(CASH_SAP_API.GL_MAP_DETAIL(rowId), QUIET);
    return data;
  },

  /** SAP items whose code or name holds `search` (two characters minimum, server side). */
  async items(sapCompanyCode: string, search: string): Promise<SapItem[]> {
    const { data } = await apiClient.get<{ results: SapItem[] }>(CASH_SAP_API.ITEMS, {
      params: { sap_company_code: sapCompanyCode, search },
    });
    return data.results ?? [];
  },
};
