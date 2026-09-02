import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BulkScanResponse,
  CancelRequest,
  ComboDefinitionUpsert,
  ConfirmRequest,
  DispatchCreateRequest,
  DispatchListParams,
  ImportSheetRequest,
  MarketplaceChannel,
  MarketplaceWarehouseUpsert,
  MpReturnCondition,
  OrderListParams,
  ReceiveRequest,
  ReconciliationParams,
  ReturnCreateRequest,
  ReturnListParams,
  ReturnSubmitRequest,
  ReviewRequest,
  ScanRequest,
  SendIssueRequest,
  SkuMappingUpsert,
} from '../types/marketplace.types';
import { marketplaceApi, type ReportParams } from './marketplace.api';

export const MARKETPLACE_QUERY_KEYS = {
  all: ['marketplace'] as const,
  settings: (channel: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'settings', channel] as const,
  deliveryNoteSummary: (channel: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'deliveryNoteSummary', channel] as const,
  warehouses: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'warehouses', channel] as const,
  skuMappings: (params?: OrderListParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'skuMappings', params] as const,
  combos: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'combos', channel] as const,
  orders: (params?: OrderListParams) => [...MARKETPLACE_QUERY_KEYS.all, 'orders', params] as const,
  resolveOrder: (channel?: MarketplaceChannel, orderId?: string) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'resolveOrder', channel, orderId] as const,
  dispatches: (params?: DispatchListParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'dispatches', params] as const,
  dispatch: (id?: number | null) => [...MARKETPLACE_QUERY_KEYS.all, 'dispatch', id] as const,
  dispatchSheets: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'dispatchSheets', channel] as const,
  trackingReport: (channel: MarketplaceChannel, batchId?: number | null, scanned?: string) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'trackingReport', channel, batchId, scanned] as const,
  reportPreview: (slug: string, params: Record<string, unknown>) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'reportPreview', slug, params] as const,
  dispatchBoard: (channel: MarketplaceChannel, batchId?: number | null) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'dispatchBoard', channel, batchId] as const,
  returns: (params?: ReturnListParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'returns', params] as const,
  return: (id?: number | null) => [...MARKETPLACE_QUERY_KEYS.all, 'return', id] as const,
  reconciliation: (params?: ReconciliationParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'reconciliation', params] as const,
  batches: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'batches', channel] as const,
  batch: (id?: number | null) => [...MARKETPLACE_QUERY_KEYS.all, 'batch', id] as const,
  batchStockList: (id?: number | null) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'batchStockList', id] as const,
  issueRequests: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'issueRequests', channel] as const,
  issueRequest: (id?: number | null) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'issueRequest', id] as const,
  packingSummary: (channel?: MarketplaceChannel) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'packingSummary', channel] as const,
};

function invalidateMarketplace(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.all });
}

// ── Settings ───────────────────────────────────────────────────────────────
export function useMarketplaceSettings(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.settings(channel),
    queryFn: () => marketplaceApi.settings(channel),
    staleTime: 60 * 1000,
  });
}

export function useUpdateMarketplaceSettings(channel: MarketplaceChannel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { skip_packing?: boolean; defer_delivery_note?: boolean }) =>
      marketplaceApi.updateSettings(channel, payload),
    // Settings changes the Outward gate, so refresh all marketplace queries.
    onSuccess: () => invalidateMarketplace(qc),
  });
}

// ── SAP Delivery Notes (bulk) ────────────────────────────────────────────────
export function useDeliveryNoteSheets(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'deliveryNoteSheets', channel] as const,
    queryFn: () => marketplaceApi.deliveryNoteSheets(channel),
    staleTime: 15 * 1000,
  });
}

export function useDeliveryNoteSummary(
  channel: MarketplaceChannel,
  warehouseId?: number | null,
  batchId?: number | null,
) {
  return useQuery({
    queryKey: [
      ...MARKETPLACE_QUERY_KEYS.deliveryNoteSummary(channel),
      warehouseId ?? 'default',
      batchId ?? 'all',
    ] as const,
    queryFn: () => marketplaceApi.deliveryNoteSummary(channel, warehouseId, batchId),
    staleTime: 15 * 1000,
  });
}

export function useCutDeliveryNote(channel: MarketplaceChannel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: {
      warehouseId?: number | null;
      batchId?: number | null;
      docDate?: string | null;
    }) =>
      marketplaceApi.cutDeliveryNote(channel, vars?.warehouseId, vars?.batchId, vars?.docDate),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useReconcileDeliveryNotes(channel: MarketplaceChannel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.reconcileDeliveryNotes(channel),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useAwaitingApprovalCount(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'awaitingApproval', channel] as const,
    queryFn: () => marketplaceApi.awaitingApprovalCount(channel),
    staleTime: 15 * 1000,
  });
}

// ── Queries ────────────────────────────────────────────────────────────────
export function useMpWarehouses(channel?: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.warehouses(channel),
    queryFn: () => marketplaceApi.warehouses(channel),
    staleTime: 60 * 1000,
  });
}

export function useSkuMappings(params?: OrderListParams) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.skuMappings(params),
    queryFn: () => marketplaceApi.skuMappings(params),
    staleTime: 60 * 1000,
  });
}

export function useCombos(channel?: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.combos(channel),
    queryFn: () => marketplaceApi.combos(channel),
    staleTime: 60 * 1000,
  });
}

export function useMpOrders(params?: OrderListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.orders(params),
    queryFn: () => marketplaceApi.orders(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useResolveOrder(channel?: MarketplaceChannel, orderId?: string) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.resolveOrder(channel, orderId),
    queryFn: () => marketplaceApi.resolveOrder(channel!, orderId!),
    enabled: !!channel && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useMpDispatches(params?: DispatchListParams) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.dispatches(params),
    queryFn: () => marketplaceApi.dispatches(params),
    staleTime: 30 * 1000,
  });
}

export function useDispatchSheets(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.dispatchSheets(channel),
    queryFn: () => marketplaceApi.dispatchSheets(channel),
    staleTime: 20 * 1000,
  });
}

/** Delete a sheet's REMAINING work: unscanned orders/parcels leave the board and
 *  can never be scanned again. Scanned/confirmed work and the sheet itself stay —
 *  it keeps reporting total / scanned / deleted. */
export function useDeleteRemaining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteRemaining(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useTrackingReport(
  channel: MarketplaceChannel,
  batchId?: number | null,
  scanned?: 'scanned' | 'not-scanned',
) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.trackingReport(channel, batchId, scanned),
    queryFn: () => marketplaceApi.trackingReport(batchId!, { channel, scanned }),
    enabled: !!batchId,
    staleTime: 20 * 1000,
  });
}

/** Live preview of an insight report. Only the insight reports preview — the flat
 *  dump reports carry no totals and are far too wide to render. */
export function useReportPreview(slug: string, params: ReportParams, enabled = true) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.reportPreview(slug, params),
    queryFn: () => marketplaceApi.reportPreview(slug, params),
    enabled,
    staleTime: 20 * 1000,
  });
}

export function useDispatchBoard(channel: MarketplaceChannel, batchId?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.dispatchBoard(channel, batchId),
    queryFn: () => marketplaceApi.dispatchBoard(channel, batchId!),
    enabled: !!batchId,
    staleTime: 10 * 1000,
  });
}

export function useMpDispatch(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.dispatch(id),
    queryFn: () => marketplaceApi.dispatch(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useMpReturns(params?: ReturnListParams) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.returns(params),
    queryFn: () => marketplaceApi.returns(params),
    staleTime: 30 * 1000,
  });
}

export function useMpReturn(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.return(id),
    queryFn: () => marketplaceApi.return(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useReconciliation(params?: ReconciliationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.reconciliation(params),
    queryFn: () => marketplaceApi.reconciliation(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
export function useUpsertWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarketplaceWarehouseUpsert) => marketplaceApi.upsertWarehouse(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteWarehouse(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useUpsertSkuMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SkuMappingUpsert) => marketplaceApi.upsertSkuMapping(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useDeleteSkuMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteSkuMapping(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useImportSkuMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: SkuMappingUpsert[]) => marketplaceApi.importSkuMappings(rows),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useUpsertCombo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ComboDefinitionUpsert) => marketplaceApi.upsertCombo(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useDeleteCombo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteCombo(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useCreateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DispatchCreateRequest) => marketplaceApi.createDispatch(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useScanDispatch(dispatchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScanRequest) => marketplaceApi.scanDispatch(dispatchId, payload),
    // Targeted invalidation keeps the scan loop fast.
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.dispatch(dispatchId) }),
  });
}
export function useRemoveScan(dispatchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scanId: number) => marketplaceApi.removeScan(dispatchId, scanId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.dispatch(dispatchId) }),
  });
}
export function useConfirmDispatch(dispatchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfirmRequest) => marketplaceApi.confirmDispatch(dispatchId, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useRetryDeliveryNote(dispatchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.retryDeliveryNote(dispatchId),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useCancelDispatch(dispatchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CancelRequest) => marketplaceApi.cancelDispatch(dispatchId, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReturnCreateRequest) => marketplaceApi.createReturn(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
export function useScanReturn(returnId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScanRequest) => marketplaceApi.scanReturn(returnId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.return(returnId) }),
  });
}

export function useSetReturnScanCondition(returnId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      scanId: number;
      condition: MpReturnCondition;
      condition_remarks?: string;
    }) =>
      marketplaceApi.setReturnScanCondition(returnId, vars.scanId, {
        condition: vars.condition,
        condition_remarks: vars.condition_remarks,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.return(returnId) }),
  });
}
export function useSubmitReturn(returnId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReturnSubmitRequest) => marketplaceApi.submitReturn(returnId, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

// ── Sheet import + warehouse issue ───────────────────────────────────────────
export function useBatches(channel?: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.batches(channel),
    queryFn: () => marketplaceApi.batches(channel),
    staleTime: 30 * 1000,
  });
}

export function useBatch(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.batch(id),
    queryFn: () => marketplaceApi.batch(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useBatchStockList(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.batchStockList(id),
    queryFn: () => marketplaceApi.batchStockList(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useSkipUnmappedOrders(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.skipUnmappedOrders(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (payload: ImportSheetRequest) => marketplaceApi.importPreview(payload),
  });
}

export function useImportOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportSheetRequest) => marketplaceApi.importOrders(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useIssueRequests(channel?: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.issueRequests(channel),
    queryFn: () => marketplaceApi.issueRequests(channel),
    staleTime: 30 * 1000,
  });
}

export function useIssueRequest(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.issueRequest(id),
    queryFn: () => marketplaceApi.issueRequest(id!),
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

export function useSendIssueRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendIssueRequest) => marketplaceApi.sendIssueRequest(payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useReviewIssue(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => marketplaceApi.reviewIssue(id, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useRejectIssue(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => marketplaceApi.rejectIssue(id, reason),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useIssueMaterials(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.issueMaterials(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useReceiveIssue(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReceiveRequest) => marketplaceApi.receiveIssue(id, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

/** Active warehouses straight from SAP — for picking a real godown code. */
export function useSapWarehouses() {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'sapWarehouses'] as const,
    queryFn: () => marketplaceApi.sapWarehouses(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useWarehouseInsights(channel?: MarketplaceChannel) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'warehouseInsights', channel] as const,
    queryFn: () => marketplaceApi.warehouseInsights(channel),
    staleTime: 30 * 1000,
  });
}

/** Search the SAP item master (min 2 chars) for a real ItemCode. */
export function useSapItems(search: string) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'sapItems', search] as const,
    queryFn: () => marketplaceApi.sapItems(search),
    enabled: search.trim().length >= 2,
    staleTime: 60 * 1000,
    retry: false,
  });
}

// ── Packing ──────────────────────────────────────────────────────────────────
export function usePackingQueue(params?: {
  channel?: MarketplaceChannel;
  page?: number;
  pageSize?: number;
}) {
  const { channel, page = 1, pageSize = 25 } = params ?? {};
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'packingQueue', channel, page, pageSize] as const,
    queryFn: () => marketplaceApi.packingQueue({ channel, page, page_size: pageSize }),
    staleTime: 15 * 1000,
  });
}

export function usePacking(id?: number | null) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'packing', id] as const,
    queryFn: () => marketplaceApi.packing(id!),
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

export function usePackingSummary(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.packingSummary(channel),
    queryFn: () => marketplaceApi.packingSummary(channel),
    staleTime: 15 * 1000,
  });
}

export function useCompleteItemGroup(channel: MarketplaceChannel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemCode: string) => marketplaceApi.completeItemGroup(channel, itemCode),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

/** `batchId` is the sheet being worked — the scan lands on that sheet's copy of the
 *  order rather than the newest sheet that lists the same Tracking ID. */
export function useScanDispatchByTracking(
  channel: MarketplaceChannel,
  batchId?: number | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (barcode: string) =>
      marketplaceApi.scanDispatchByTracking(channel, barcode, batchId),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

/** How many tracking IDs go in one bulk-scan request. Each ID is a real scan
 *  server-side (~1s against the live DB), so keep a slice small enough that the
 *  operator sees the count move every few seconds and no single request sits
 *  anywhere near the gateway timeout. */
const BULK_SCAN_CHUNK = 25;

/** Bulk scan from an uploaded sheet — same rules as the gun, sliced so progress
 *  is visible, with the per-slice counts summed into one result. `onProgress`
 *  fires after every slice with how many IDs are done. */
export function useScanDispatchBulk(
  channel: MarketplaceChannel,
  onProgress?: (done: number, total: number) => void,
  batchId?: number | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (barcodes: string[]) => {
      const merged: BulkScanResponse = { total: 0, scanned: 0, duplicate: 0, failed: 0, results: [] };
      onProgress?.(0, barcodes.length);
      for (let i = 0; i < barcodes.length; i += BULK_SCAN_CHUNK) {
        const res = await marketplaceApi.scanDispatchBulk(
          channel, barcodes.slice(i, i + BULK_SCAN_CHUNK), batchId,
        );
        merged.total += res.total;
        merged.scanned += res.scanned;
        merged.duplicate += res.duplicate;
        merged.failed += res.failed;
        merged.results.push(...res.results);
        onProgress?.(Math.min(i + BULK_SCAN_CHUNK, barcodes.length), barcodes.length);
      }
      return merged;
    },
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function usePostedDeliveryNotes(channel: MarketplaceChannel) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'postedDeliveryNotes', channel] as const,
    queryFn: () => marketplaceApi.postedDeliveryNotes(channel),
    staleTime: 30 * 1000,
  });
}

export function useBatchVariants(batchId?: number | null) {
  return useQuery({
    queryKey: [...MARKETPLACE_QUERY_KEYS.all, 'batchVariants', batchId] as const,
    queryFn: () => marketplaceApi.batchVariants(batchId!),
    enabled: !!batchId,
    staleTime: 15 * 1000,
  });
}

export function useChooseVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, optionId, componentId }: {
      lineId: number; optionId: number | null; componentId?: number;
    }) => marketplaceApi.chooseVariant(lineId, optionId, componentId),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useScanReturnByTracking(channel: MarketplaceChannel) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (barcode: string) => marketplaceApi.scanReturnByTracking(channel, barcode),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useOpenPacking() {
  return useMutation({ mutationFn: (orderId: string) => marketplaceApi.openPacking(orderId) });
}

export function usePackScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (barcode: string) => marketplaceApi.packScan(barcode),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useGenerateBarcodes(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.generateBarcodes(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}

export function useCompletePacking(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.completePacking(id),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
