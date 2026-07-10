import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CancelRequest,
  ComboDefinitionUpsert,
  ConfirmRequest,
  DispatchCreateRequest,
  DispatchListParams,
  MarketplaceChannel,
  MarketplaceWarehouseUpsert,
  OrderListParams,
  ReconciliationParams,
  ReturnCreateRequest,
  ReturnSubmitRequest,
  ScanRequest,
  SkuMappingUpsert,
} from '../types/marketplace.types';
import { marketplaceApi } from './marketplace.api';

export const MARKETPLACE_QUERY_KEYS = {
  all: ['marketplace'] as const,
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
  returns: (params?: DispatchListParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'returns', params] as const,
  return: (id?: number | null) => [...MARKETPLACE_QUERY_KEYS.all, 'return', id] as const,
  reconciliation: (params?: ReconciliationParams) =>
    [...MARKETPLACE_QUERY_KEYS.all, 'reconciliation', params] as const,
};

function invalidateMarketplace(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.all });
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

export function useMpDispatch(id?: number | null) {
  return useQuery({
    queryKey: MARKETPLACE_QUERY_KEYS.dispatch(id),
    queryFn: () => marketplaceApi.dispatch(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useMpReturns(params?: DispatchListParams) {
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
export function useSubmitReturn(returnId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReturnSubmitRequest) => marketplaceApi.submitReturn(returnId, payload),
    onSuccess: () => invalidateMarketplace(qc),
  });
}
