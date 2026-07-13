import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CancelRequest,
  ComboDefinition,
  ComboDefinitionUpsert,
  ConfirmRequest,
  DispatchCreateRequest,
  DispatchListParams,
  ImportOrdersRequest,
  ImportPreview,
  MarketplaceChannel,
  MarketplaceDispatch,
  MarketplaceIssueRequest,
  MarketplaceOrder,
  MarketplacePacking,
  MarketplaceReturn,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  MpPaginated,
  MpReturnScan,
  MpScan,
  OrderImportBatch,
  OrderListParams,
  PackLabelData,
  PackQueueOrder,
  ReceiveRequest,
  ReconciliationParams,
  ReconciliationReport,
  ResolvedOrder,
  ReturnCreateRequest,
  ReturnSubmitRequest,
  ReviewRequest,
  SapItem,
  SapWarehouse,
  ScanRequest,
  SendIssueRequest,
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
  async returns(params?: DispatchListParams): Promise<MarketplaceReturn[]> {
    const { data } = await apiClient.get<MarketplaceReturn[]>(`${EP.RETURNS}${buildQuery(params)}`);
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
  async scanReturn(id: number, payload: ScanRequest): Promise<MpReturnScan> {
    const { data } = await apiClient.post<MpReturnScan>(EP.RETURN_SCANS(id), payload);
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
