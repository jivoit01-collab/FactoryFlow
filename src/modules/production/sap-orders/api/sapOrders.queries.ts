import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateSapOrderPayload,
  type IssuePayload,
  type ReceiptPayload,
  type SapOrderFilters,
  sapOrdersApi,
} from './sapOrders.api';

const KEYS = {
  list: (filters: SapOrderFilters) => ['sapProductionOrders', 'list', filters] as const,
  detail: (docEntry: number) => ['sapProductionOrders', 'detail', docEntry] as const,
  batches: (item: string, warehouse: string) => ['sapProductionOrders', 'batches', item, warehouse] as const,
};

export function useSapOrders(filters: SapOrderFilters) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => sapOrdersApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useSapOrder(docEntry: number) {
  return useQuery({
    queryKey: KEYS.detail(docEntry),
    queryFn: () => sapOrdersApi.detail(docEntry),
    enabled: Number.isFinite(docEntry) && docEntry > 0,
  });
}

export function useComponentBatches(itemCode: string, warehouse: string, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.batches(itemCode, warehouse),
    queryFn: () => sapOrdersApi.batches(itemCode, warehouse),
    enabled: enabled && !!itemCode && !!warehouse,
    staleTime: 30_000,
  });
}

/** Every write changes the order's totals, so it refreshes the list and the order. */
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['sapProductionOrders'] });
}

export function useCreateSapOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CreateSapOrderPayload) => sapOrdersApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useReleaseSapOrder() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (docEntry: number) => sapOrdersApi.release(docEntry), onSuccess: invalidate });
}

export function useCloseSapOrder() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (docEntry: number) => sapOrdersApi.close(docEntry), onSuccess: invalidate });
}

export function useIssueToSapOrder(docEntry: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: IssuePayload) => sapOrdersApi.issue(docEntry, payload),
    onSuccess: invalidate,
  });
}

export function useReceiveFromSapOrder(docEntry: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ReceiptPayload) => sapOrdersApi.receipt(docEntry, payload),
    onSuccess: invalidate,
  });
}
