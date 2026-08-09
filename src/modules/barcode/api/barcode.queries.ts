import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ActivityFilters,
  BoxFilters,
  BoxTransferPayload,
  BulkPrintItem,
  CreatePalletPayload,
  DismantleBoxPayload,
  DismantlePalletPayload,
  DispatchBillLookupPayload,
  DispatchReportFilters,
  DispatchScanSubmitPayload,
  DispatchSessionCancelPayload,
  DispatchSessionCreatePayload,
  DispatchSessionFilters,
  DispatchSettings,
  GenerateBoxesPayload,
  IntercompanyReversePayload,
  IntercompanyScanPayload,
  IntercompanyTransferPayload,
  LooseStockFilters,
  OitmItemRow,
  PalletAddBoxesPayload,
  PalletClearPayload,
  PalletFilters,
  PalletMovePayload,
  PalletReconcilePayload,
  PalletRemoveBoxesPayload,
  PalletSplitPayload,
  PalletVerifyRequestCancelPayload,
  PalletVerifyRequestCreatePayload,
  PalletVerifyRequestFilters,
  PalletVerifyRequestResolvePayload,
  PalletVoidPayload,
  PrintHistoryFilters,
  PrintRequestPayload,
  ProductionReleaseOilRow,
  RepackPayload,
  ScanRequestPayload,
  VoidedFilters,
  VoidPayload,
} from '../types';
import { barcodeApi } from './barcode.api';

interface BarcodeQueryOptions {
  enabled?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const BARCODE_QUERY_KEYS = {
  all: ['barcode'] as const,
  boxes: (filters?: BoxFilters) => [...BARCODE_QUERY_KEYS.all, 'boxes', filters] as const,
  boxesPage: (filters?: BoxFilters) => [...BARCODE_QUERY_KEYS.all, 'boxes-page', filters] as const,
  boxDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'box', id] as const,
  pallets: (filters?: PalletFilters) => [...BARCODE_QUERY_KEYS.all, 'pallets', filters] as const,
  palletsPage: (filters?: PalletFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'pallets-page', filters] as const,
  palletDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'pallet', id] as const,
  voidedPallets: (filters?: VoidedFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'voided-pallets', filters] as const,
  voidedBoxes: (filters?: VoidedFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'voided-boxes', filters] as const,
  printHistory: (filters?: PrintHistoryFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'print-history', filters] as const,
  printHistoryPage: (filters?: PrintHistoryFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'print-history-page', filters] as const,
  productionReleaseOil: (search?: string) =>
    [...BARCODE_QUERY_KEYS.all, 'production-release-oil', search] as const,
  oitmItems: (search?: string) => [...BARCODE_QUERY_KEYS.all, 'oitm-items', search] as const,
  looseStock: (filters?: LooseStockFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'loose', filters] as const,
  looseStockPage: (filters?: LooseStockFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'loose-page', filters] as const,
  looseStockDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'loose', id] as const,
  looseStockSummary: (search?: string) =>
    [...BARCODE_QUERY_KEYS.all, 'loose-summary', search] as const,
  boxHistory: (id: number) => [...BARCODE_QUERY_KEYS.all, 'box', id, 'history'] as const,
  palletHistory: (id: number) => [...BARCODE_QUERY_KEYS.all, 'pallet', id, 'history'] as const,
  dispatchSessions: (filters?: DispatchSessionFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-sessions', filters] as const,
  dispatchSession: (id: number) => [...BARCODE_QUERY_KEYS.all, 'dispatch-session', id] as const,
  dispatchScanLogs: (id: number) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-session', id, 'scan-logs'] as const,
  dispatchSapSyncLogs: (id: number) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-session', id, 'sap-sync-logs'] as const,
  dispatchSettings: () => [...BARCODE_QUERY_KEYS.all, 'dispatch-settings'] as const,
  dispatchReport: (filters?: DispatchReportFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-report', filters] as const,
  dispatchDetailReport: (id: number) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-report-detail', id] as const,
  dispatchPalletReport: (filters?: DispatchReportFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-pallet-report', filters] as const,
  dispatchBoxReport: (filters?: DispatchReportFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-box-report', filters] as const,
  dispatchRejectedScanReport: (filters?: DispatchReportFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'dispatch-rejected-scan-report', filters] as const,
  intercompanyDashboard: () => [...BARCODE_QUERY_KEYS.all, 'intercompany-dashboard'] as const,
  intercompanyTransfers: (filters?: { search?: string; page?: number; page_size?: number }) =>
    [...BARCODE_QUERY_KEYS.all, 'intercompany-transfers', filters] as const,
  intercompanyTransfer: (id: number) =>
    [...BARCODE_QUERY_KEYS.all, 'intercompany-transfer', id] as const,
  intercompanyWarehouses: (companyCode: string) =>
    [...BARCODE_QUERY_KEYS.all, 'intercompany-warehouses', companyCode] as const,
  barcodeTrace: (search: string) => [...BARCODE_QUERY_KEYS.all, 'barcode-trace', search] as const,
  verifyRequests: (filters?: PalletVerifyRequestFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'verify-requests', filters] as const,
  verifyRequest: (id: number) => [...BARCODE_QUERY_KEYS.all, 'verify-request', id] as const,
  recentActivity: (limit: number) =>
    [...BARCODE_QUERY_KEYS.all, 'recent-activity', limit] as const,
  activityPage: (filters?: ActivityFilters) =>
    [...BARCODE_QUERY_KEYS.all, 'activity-page', filters] as const,
};

// ============================================================================
// Box Queries
// ============================================================================

export function useBoxes(filters?: BoxFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxes(filters),
    queryFn: () => barcodeApi.getBoxes(filters),
  });
}

export function useBoxesPage(filters?: BoxFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxesPage(filters),
    queryFn: () => barcodeApi.getBoxesPage(filters),
  });
}

export function useBoxDetail(boxId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxDetail(boxId!),
    queryFn: () => barcodeApi.getBoxDetail(boxId!),
    enabled: boxId !== null,
  });
}

export function useBoxHistory(boxId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxHistory(boxId!),
    queryFn: () => barcodeApi.getBoxHistory(boxId!),
    enabled: boxId !== null,
  });
}

// ============================================================================
// Box Mutations
// ============================================================================

export function useGenerateBoxes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateBoxesPayload) => barcodeApi.generateBoxes(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useVoidBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data?: VoidPayload }) =>
      barcodeApi.voidBox(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Pallet Queries
// ============================================================================

export function usePallets(filters?: PalletFilters, options?: BarcodeQueryOptions) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.pallets(filters),
    queryFn: () => barcodeApi.getPallets(filters),
    enabled: options?.enabled ?? true,
  });
}

export function usePalletsPage(filters?: PalletFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.palletsPage(filters),
    queryFn: () => barcodeApi.getPalletsPage(filters),
  });
}

export function usePalletDetail(palletId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.palletDetail(palletId!),
    queryFn: () => barcodeApi.getPalletDetail(palletId!),
    enabled: palletId !== null,
  });
}

export function usePalletHistory(palletId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.palletHistory(palletId!),
    queryFn: () => barcodeApi.getPalletHistory(palletId!),
    enabled: palletId !== null,
  });
}

// ============================================================================
// Pallet Mutations
// ============================================================================

export function useCreatePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePalletPayload) => barcodeApi.createPallet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useVoidPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: PalletVoidPayload }) =>
      barcodeApi.voidPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useVoidedPallets(filters?: VoidedFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.voidedPallets(filters),
    queryFn: () => barcodeApi.getVoidedPallets(filters),
  });
}

export function useVoidedBoxes(filters?: VoidedFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.voidedBoxes(filters),
    queryFn: () => barcodeApi.getVoidedBoxes(filters),
  });
}

export function useDeleteEmptyPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (palletId: number) => barcodeApi.deleteEmptyPallet(palletId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useMovePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletMovePayload }) =>
      barcodeApi.movePallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useClearPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: PalletClearPayload }) =>
      barcodeApi.clearPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useSplitPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletSplitPayload }) =>
      barcodeApi.splitPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useAddBoxesToPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletAddBoxesPayload }) =>
      barcodeApi.addBoxesToPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useRemoveBoxesFromPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletRemoveBoxesPayload }) =>
      barcodeApi.removeBoxesFromPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useTransferBoxes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BoxTransferPayload) => barcodeApi.transferBoxes(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// Read-only reconciliation — no cache invalidation (does not mutate stock).
// Used for the live scan loop, which fires on every scan.
export function useReconcilePallet() {
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletReconcilePayload }) =>
      barcodeApi.reconcilePallet(palletId, data),
  });
}

// Applying a reconcile moves stock — invalidate so pallet/box views refresh.
export function useApplyPalletReconcile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletReconcilePayload }) =>
      barcodeApi.reconcilePallet(palletId, { ...data, apply: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Pallet Verify Requests (ticket workflow)
// ============================================================================

export function useVerifyRequests(filters?: PalletVerifyRequestFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.verifyRequests(filters),
    queryFn: () => barcodeApi.getVerifyRequests(filters),
  });
}

export function useVerifyRequest(requestId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.verifyRequest(requestId!),
    queryFn: () => barcodeApi.getVerifyRequest(requestId!),
    enabled: requestId !== null,
  });
}

export function useCreateVerifyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PalletVerifyRequestCreatePayload) => barcodeApi.createVerifyRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useStartVerifyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => barcodeApi.startVerifyRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useResolveVerifyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: PalletVerifyRequestResolvePayload;
    }) => barcodeApi.resolveVerifyRequest(requestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useCancelVerifyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: PalletVerifyRequestCancelPayload;
    }) => barcodeApi.cancelVerifyRequest(requestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Intercompany Transfer Queries & Mutations
// ============================================================================

export function useIntercompanyDashboard() {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.intercompanyDashboard(),
    queryFn: () => barcodeApi.getIntercompanyDashboard(),
  });
}

export function useIntercompanyTransfers(filters?: {
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.intercompanyTransfers(filters),
    queryFn: () => barcodeApi.getIntercompanyTransfers(filters),
  });
}

export function useIntercompanyTransfer(transferId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.intercompanyTransfer(transferId!),
    queryFn: () => barcodeApi.getIntercompanyTransfer(transferId!),
    enabled: transferId !== null,
  });
}

export function useIntercompanyWarehouses(companyCode: string, enabled = true) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.intercompanyWarehouses(companyCode),
    queryFn: () => barcodeApi.getIntercompanyWarehouses(companyCode),
    enabled: Boolean(companyCode) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScanIntercompanyBarcode() {
  return useMutation({
    mutationFn: (data: IntercompanyScanPayload) => barcodeApi.scanIntercompanyBarcode(data),
  });
}

export function useCreateIntercompanyTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IntercompanyTransferPayload) => barcodeApi.createIntercompanyTransfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useReverseIntercompanyTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, data }: { transferId: number; data: IntercompanyReversePayload }) =>
      barcodeApi.reverseIntercompanyTransfer(transferId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useBarcodeTrace(search: string, enabled = false) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.barcodeTrace(search),
    queryFn: () => barcodeApi.traceBarcode(search),
    enabled: enabled && search.trim().length > 0,
  });
}

// ============================================================================
// Print Queries & Mutations
// ============================================================================

export function usePrintHistoryPage(filters?: PrintHistoryFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.printHistoryPage(filters),
    queryFn: () => barcodeApi.getPrintHistoryPage(filters),
  });
}

// Live dashboard feed — polls so new scans/prints appear without a reload.
export function useRecentActivity(limit = 15) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.recentActivity(limit),
    queryFn: () => barcodeApi.getRecentActivity(limit),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

// Full paginated/searchable activity log for the "View all" page.
export function useActivityPage(filters?: ActivityFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.activityPage(filters),
    queryFn: () => barcodeApi.getActivityPage(filters),
    refetchInterval: 10000,
  });
}

export function usePrintBoxLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data?: PrintRequestPayload }) =>
      barcodeApi.printBoxLabel(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

export function usePrintPalletLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: PrintRequestPayload }) =>
      barcodeApi.printPalletLabel(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

export function usePrintBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkPrintItem[]) => barcodeApi.printBulk(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

export function useProductionReleaseOil(search = '') {
  return useQuery<ProductionReleaseOilRow[]>({
    queryKey: BARCODE_QUERY_KEYS.productionReleaseOil(search),
    queryFn: () =>
      barcodeApi.getProductionReleaseOil({
        search: search.trim() || undefined,
        limit: 100,
      }),
  });
}

export function useOitmItems(search = '') {
  return useQuery<OitmItemRow[]>({
    queryKey: BARCODE_QUERY_KEYS.oitmItems(search),
    queryFn: () =>
      barcodeApi.getOitmItems({
        search: search.trim() || undefined,
        limit: 100,
      }),
  });
}

// ============================================================================
// Dismantle & Repack
// ============================================================================

export function useDismantlePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: DismantlePalletPayload }) =>
      barcodeApi.dismantlePallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useDismantleBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data: DismantleBoxPayload }) =>
      barcodeApi.dismantleBox(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useRepack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RepackPayload) => barcodeApi.repack(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Loose Stock
// ============================================================================

export function useLooseStock(filters?: LooseStockFilters, options?: BarcodeQueryOptions) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStock(filters),
    queryFn: () => barcodeApi.getLooseStock(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useLooseStockPage(filters?: LooseStockFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStockPage(filters),
    queryFn: () => barcodeApi.getLooseStockPage(filters),
  });
}

export function useLooseStockDetail(looseId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStockDetail(looseId!),
    queryFn: () => barcodeApi.getLooseStockDetail(looseId!),
    enabled: looseId !== null,
  });
}

export function useLooseStockSummary(search?: string) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStockSummary(search),
    queryFn: () => barcodeApi.getLooseStockSummary(search ? { search } : undefined),
  });
}

// ============================================================================
// Scan
// ============================================================================

export function useProcessScan() {
  return useMutation({
    mutationFn: (data: ScanRequestPayload) => barcodeApi.processScan(data),
  });
}

export function useBarcodeLookup(barcode: string | null) {
  return useQuery({
    queryKey: [...BARCODE_QUERY_KEYS.all, 'lookup', barcode] as const,
    queryFn: () => barcodeApi.lookupBarcode(barcode!),
    enabled: !!barcode,
  });
}

// ============================================================================
// Dispatch
// ============================================================================

export function useLookupDispatchBill() {
  return useMutation({
    mutationFn: (data: DispatchBillLookupPayload) => barcodeApi.lookupDispatchBill(data),
  });
}

export function useDispatchSessions(filters?: DispatchSessionFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchSessions(filters),
    queryFn: () => barcodeApi.getDispatchSessions(filters),
  });
}

export function useDispatchSettings() {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchSettings(),
    queryFn: () => barcodeApi.getDispatchSettings(),
  });
}

export function useUpdateDispatchSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DispatchSettings>) => barcodeApi.updateDispatchSettings(data),
    onSuccess: (settings) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSettings(), settings);
    },
  });
}

export function useDispatchSession(sessionId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchSession(sessionId!),
    queryFn: () => barcodeApi.getDispatchSession(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useCreateDispatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DispatchSessionCreatePayload) => barcodeApi.createDispatchSession(data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
    },
  });
}

export function useSubmitDispatchScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: DispatchScanSubmitPayload }) =>
      barcodeApi.submitDispatchScan(sessionId, data),
    onSuccess: ({ session }) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchScanLogs(session.id) });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
    },
  });
}

export function useUpdateDispatchScannedBoxQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      unitId,
      dispatchQty,
    }: {
      sessionId: number;
      unitId: number;
      dispatchQty: number;
    }) =>
      barcodeApi.updateDispatchScannedBoxQty(sessionId, unitId, {
        dispatch_qty: dispatchQty,
      }),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchScanLogs(session.id) });
    },
  });
}

export function useRemoveDispatchScannedBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, unitId }: { sessionId: number; unitId: number }) =>
      barcodeApi.removeDispatchScannedBox(sessionId, unitId),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchScanLogs(session.id) });
    },
  });
}

export function useDispatchSessionDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => barcodeApi.dispatchSession(sessionId),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSapSyncLogs(session.id) });
    },
  });
}

export function useCloseDispatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: DispatchSessionCancelPayload }) =>
      barcodeApi.closeDispatchSession(sessionId, data),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
    },
  });
}

export function useCancelDispatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: DispatchSessionCancelPayload }) =>
      barcodeApi.cancelDispatchSession(sessionId, data),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
    },
  });
}

export function useDispatchScanLogs(sessionId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchScanLogs(sessionId!),
    queryFn: () => barcodeApi.getDispatchScanLogs(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useDispatchSapSyncLogs(sessionId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchSapSyncLogs(sessionId!),
    queryFn: () => barcodeApi.getDispatchSapSyncLogs(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useRetryDispatchSapSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => barcodeApi.retryDispatchSapSync(sessionId),
    onSuccess: (session) => {
      qc.setQueryData(BARCODE_QUERY_KEYS.dispatchSession(session.id), session);
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSessions() });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.dispatchSapSyncLogs(session.id) });
    },
  });
}

export function useDispatchReport(filters?: DispatchReportFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchReport(filters),
    queryFn: () => barcodeApi.getDispatchReport(filters),
  });
}

export function useDispatchDetailReport(sessionId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchDetailReport(sessionId!),
    queryFn: () => barcodeApi.getDispatchDetailReport(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useDispatchPalletReport(filters?: DispatchReportFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchPalletReport(filters),
    queryFn: () => barcodeApi.getDispatchPalletReport(filters),
  });
}

export function useDispatchBoxReport(filters?: DispatchReportFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchBoxReport(filters),
    queryFn: () => barcodeApi.getDispatchBoxReport(filters),
  });
}

export function useDispatchRejectedScanReport(filters?: DispatchReportFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.dispatchRejectedScanReport(filters),
    queryFn: () => barcodeApi.getDispatchRejectedScanReport(filters),
  });
}
