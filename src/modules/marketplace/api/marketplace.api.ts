import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AwaitingApprovalCount,
  CancelRequest,
  ComboDefinition,
  ComboDefinitionUpsert,
  CompleteItemGroupResult,
  ConfirmRequest,
  DeliveryNoteCutResult,
  DeliveryNoteReconcileResult,
  DeliveryNoteSheet,
  DeliveryNoteSummary,
  DispatchBoard,
  DispatchBoardOrder,
  DispatchCreateRequest,
  DispatchListParams,
  DispatchSheetSummary,
  GateQueue,
  GateSheetDetail,
  ImportPreview,
  ImportSheetRequest,
  LineVariant,
  MarketplaceChannel,
  MarketplaceDispatch,
  MarketplaceIssueRequest,
  MarketplaceOrder,
  MarketplacePacking,
  MarketplaceReturn,
  MarketplaceSettings,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  MpGatePass,
  MpGatePassCreatePayload,
  MpGatePassDispatchPayload,
  MpGatePassWeighmentPayload,
  MpPaginated,
  MpReturnCondition,
  MpReturnScan,
  MpScan,
  OrderImportBatch,
  OrderListParams,
  OrderVariants,
  PackingSummary,
  PackLabelData,
  PackQueueOrder,
  PostedDeliveryNote,
  ReceiveRequest,
  ReconciliationParams,
  ReconciliationReport,
  ReportPreview,
  ResolvedOrder,
  ReturnCreateRequest,
  ReturnListParams,
  ReturnSubmitRequest,
  ReviewRequest,
  SapItem,
  SapWarehouse,
  ScanRequest,
  SendIssueRequest,
  SkipUnmappedResult,
  SkuMapping,
  SkuMappingUpsert,
  StockList,
  WarehouseInsights,
  TrackingReport,
} from '../types/marketplace.types';

const EP = API_ENDPOINTS.MARKETPLACE;

function buildQuery<T extends object>(params?: T) {
  const qp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qp.append(k, String(v));
  });
  const s = qp.toString();
  return s ? `?${s}` : '';
}

/** Report filters — shared by the on-screen preview and the CSV download. */
export type ReportParams = {
  channel: MarketplaceChannel;
  from?: string;
  to?: string;
  date_field?: string;
  status?: string;
  /** tracking report: which sheet, and which half of it. */
  batch_id?: number;
  scanned?: 'scanned' | 'not-scanned';
  /** SAP posting gap: drop anything younger than this many days. */
  min_age_days?: number;
  /** Ageing: one dispatch-by bucket. */
  bucket?: string;
  /** SKU coverage: 'yes' | 'no'. */
  mapped?: string;
  /** GST: only notes whose posted ship-to disagrees with the rule. */
  mismatch_only?: boolean;
};

export const marketplaceApi = {
  // ── Settings ───────────────────────────────────────────────────────────────
  async settings(channel: MarketplaceChannel): Promise<MarketplaceSettings> {
    const { data } = await apiClient.get<MarketplaceSettings>(
      `${EP.SETTINGS}${buildQuery({ channel })}`,
    );
    return data;
  },
  async updateSettings(
    channel: MarketplaceChannel,
    payload: Partial<Pick<MarketplaceSettings, 'skip_packing' | 'defer_delivery_note'>>,
  ): Promise<MarketplaceSettings> {
    const { data } = await apiClient.put<MarketplaceSettings>(
      `${EP.SETTINGS}${buildQuery({ channel })}`,
      payload,
    );
    return data;
  },

  // ── SAP Delivery Notes (bulk) ────────────────────────────────────────────────
  async deliveryNoteSheets(
    channel: MarketplaceChannel,
  ): Promise<{ sheets: DeliveryNoteSheet[] }> {
    const { data } = await apiClient.get<{ sheets: DeliveryNoteSheet[] }>(
      `${EP.DELIVERY_NOTE_SHEETS}${buildQuery({ channel })}`,
    );
    return data;
  },
  async deliveryNoteSummary(
    channel: MarketplaceChannel,
    warehouseId?: number | null,
    batchId?: number | null,
  ): Promise<DeliveryNoteSummary> {
    const { data } = await apiClient.get<DeliveryNoteSummary>(
      `${EP.DELIVERY_NOTE_SUMMARY}${buildQuery({
        channel,
        warehouse_id: warehouseId ?? undefined,
        batch_id: batchId ?? undefined,
      })}`,
    );
    return data;
  },
  async cutDeliveryNote(
    channel: MarketplaceChannel,
    warehouseId?: number | null,
    batchId?: number | null,
    /** SAP DocDate (YYYY-MM-DD). Omitted → today. A previous-month date back-dates
     *  the note; the server validates and permission-gates that. */
    docDate?: string | null,
  ): Promise<DeliveryNoteCutResult> {
    const { data } = await apiClient.post<DeliveryNoteCutResult>(EP.DELIVERY_NOTE_CUT, {
      channel,
      warehouse_id: warehouseId ?? undefined,
      batch_id: batchId ?? undefined,
      doc_date: docDate ?? undefined,
    });
    return data;
  },
  async reconcileDeliveryNotes(channel: MarketplaceChannel): Promise<DeliveryNoteReconcileResult> {
    const { data } = await apiClient.post<DeliveryNoteReconcileResult>(
      EP.DELIVERY_NOTE_RECONCILE, { channel },
    );
    return data;
  },
  async awaitingApprovalCount(channel: MarketplaceChannel): Promise<AwaitingApprovalCount> {
    const { data } = await apiClient.get<AwaitingApprovalCount>(
      `${EP.DELIVERY_NOTE_RECONCILE}${buildQuery({ channel })}`,
    );
    return data;
  },

  // ── Warehouses ─────────────────────────────────────────────────────────────
  async warehouses(channel?: MarketplaceChannel): Promise<MarketplaceWarehouse[]> {
    const { data } = await apiClient.get<MarketplaceWarehouse[]>(
      `${EP.WAREHOUSES}${buildQuery({ channel })}`,
    );
    return data;
  },
  async upsertWarehouse(payload: MarketplaceWarehouseUpsert): Promise<MarketplaceWarehouse> {
    if (payload.id) {
      const { data } = await apiClient.patch<MarketplaceWarehouse>(
        EP.WAREHOUSE_BY_ID(payload.id),
        payload,
      );
      return data;
    }
    const { data } = await apiClient.post<MarketplaceWarehouse>(EP.WAREHOUSES, payload);
    return data;
  },
  async deleteWarehouse(id: number): Promise<void> {
    await apiClient.delete(EP.WAREHOUSE_BY_ID(id));
  },

  // ── SKU mappings ───────────────────────────────────────────────────────────
  async skuMappings(params?: OrderListParams): Promise<SkuMapping[]> {
    const { data } = await apiClient.get<SkuMapping[]>(`${EP.SKU_MAPPINGS}${buildQuery(params)}`);
    return data;
  },
  async upsertSkuMapping(payload: SkuMappingUpsert): Promise<SkuMapping> {
    if (payload.id) {
      const { data } = await apiClient.patch<SkuMapping>(EP.SKU_MAPPING_BY_ID(payload.id), payload);
      return data;
    }
    const { data } = await apiClient.post<SkuMapping>(EP.SKU_MAPPINGS, payload);
    return data;
  },
  async deleteSkuMapping(id: number): Promise<void> {
    await apiClient.delete(EP.SKU_MAPPING_BY_ID(id));
  },
  async importSkuMappings(rows: SkuMappingUpsert[]): Promise<{
    imported: number;
    skipped: number;
    errors: unknown[];
  }> {
    const { data } = await apiClient.post(EP.SKU_MAPPINGS_IMPORT, { rows });
    return data;
  },

  // ── Combos ─────────────────────────────────────────────────────────────────
  async combos(channel?: MarketplaceChannel): Promise<ComboDefinition[]> {
    const { data } = await apiClient.get<ComboDefinition[]>(`${EP.COMBOS}${buildQuery({ channel })}`);
    return data;
  },
  async upsertCombo(payload: ComboDefinitionUpsert): Promise<ComboDefinition> {
    if (payload.id) {
      const { data } = await apiClient.patch<ComboDefinition>(EP.COMBO_BY_ID(payload.id), payload);
      return data;
    }
    const { data } = await apiClient.post<ComboDefinition>(EP.COMBOS, payload);
    return data;
  },
  async deleteCombo(id: number): Promise<void> {
    await apiClient.delete(EP.COMBO_BY_ID(id));
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  async orders(params?: OrderListParams): Promise<MarketplaceOrder[]> {
    const { data } = await apiClient.get<MarketplaceOrder[] | { results: MarketplaceOrder[] }>(
      `${EP.ORDERS}${buildQuery(params)}`,
    );
    // Endpoint returns the shared pagination envelope; unwrap to the list (tolerate
    // a bare array too, for resilience).
    return Array.isArray(data) ? data : (data.results ?? []);
  },
  async resolveOrder(channel: MarketplaceChannel, orderId: string): Promise<ResolvedOrder> {
    const { data } = await apiClient.get<ResolvedOrder>(
      `${EP.ORDER_RESOLVE}${buildQuery({ channel, order_id: orderId })}`,
    );
    return data;
  },

  // ── Dispatches ─────────────────────────────────────────────────────────────
  async dispatches(params?: DispatchListParams): Promise<MarketplaceDispatch[]> {
    const { data } = await apiClient.get<MarketplaceDispatch[] | { results: MarketplaceDispatch[] }>(
      `${EP.DISPATCHES}${buildQuery(params)}`,
    );
    // Endpoint returns the shared pagination envelope; unwrap to the list (tolerate
    // a bare array too, for resilience).
    return Array.isArray(data) ? data : (data.results ?? []);
  },
  async dispatch(id: number): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.get<MarketplaceDispatch>(EP.DISPATCH_BY_ID(id));
    return data;
  },
  async createDispatch(payload: DispatchCreateRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCHES, payload);
    return data;
  },
  async postedDeliveryNotes(channel: MarketplaceChannel): Promise<{ notes: PostedDeliveryNote[] }> {
    const { data } = await apiClient.get<{ notes: PostedDeliveryNote[] }>(
      `${EP.DELIVERY_NOTE_POSTED}${buildQuery({ channel })}`,
    );
    return data;
  },
  async exportDeliveryNoteCsv(
    docEntry: number, channel: MarketplaceChannel,
  ): Promise<{ blob: Blob; filename: string }> {
    const resp = await apiClient.get<Blob>(
      `${EP.DELIVERY_NOTE_EXPORT(docEntry)}${buildQuery({ channel })}`,
      { responseType: 'blob' },
    );
    const cd = String(resp.headers?.['content-disposition'] ?? '');
    const match = /filename="?([^";]+)"?/.exec(cd);
    return { blob: resp.data, filename: match?.[1] ?? `delivery-note-${docEntry}.csv` };
  },
  async batchVariants(batchId: number): Promise<{ orders: OrderVariants[] }> {
    const { data } = await apiClient.get<{ orders: OrderVariants[] }>(EP.BATCH_VARIANTS(batchId));
    return data;
  },
  /** Pick the SAP item for a line — or, with componentId, for one combo slot. */
  async chooseVariant(
    lineId: number,
    optionId: number | null,
    componentId?: number,
  ): Promise<LineVariant> {
    const { data } = await apiClient.post<LineVariant>(EP.ORDER_CHOOSE_VARIANT, {
      line_id: lineId,
      option_id: optionId,
      ...(componentId ? { component_id: componentId } : {}),
    });
    return data;
  },
  async dispatchSheets(channel: MarketplaceChannel): Promise<{ sheets: DispatchSheetSummary[] }> {
    const { data } = await apiClient.get<{ sheets: DispatchSheetSummary[] }>(
      `${EP.DISPATCH_SHEETS}${buildQuery({ channel })}`,
    );
    return data;
  },
  async dispatchBoard(channel: MarketplaceChannel, batchId: number): Promise<DispatchBoard> {
    const { data } = await apiClient.get<DispatchBoard>(
      `${EP.DISPATCH_BOARD(batchId)}${buildQuery({ channel })}`,
    );
    return data;
  },
  /** Orders across ALL sheets within an order-date range — for the date-range CSV export. */
  async dispatchOrdersInRange(
    channel: MarketplaceChannel,
    from?: string,
    to?: string,
  ): Promise<{ orders: DispatchBoardOrder[] }> {
    const { data } = await apiClient.get<{ orders: DispatchBoardOrder[] }>(
      `${EP.DISPATCH_ORDERS_RANGE}${buildQuery({ channel, from, to })}`,
    );
    return data;
  },
  // ── Gate check ──────────────────────────────────────────────────────────
  async gateQueue(channel: MarketplaceChannel): Promise<GateQueue> {
    const { data } = await apiClient.get<GateQueue>(`${EP.GATE_QUEUE}${buildQuery({ channel })}`);
    return data;
  },
  async gateSheetDetail(channel: MarketplaceChannel, batchId: number): Promise<GateSheetDetail> {
    const { data } = await apiClient.get<GateSheetDetail>(
      `${EP.GATE_DETAIL(batchId)}${buildQuery({ channel })}`,
    );
    return data;
  },
  async gateApprove(channel: MarketplaceChannel, batchId: number): Promise<{ approved: number }> {
    const { data } = await apiClient.post<{ approved: number }>(
      `${EP.GATE_APPROVE(batchId)}${buildQuery({ channel })}`,
      {},
    );
    return data;
  },
  async gateHold(
    channel: MarketplaceChannel,
    batchId: number,
    remarks: string,
  ): Promise<{ held: number }> {
    const { data } = await apiClient.post<{ held: number }>(
      `${EP.GATE_HOLD(batchId)}${buildQuery({ channel })}`,
      { remarks },
    );
    return data;
  },
  // ── Gate pass: the outward trip ─────────────────────────────────────────
  async gatePasses(
    channel: MarketplaceChannel,
    params: { status?: string; batch_id?: number } = {},
  ): Promise<MpGatePass[]> {
    const { data } = await apiClient.get<MpGatePass[]>(
      `${EP.GATE_PASSES}${buildQuery({ channel, ...params })}`,
    );
    return data;
  },
  async gatePassCreate(
    channel: MarketplaceChannel,
    payload: MpGatePassCreatePayload,
  ): Promise<MpGatePass> {
    const { data } = await apiClient.post<MpGatePass>(
      `${EP.GATE_PASSES}${buildQuery({ channel })}`,
      payload,
    );
    return data;
  },
  async gatePassWeigh(id: number, payload: MpGatePassWeighmentPayload): Promise<MpGatePass> {
    const { data } = await apiClient.post<MpGatePass>(EP.GATE_PASS_WEIGHMENT(id), payload);
    return data;
  },
  async gatePassPrint(id: number): Promise<MpGatePass> {
    const { data } = await apiClient.post<MpGatePass>(EP.GATE_PASS_PRINT(id), {});
    return data;
  },
  async gatePassDispatch(id: number, payload: MpGatePassDispatchPayload): Promise<MpGatePass> {
    const { data } = await apiClient.post<MpGatePass>(EP.GATE_PASS_DISPATCH(id), payload);
    return data;
  },
  async gatePassCancel(id: number, reason: string): Promise<MpGatePass> {
    const { data } = await apiClient.post<MpGatePass>(EP.GATE_PASS_CANCEL(id), { reason });
    return data;
  },
  /** Download a marketplace report as a CSV blob (Reports section). */
  /** Every Tracking ID on one sheet with its scan state, plus the sheet's totals. */
  async trackingReport(
    batchId: number,
    params: { channel: MarketplaceChannel; scanned?: 'scanned' | 'not-scanned' },
  ): Promise<TrackingReport> {
    const { data } = await apiClient.get<TrackingReport>(
      `${EP.REPORT_TRACKING(batchId)}${buildQuery({ ...params })}`,
    );
    return data;
  },

  /** On-screen preview of an insight report — columns, rows and the totals behind them. */
  async reportPreview(reportType: string, params: ReportParams): Promise<ReportPreview> {
    const { data } = await apiClient.get<ReportPreview>(
      `${EP.REPORT_PREVIEW(reportType)}${buildQuery({ ...params })}`,
    );
    return data;
  },

  async exportReport(
    reportType: string,
    params: ReportParams,
  ): Promise<{ blob: Blob; filename: string }> {
    const resp = await apiClient.get<Blob>(
      `${EP.REPORT_EXPORT(reportType)}${buildQuery({ ...params })}`,
      { responseType: 'blob' },
    );
    const disposition = (resp.headers?.['content-disposition'] as string) ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    return { blob: resp.data, filename: match?.[1] ?? `${reportType}.csv` };
  },
  async scanDispatchByTracking(
    channel: MarketplaceChannel,
    barcode: string,
  ): Promise<MarketplaceDispatch & { created: boolean; duplicate: boolean }> {
    const { data } = await apiClient.post<MarketplaceDispatch & { created: boolean; duplicate: boolean }>(
      EP.DISPATCH_SCAN_TRACKING,
      { channel, barcode },
    );
    return data;
  },
  async scanDispatch(id: number, payload: ScanRequest): Promise<MpScan> {
    const { data } = await apiClient.post<MpScan>(EP.DISPATCH_SCANS(id), payload);
    return data;
  },
  async removeScan(id: number, scanId: number): Promise<void> {
    await apiClient.delete(EP.DISPATCH_SCAN_BY_ID(id, scanId));
  },
  async confirmDispatch(id: number, payload: ConfirmRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCH_CONFIRM(id), payload);
    return data;
  },
  async retryDeliveryNote(id: number): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCH_RETRY_DN(id), {});
    return data;
  },
  async cancelDispatch(id: number, payload: CancelRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCH_CANCEL(id), payload);
    return data;
  },

  // ── Returns ────────────────────────────────────────────────────────────────
  async returns(params?: ReturnListParams): Promise<MpPaginated<MarketplaceReturn>> {
    const { data } = await apiClient.get<MpPaginated<MarketplaceReturn>>(
      `${EP.RETURNS}${buildQuery(params)}`,
    );
    return data;
  },
  async return(id: number): Promise<MarketplaceReturn> {
    const { data } = await apiClient.get<MarketplaceReturn>(EP.RETURN_BY_ID(id));
    return data;
  },
  async createReturn(payload: ReturnCreateRequest): Promise<MarketplaceReturn> {
    const { data } = await apiClient.post<MarketplaceReturn>(EP.RETURNS, payload);
    return data;
  },
  async scanReturnByTracking(
    channel: MarketplaceChannel,
    barcode: string,
  ): Promise<MarketplaceReturn & { created: boolean; duplicate: boolean }> {
    const { data } = await apiClient.post<MarketplaceReturn & { created: boolean; duplicate: boolean }>(
      EP.RETURN_SCAN_TRACKING,
      { channel, barcode },
    );
    return data;
  },
  async scanReturn(id: number, payload: ScanRequest): Promise<MpReturnScan> {
    const { data } = await apiClient.post<MpReturnScan>(EP.RETURN_SCANS(id), payload);
    return data;
  },
  async setReturnScanCondition(
    id: number,
    scanId: number,
    payload: { condition: MpReturnCondition; condition_remarks?: string },
  ): Promise<MpReturnScan> {
    const { data } = await apiClient.post<MpReturnScan>(
      EP.RETURN_SCAN_CONDITION(id, scanId),
      payload,
    );
    return data;
  },
  async submitReturn(id: number, payload: ReturnSubmitRequest): Promise<MarketplaceReturn> {
    const { data } = await apiClient.post<MarketplaceReturn>(EP.RETURN_SUBMIT(id), payload);
    return data;
  },

  // ── Reconciliation ─────────────────────────────────────────────────────────
  async reconciliation(params?: ReconciliationParams): Promise<ReconciliationReport> {
    const { data } = await apiClient.get<ReconciliationReport>(
      `${EP.RECONCILIATION}${buildQuery(params)}`,
    );
    return data;
  },

  // ── Sheet import + warehouse issue ──────────────────────────────────────────
  async importPreview(payload: ImportSheetRequest): Promise<ImportPreview> {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('channel', payload.channel);
    const { data } = await apiClient.post<ImportPreview>(
      `${EP.ORDER_IMPORT_PREVIEW}${buildQuery({ channel: payload.channel })}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
  async importOrders(payload: ImportSheetRequest): Promise<OrderImportBatch> {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('channel', payload.channel);
    if (payload.skip_duplicates) form.append('skip_duplicates', 'true');
    const { data } = await apiClient.post<OrderImportBatch>(
      `${EP.ORDER_IMPORT}${buildQuery({ channel: payload.channel })}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
  async batches(channel?: MarketplaceChannel): Promise<OrderImportBatch[]> {
    const { data } = await apiClient.get<OrderImportBatch[]>(`${EP.BATCHES}${buildQuery({ channel })}`);
    return data;
  },
  async batch(id: number): Promise<OrderImportBatch> {
    const { data } = await apiClient.get<OrderImportBatch>(EP.BATCH_BY_ID(id));
    return data;
  },
  async batchStockList(id: number): Promise<StockList> {
    const { data } = await apiClient.get<StockList>(EP.BATCH_STOCK_LIST(id));
    return data;
  },
  async skipUnmappedOrders(id: number): Promise<SkipUnmappedResult> {
    const { data } = await apiClient.post<SkipUnmappedResult>(EP.BATCH_SKIP_UNMAPPED(id), {});
    return data;
  },
  batchExportUrl(id: number): string {
    return EP.BATCH_EXPORT(id);
  },
  async exportBatchCsv(id: number): Promise<Blob> {
    const { data } = await apiClient.get(EP.BATCH_EXPORT(id), { responseType: 'blob' });
    return data as Blob;
  },
  async issueRequests(channel?: MarketplaceChannel): Promise<MarketplaceIssueRequest[]> {
    const { data } = await apiClient.get<MarketplaceIssueRequest[]>(
      `${EP.ISSUE_REQUESTS}${buildQuery({ channel })}`,
    );
    return data;
  },
  async issueRequest(id: number): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.get<MarketplaceIssueRequest>(EP.ISSUE_REQUEST_BY_ID(id));
    return data;
  },
  async sendIssueRequest(payload: SendIssueRequest): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.post<MarketplaceIssueRequest>(EP.ISSUE_REQUESTS, payload);
    return data;
  },
  async reviewIssue(id: number, payload: ReviewRequest): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.post<MarketplaceIssueRequest>(EP.ISSUE_REVIEW(id), payload);
    return data;
  },
  async rejectIssue(id: number, reason: string): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.post<MarketplaceIssueRequest>(EP.ISSUE_REJECT(id), { reason });
    return data;
  },
  async issueMaterials(id: number): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.post<MarketplaceIssueRequest>(EP.ISSUE_ISSUE(id), {});
    return data;
  },
  async receiveIssue(id: number, payload: ReceiveRequest): Promise<MarketplaceIssueRequest> {
    const { data } = await apiClient.post<MarketplaceIssueRequest>(EP.ISSUE_RECEIVE(id), payload);
    return data;
  },

  // Active warehouses straight from SAP (shared PO endpoint) — used to pick a real
  // godown code instead of typing one.
  async sapWarehouses(): Promise<SapWarehouse[]> {
    const { data } = await apiClient.get<SapWarehouse[]>(API_ENDPOINTS.PO.WAREHOUSES);
    return data;
  },

  async warehouseInsights(channel?: MarketplaceChannel): Promise<WarehouseInsights> {
    const { data } = await apiClient.get<WarehouseInsights>(
      `${EP.WAREHOUSE_INSIGHTS}${buildQuery({ channel })}`,
    );
    return data;
  },

  async sapItems(search: string): Promise<SapItem[]> {
    const { data } = await apiClient.get<SapItem[]>(`${EP.SAP_ITEMS}${buildQuery({ search })}`);
    return data;
  },

  // ── Packing ─────────────────────────────────────────────────────────────────
  async packingSummary(channel: MarketplaceChannel): Promise<PackingSummary> {
    const { data } = await apiClient.get<PackingSummary>(
      `${EP.PACKING_SUMMARY}${buildQuery({ channel })}`,
    );
    return data;
  },
  async completeItemGroup(
    channel: MarketplaceChannel,
    itemCode: string,
  ): Promise<CompleteItemGroupResult> {
    const { data } = await apiClient.post<CompleteItemGroupResult>(
      EP.PACKING_SUMMARY_COMPLETE,
      { channel, item_code: itemCode },
    );
    return data;
  },
  async packingQueue(params?: {
    channel?: MarketplaceChannel;
    page?: number;
    page_size?: number;
  }): Promise<MpPaginated<PackQueueOrder>> {
    const { data } = await apiClient.get<MpPaginated<PackQueueOrder>>(
      `${EP.PACKING_QUEUE}${buildQuery(params)}`,
    );
    return data;
  },
  async packScan(
    barcode: string, channel: MarketplaceChannel = 'FLIPKART',
  ): Promise<MarketplacePacking & { already_packed: boolean }> {
    const { data } = await apiClient.post<MarketplacePacking & { already_packed: boolean }>(
      EP.PACKING_SCAN,
      { barcode, channel },
    );
    return data;
  },
  async openPacking(orderId: string, channel: MarketplaceChannel = 'FLIPKART'): Promise<MarketplacePacking> {
    const { data } = await apiClient.post<MarketplacePacking>(
      EP.PACKING_OPEN, { order_id: orderId, channel },
    );
    return data;
  },
  async packing(id: number): Promise<MarketplacePacking> {
    const { data } = await apiClient.get<MarketplacePacking>(EP.PACKING_BY_ID(id));
    return data;
  },
  async generateBarcodes(id: number): Promise<MarketplacePacking> {
    const { data } = await apiClient.post<MarketplacePacking>(EP.PACKING_GENERATE(id), {});
    return data;
  },
  async completePacking(id: number): Promise<MarketplacePacking> {
    const { data } = await apiClient.post<MarketplacePacking>(EP.PACKING_COMPLETE(id), {});
    return data;
  },
  async printBarcode(id: number): Promise<PackLabelData> {
    const { data } = await apiClient.post<PackLabelData>(EP.PACK_BARCODE_PRINT(id), {});
    return data;
  },
};
