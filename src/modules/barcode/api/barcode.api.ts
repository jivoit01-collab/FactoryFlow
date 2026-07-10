import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BarcodeTraceability,
  Box,
  BoxDetail,
  BoxFilters,
  BoxTransferPayload,
  BulkPrintItem,
  CreatePalletPayload,
  DismantleBoxPayload,
  DismantlePalletPayload,
  DispatchBillLookupPayload,
  DispatchBillLookupResponse,
  DispatchBoxReportRow,
  DispatchDetailReport,
  DispatchPalletReportRow,
  DispatchRejectedScanReportRow,
  DispatchReportFilters,
  DispatchSapSyncLog,
  DispatchScanLog,
  DispatchScannedBoxQtyPayload,
  DispatchScanResponse,
  DispatchScanSubmitPayload,
  DispatchSession,
  DispatchSessionCancelPayload,
  DispatchSessionCreatePayload,
  DispatchSessionFilters,
  DispatchSettings,
  DispatchSummaryReportRow,
  GenerateBoxesPayload,
  IntercompanyDashboard,
  IntercompanyReversePayload,
  IntercompanyScannedBarcode,
  IntercompanyScanPayload,
  IntercompanyTransfer,
  IntercompanyTransferPayload,
  LabelData,
  LabelPrintLog,
  ListResponse,
  LookupResponse,
  LooseStock,
  LooseStockFilters,
  OitmItemRow,
  PaginatedResponse,
  Pallet,
  PalletAddBoxesPayload,
  PalletBoxHistory,
  PalletClearPayload,
  PalletDetail,
  PalletFilters,
  PalletMovePayload,
  PalletReconcilePayload,
  PalletReconcileResult,
  PalletRemoveBoxesPayload,
  PalletSplitPayload,
  PalletVerifyRequestCancelPayload,
  PalletVerifyRequestCreatePayload,
  PalletVerifyRequestDetail,
  PalletVerifyRequestFilters,
  PalletVerifyRequestListItem,
  PalletVerifyRequestResolvePayload,
  PrintHistoryFilters,
  PrintRequestPayload,
  ProductionReleaseOilRow,
  RepackPayload,
  ScanRequestPayload,
  ScanResponse,
  VoidPayload,
} from '../types';

const EP = API_ENDPOINTS.BARCODE;

function isPaginatedResponse<T>(data: ListResponse<T>): data is PaginatedResponse<T> {
  return !Array.isArray(data) && Array.isArray(data.results);
}

function unwrapList<T>(data: ListResponse<T>): T[] {
  return isPaginatedResponse(data) ? data.results : data;
}

function normalizePage<T>(data: ListResponse<T>, params?: { page?: number; page_size?: number }) {
  if (isPaginatedResponse(data)) {
    return data;
  }

  const pageSize = params?.page_size ?? data.length;
  return {
    results: data,
    count: data.length,
    page: params?.page ?? 1,
    page_size: pageSize,
    total_pages: 1,
    next: false,
    previous: false,
  };
}

function isDispatchScanResponse(data: unknown): data is DispatchScanResponse {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<DispatchScanResponse>;
  return Boolean(candidate.scan && candidate.session);
}

export const barcodeApi = {
  // =========================================================================
  // Boxes
  // =========================================================================

  async generateBoxes(data: GenerateBoxesPayload): Promise<Box[]> {
    const res = await apiClient.post<Box[]>(EP.BOXES_GENERATE, data);
    return res.data;
  },

  async getBoxes(params?: BoxFilters): Promise<Box[]> {
    const res = await apiClient.get<ListResponse<Box>>(EP.BOXES, { params });
    return unwrapList(res.data);
  },

  async getBoxesPage(params?: BoxFilters): Promise<PaginatedResponse<Box>> {
    const res = await apiClient.get<ListResponse<Box>>(EP.BOXES, { params });
    return normalizePage(res.data, params);
  },

  async getBoxDetail(boxId: number): Promise<BoxDetail> {
    const res = await apiClient.get<BoxDetail>(EP.BOX_DETAIL(boxId));
    return res.data;
  },

  async voidBox(boxId: number, data?: VoidPayload): Promise<BoxDetail> {
    const res = await apiClient.post<BoxDetail>(EP.BOX_VOID(boxId), data || {});
    return res.data;
  },

  async getBoxHistory(boxId: number): Promise<PalletBoxHistory[]> {
    const res = await apiClient.get<ListResponse<PalletBoxHistory>>(EP.BOX_HISTORY(boxId));
    return unwrapList(res.data);
  },

  // =========================================================================
  // Pallets
  // =========================================================================

  async createPallet(data: CreatePalletPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_CREATE, data);
    return res.data;
  },

  async getPallets(params?: PalletFilters): Promise<Pallet[]> {
    const res = await apiClient.get<ListResponse<Pallet>>(EP.PALLETS, { params });
    return unwrapList(res.data);
  },

  async getPalletsPage(params?: PalletFilters): Promise<PaginatedResponse<Pallet>> {
    const res = await apiClient.get<ListResponse<Pallet>>(EP.PALLETS, { params });
    return normalizePage(res.data, params);
  },

  async getPalletDetail(palletId: number): Promise<PalletDetail> {
    const res = await apiClient.get<PalletDetail>(EP.PALLET_DETAIL(palletId));
    return res.data;
  },

  async voidPallet(palletId: number, data?: VoidPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_VOID(palletId), data || {});
    return res.data;
  },

  async deleteEmptyPallet(palletId: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(EP.PALLET_DETAIL(palletId));
    return res.data;
  },

  async getPalletHistory(palletId: number): Promise<PalletBoxHistory[]> {
    const res = await apiClient.get<ListResponse<PalletBoxHistory>>(EP.PALLET_HISTORY(palletId));
    return unwrapList(res.data);
  },

  async movePallet(palletId: number, data: PalletMovePayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_MOVE(palletId), data);
    return res.data;
  },

  async clearPallet(palletId: number, data?: PalletClearPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_CLEAR(palletId), data || {});
    return res.data;
  },

  async splitPallet(palletId: number, data: PalletSplitPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_SPLIT(palletId), data);
    return res.data;
  },

  async addBoxesToPallet(palletId: number, data: PalletAddBoxesPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_ADD_BOXES(palletId), data);
    return res.data;
  },

  async removeBoxesFromPallet(
    palletId: number,
    data: PalletRemoveBoxesPayload,
  ): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_REMOVE_BOXES(palletId), data);
    return res.data;
  },

  async transferBoxes(data: BoxTransferPayload): Promise<Box[]> {
    const res = await apiClient.post<Box[]>(EP.TRANSFER_BOX, data);
    return res.data;
  },

  async reconcilePallet(
    palletId: number,
    data: PalletReconcilePayload,
  ): Promise<PalletReconcileResult> {
    const res = await apiClient.post<PalletReconcileResult>(EP.PALLET_RECONCILE(palletId), data);
    return res.data;
  },

  // =========================================================================
  // Pallet Verify Requests
  // =========================================================================

  async getVerifyRequests(
    params?: PalletVerifyRequestFilters,
  ): Promise<PalletVerifyRequestListItem[]> {
    const res = await apiClient.get<ListResponse<PalletVerifyRequestListItem>>(EP.VERIFY_REQUESTS, {
      params,
    });
    return unwrapList(res.data);
  },

  async getVerifyRequest(requestId: number): Promise<PalletVerifyRequestDetail> {
    const res = await apiClient.get<PalletVerifyRequestDetail>(
      EP.VERIFY_REQUEST_DETAIL(requestId),
    );
    return res.data;
  },

  async createVerifyRequest(
    data: PalletVerifyRequestCreatePayload,
  ): Promise<PalletVerifyRequestDetail> {
    const res = await apiClient.post<PalletVerifyRequestDetail>(EP.VERIFY_REQUESTS, data);
    return res.data;
  },

  async startVerifyRequest(requestId: number): Promise<PalletVerifyRequestDetail> {
    const res = await apiClient.post<PalletVerifyRequestDetail>(
      EP.VERIFY_REQUEST_START(requestId),
      {},
    );
    return res.data;
  },

  async resolveVerifyRequest(
    requestId: number,
    data: PalletVerifyRequestResolvePayload,
  ): Promise<PalletVerifyRequestDetail> {
    const res = await apiClient.post<PalletVerifyRequestDetail>(
      EP.VERIFY_REQUEST_RESOLVE(requestId),
      data,
    );
    return res.data;
  },

  async cancelVerifyRequest(
    requestId: number,
    data: PalletVerifyRequestCancelPayload,
  ): Promise<PalletVerifyRequestDetail> {
    const res = await apiClient.post<PalletVerifyRequestDetail>(
      EP.VERIFY_REQUEST_CANCEL(requestId),
      data,
    );
    return res.data;
  },

  async getIntercompanyDashboard(): Promise<IntercompanyDashboard> {
    const res = await apiClient.get<IntercompanyDashboard>(EP.INTERCOMPANY_DASHBOARD);
    return res.data;
  },

  async getIntercompanyTransfers(params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<IntercompanyTransfer>> {
    const res = await apiClient.get<ListResponse<IntercompanyTransfer>>(EP.INTERCOMPANY_TRANSFERS, {
      params,
    });
    return normalizePage(res.data, params);
  },

  async getIntercompanyTransfer(transferId: number): Promise<IntercompanyTransfer> {
    const res = await apiClient.get<IntercompanyTransfer>(
      EP.INTERCOMPANY_TRANSFER_DETAIL(transferId),
    );
    return res.data;
  },

  async scanIntercompanyBarcode(
    data: IntercompanyScanPayload,
  ): Promise<IntercompanyScannedBarcode> {
    const res = await apiClient.post<IntercompanyScannedBarcode>(EP.INTERCOMPANY_SCAN, data);
    return res.data;
  },

  async createIntercompanyTransfer(
    data: IntercompanyTransferPayload,
  ): Promise<IntercompanyTransfer> {
    const res = await apiClient.post<IntercompanyTransfer>(EP.INTERCOMPANY_TRANSFERS, data);
    return res.data;
  },

  async reverseIntercompanyTransfer(
    transferId: number,
    data: IntercompanyReversePayload,
  ): Promise<IntercompanyTransfer> {
    const res = await apiClient.post<IntercompanyTransfer>(
      EP.INTERCOMPANY_TRANSFER_REVERSE(transferId),
      data,
    );
    return res.data;
  },

  async traceBarcode(search: string): Promise<BarcodeTraceability> {
    const res = await apiClient.get<BarcodeTraceability>(EP.INTERCOMPANY_TRACE, {
      params: { search },
    });
    return res.data;
  },

  // =========================================================================
  // Print / Labels
  // =========================================================================

  async printBoxLabel(boxId: number, data?: PrintRequestPayload): Promise<LabelData> {
    const res = await apiClient.post<LabelData>(EP.PRINT_BOX(boxId), data || {});
    return res.data;
  },

  async printPalletLabel(palletId: number, data?: PrintRequestPayload): Promise<LabelData> {
    const res = await apiClient.post<LabelData>(EP.PRINT_PALLET(palletId), data || {});
    return res.data;
  },

  async printBulk(items: BulkPrintItem[]): Promise<LabelData[]> {
    const res = await apiClient.post<LabelData[]>(EP.PRINT_BULK, { items });
    return res.data;
  },

  async getPrintHistory(params?: PrintHistoryFilters): Promise<LabelPrintLog[]> {
    const res = await apiClient.get<ListResponse<LabelPrintLog>>(EP.PRINT_HISTORY, { params });
    return unwrapList(res.data);
  },

  async getPrintHistoryPage(
    params?: PrintHistoryFilters,
  ): Promise<PaginatedResponse<LabelPrintLog>> {
    const res = await apiClient.get<ListResponse<LabelPrintLog>>(EP.PRINT_HISTORY, { params });
    return normalizePage(res.data, params);
  },

  async getProductionReleaseOil(params?: {
    search?: string;
    limit?: number;
  }): Promise<ProductionReleaseOilRow[]> {
    const res = await apiClient.get<ProductionReleaseOilRow[]>(EP.PRODUCTION_RELEASE_OIL, {
      params,
    });
    return res.data;
  },

  async getOitmItems(params?: { search?: string; limit?: number }): Promise<OitmItemRow[]> {
    const res = await apiClient.get<OitmItemRow[]>(EP.OITM_ITEMS, { params });
    return res.data;
  },

  // =========================================================================
  // Dismantle & Repack
  // =========================================================================

  async dismantlePallet(palletId: number, data: DismantlePalletPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.DISMANTLE_PALLET(palletId), data);
    return res.data;
  },

  async dismantleBox(boxId: number, data: DismantleBoxPayload): Promise<LooseStock> {
    const res = await apiClient.post<LooseStock>(EP.DISMANTLE_BOX(boxId), data);
    return res.data;
  },

  async repack(data: RepackPayload): Promise<BoxDetail> {
    const res = await apiClient.post<BoxDetail>(EP.REPACK, data);
    return res.data;
  },

  // =========================================================================
  // Loose Stock
  // =========================================================================

  async getLooseStock(params?: LooseStockFilters): Promise<LooseStock[]> {
    const res = await apiClient.get<ListResponse<LooseStock>>(EP.LOOSE, { params });
    return unwrapList(res.data);
  },

  async getLooseStockPage(params?: LooseStockFilters): Promise<PaginatedResponse<LooseStock>> {
    const res = await apiClient.get<ListResponse<LooseStock>>(EP.LOOSE, { params });
    return normalizePage(res.data, params);
  },

  async getLooseStockDetail(looseId: number): Promise<LooseStock> {
    const res = await apiClient.get<LooseStock>(EP.LOOSE_DETAIL(looseId));
    return res.data;
  },

  // =========================================================================
  // Scan
  // =========================================================================

  async processScan(data: ScanRequestPayload): Promise<ScanResponse> {
    const res = await apiClient.post<ScanResponse>(EP.SCAN, data);
    return res.data;
  },

  async lookupBarcode(barcode: string): Promise<LookupResponse> {
    const res = await apiClient.get<LookupResponse>(EP.LOOKUP(barcode));
    return res.data;
  },

  // =========================================================================
  // Dispatch
  // =========================================================================

  async lookupDispatchBill(data: DispatchBillLookupPayload): Promise<DispatchBillLookupResponse> {
    const res = await apiClient.post<DispatchBillLookupResponse>(EP.DISPATCH_BILL_LOOKUP, data);
    return res.data;
  },

  async createDispatchSession(data: DispatchSessionCreatePayload): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(EP.DISPATCH_SESSIONS_FROM_BILL, data);
    return res.data;
  },

  async getDispatchSessions(params?: DispatchSessionFilters): Promise<DispatchSession[]> {
    const res = await apiClient.get<ListResponse<DispatchSession>>(EP.DISPATCH_SESSIONS, {
      params,
    });
    return unwrapList(res.data);
  },

  async getDispatchSessionsPage(
    params?: DispatchSessionFilters,
  ): Promise<PaginatedResponse<DispatchSession>> {
    const res = await apiClient.get<ListResponse<DispatchSession>>(EP.DISPATCH_SESSIONS, {
      params,
    });
    return normalizePage(res.data, params);
  },

  async getDispatchSession(sessionId: number): Promise<DispatchSession> {
    const res = await apiClient.get<DispatchSession>(EP.DISPATCH_SESSION_DETAIL(sessionId));
    return res.data;
  },

  async getDispatchSettings(): Promise<DispatchSettings> {
    const res = await apiClient.get<DispatchSettings>(EP.DISPATCH_SETTINGS);
    return res.data;
  },

  async updateDispatchSettings(data: Partial<DispatchSettings>): Promise<DispatchSettings> {
    const res = await apiClient.patch<DispatchSettings>(EP.DISPATCH_SETTINGS, data);
    return res.data;
  },

  async submitDispatchScan(
    sessionId: number,
    data: DispatchScanSubmitPayload,
  ): Promise<DispatchScanResponse> {
    const res = await apiClient.post<DispatchScanResponse | unknown>(
      EP.DISPATCH_SESSION_SCANS(sessionId),
      data,
      {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 400,
      },
    );
    if (isDispatchScanResponse(res.data)) {
      return res.data;
    }
    throw new Error('Unable to submit dispatch scan.');
  },

  async updateDispatchScannedBoxQty(
    sessionId: number,
    unitId: number,
    data: DispatchScannedBoxQtyPayload,
  ): Promise<DispatchSession> {
    const res = await apiClient.patch<DispatchSession>(
      EP.DISPATCH_SCANNED_BOX(sessionId, unitId),
      data,
    );
    return res.data;
  },

  async removeDispatchScannedBox(sessionId: number, unitId: number): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(
      EP.DISPATCH_SCANNED_BOX_REMOVE(sessionId, unitId),
      {},
    );
    return res.data;
  },

  async dispatchSession(sessionId: number): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(EP.DISPATCH_SESSION_COMPLETE(sessionId), {});
    return res.data;
  },

  async closeDispatchSession(
    sessionId: number,
    data: DispatchSessionCancelPayload,
  ): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(EP.DISPATCH_SESSION_CLOSE(sessionId), data);
    return res.data;
  },

  async cancelDispatchSession(
    sessionId: number,
    data: DispatchSessionCancelPayload,
  ): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(EP.DISPATCH_SESSION_CANCEL(sessionId), data);
    return res.data;
  },

  async getDispatchScanLogs(sessionId: number): Promise<DispatchScanLog[]> {
    const res = await apiClient.get<ListResponse<DispatchScanLog>>(
      EP.DISPATCH_SESSION_SCAN_LOGS(sessionId),
    );
    return unwrapList(res.data);
  },

  async getDispatchSapSyncLogs(sessionId: number): Promise<DispatchSapSyncLog[]> {
    const res = await apiClient.get<ListResponse<DispatchSapSyncLog>>(
      EP.DISPATCH_SESSION_SAP_SYNC_LOGS(sessionId),
    );
    return unwrapList(res.data);
  },

  async retryDispatchSapSync(sessionId: number): Promise<DispatchSession> {
    const res = await apiClient.post<DispatchSession>(
      EP.DISPATCH_SESSION_RETRY_SAP_SYNC(sessionId),
      {},
    );
    return res.data;
  },

  async getDispatchReport(params?: DispatchReportFilters): Promise<DispatchSummaryReportRow[]> {
    const res = await apiClient.get<DispatchSummaryReportRow[]>(EP.DISPATCH_REPORTS, { params });
    return res.data;
  },

  async getDispatchDetailReport(sessionId: number): Promise<DispatchDetailReport> {
    const res = await apiClient.get<DispatchDetailReport>(EP.DISPATCH_REPORT_DETAIL(sessionId));
    return res.data;
  },

  async getDispatchPalletReport(
    params?: DispatchReportFilters,
  ): Promise<DispatchPalletReportRow[]> {
    const res = await apiClient.get<DispatchPalletReportRow[]>(EP.DISPATCH_REPORT_PALLETS, {
      params,
    });
    return res.data;
  },

  async getDispatchBoxReport(params?: DispatchReportFilters): Promise<DispatchBoxReportRow[]> {
    const res = await apiClient.get<DispatchBoxReportRow[]>(EP.DISPATCH_REPORT_BOXES, {
      params,
    });
    return res.data;
  },

  async getDispatchRejectedScanReport(
    params?: DispatchReportFilters,
  ): Promise<DispatchRejectedScanReportRow[]> {
    const res = await apiClient.get<DispatchRejectedScanReportRow[]>(
      EP.DISPATCH_REPORT_REJECTED_SCANS,
      { params },
    );
    return res.data;
  },
};
