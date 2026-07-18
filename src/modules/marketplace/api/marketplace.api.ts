import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CancelRequest,
  ComboDefinition,
  ComboDefinitionUpsert,
  CompleteItemGroupResult,
  AwaitingApprovalCount,
  ConfirmRequest,
  DeliveryNoteCutResult,
  DeliveryNoteReconcileResult,
  DeliveryNoteSummary,
  DispatchCreateRequest,
  DispatchListParams,
  ImportOrdersRequest,
  ImportPreview,
  MarketplaceChannel,
  DispatchBoard,
  DispatchSheetSummary,
  LineVariant,
  MarketplaceDispatch,
  OrderVariants,
  MarketplaceIssueRequest,
  MarketplaceOrder,
  MarketplacePacking,
  MarketplaceReturn,
  MarketplaceSettings,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  MpPaginated,
  MpReturnCondition,
  MpReturnScan,
  MpScan,
  OrderImportBatch,
  OrderListParams,
  PackLabelData,
  PackingSummary,
  PackQueueOrder,
  ReceiveRequest,
  ReconciliationParams,
  ReconciliationReport,
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
  async deliveryNoteSummary(
    channel: MarketplaceChannel,
    warehouseId?: number | null,
  ): Promise<DeliveryNoteSummary> {
    const { data } = await apiClient.get<DeliveryNoteSummary>(
      `${EP.DELIVERY_NOTE_SUMMARY}${buildQuery({ channel, warehouse_id: warehouseId ?? undefined })}`,
    );
    return data;
  },
  async cutDeliveryNote(
    channel: MarketplaceChannel,
    warehouseId?: number | null,
  ): Promise<DeliveryNoteCutResult> {
    const { data } = await apiClient.post<DeliveryNoteCutResult>(EP.DELIVERY_NOTE_CUT, {
      channel,
      warehouse_id: warehouseId ?? undefined,
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
    const { data } = await apiClient.get<MarketplaceOrder[]>(`${EP.ORDERS}${buildQuery(params)}`);
    return data;
  },
  async resolveOrder(channel: MarketplaceChannel, orderId: string): Promise<ResolvedOrder> {
    const { data } = await apiClient.get<ResolvedOrder>(
      `${EP.ORDER_RESOLVE}${buildQuery({ channel, order_id: orderId })}`,
    );
    return data;
  },

  // ── Dispatches ─────────────────────────────────────────────────────────────
  async dispatches(params?: DispatchListParams): Promise<MarketplaceDispatch[]> {
    const { data } = await apiClient.get<MarketplaceDispatch[]>(
      `${EP.DISPATCHES}${buildQuery(params)}`,
    );
    return data;
  },
  async dispatch(id: number): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.get<MarketplaceDispatch>(EP.DISPATCH_BY_ID(id));
    return data;
  },
  async createDispatch(payload: DispatchCreateRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCHES, payload);
    return data;
  },
  async batchVariants(batchId: number): Promise<{ orders: OrderVariants[] }> {
    const { data } = await apiClient.get<{ orders: OrderVariants[] }>(EP.BATCH_VARIANTS(batchId));
    return data;
  },
  async chooseVariant(lineId: number, optionId: number | null): Promise<LineVariant> {
    const { data } = await apiClient.post<LineVariant>(EP.ORDER_CHOOSE_VARIANT, {
      line_id: lineId,
      option_id: optionId,
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
  async importPreview(payload: ImportOrdersRequest): Promise<ImportPreview> {
    const { data } = await apiClient.post<ImportPreview>(EP.ORDER_IMPORT_PREVIEW, payload);
    return data;
  },
  async importOrders(payload: ImportOrdersRequest): Promise<OrderImportBatch> {
    const { data } = await apiClient.post<OrderImportBatch>(EP.ORDER_IMPORT, payload);
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
  async packScan(barcode: string): Promise<MarketplacePacking & { already_packed: boolean }> {
    const { data } = await apiClient.post<MarketplacePacking & { already_packed: boolean }>(
      EP.PACKING_SCAN,
      { barcode },
    );
    return data;
  },
  async openPacking(orderId: string): Promise<MarketplacePacking> {
    const { data } = await apiClient.post<MarketplacePacking>(EP.PACKING_OPEN, { order_id: orderId });
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
