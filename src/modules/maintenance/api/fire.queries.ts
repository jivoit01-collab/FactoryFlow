import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  FireCategoryPayload,
  FireIssuePayload,
  FireItemFilters,
  FireItemPayload,
  FireMovementFilters,
  FireRequestActionPayload,
  FireRequestFilters,
  FireRequestPayload,
  FireStockAdjustPayload,
} from '../types';
import { fireApi } from './fire.api';

export const FIRE_QUERY_KEYS = {
  all: ['maintenance', 'fire'] as const,
  items: (filters?: FireItemFilters) => [...FIRE_QUERY_KEYS.all, 'items', filters ?? {}] as const,
  item: (itemId: number) => [...FIRE_QUERY_KEYS.all, 'item', itemId] as const,
  lowStockItems: (filters?: FireItemFilters) =>
    [...FIRE_QUERY_KEYS.all, 'low-stock-items', filters ?? {}] as const,
  categories: () => [...FIRE_QUERY_KEYS.all, 'categories'] as const,
  requests: (filters?: FireRequestFilters) =>
    [...FIRE_QUERY_KEYS.all, 'requests', filters ?? {}] as const,
  movements: (filters?: FireMovementFilters) =>
    [...FIRE_QUERY_KEYS.all, 'movements', filters ?? {}] as const,
};

function invalidateFire(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FIRE_QUERY_KEYS.all });
}

export function useFireItems(filters?: FireItemFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.items(filters),
    queryFn: () => fireApi.getFireItems(filters),
    enabled,
  });
}

export function useFireItem(itemId: number | null) {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.item(itemId!),
    queryFn: () => fireApi.getFireItem(itemId!),
    enabled: itemId !== null,
  });
}

export function useLowStockFireItems(filters?: FireItemFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.lowStockItems(filters),
    queryFn: () => fireApi.getLowStockFireItems(filters),
    enabled,
  });
}

export function useFireCategories() {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.categories(),
    queryFn: fireApi.getFireCategories,
  });
}

export function useFireRequests(filters?: FireRequestFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.requests(filters),
    queryFn: () => fireApi.getFireRequests(filters),
    enabled,
  });
}

export function useFireMovements(filters?: FireMovementFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_QUERY_KEYS.movements(filters),
    queryFn: () => fireApi.getFireMovements(filters),
    enabled,
  });
}

export function useCreateFireItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireItemPayload) => fireApi.createFireItem(payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useUpdateFireItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: FireItemPayload }) =>
      fireApi.updateFireItem(itemId, payload),
    onSuccess: (_item, variables) => {
      invalidateFire(queryClient);
      queryClient.invalidateQueries({ queryKey: FIRE_QUERY_KEYS.item(variables.itemId) });
    },
  });
}

export function useAdjustFireStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: FireStockAdjustPayload }) =>
      fireApi.adjustFireStock(itemId, payload),
    onSuccess: (_item, variables) => {
      invalidateFire(queryClient);
      queryClient.invalidateQueries({ queryKey: FIRE_QUERY_KEYS.item(variables.itemId) });
    },
  });
}

export function useCreateFireCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireCategoryPayload) => fireApi.createFireCategory(payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useUpdateFireCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FireCategoryPayload }) =>
      fireApi.updateFireCategory(id, payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useCreateFireRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireRequestPayload) => fireApi.createFireRequest(payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useIssueFireRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: number; payload: FireIssuePayload }) =>
      fireApi.issueFireRequest(requestId, payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useConsumeFireRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: FireRequestActionPayload;
    }) => fireApi.consumeFireRequest(requestId, payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useReturnUnusedFireRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: FireRequestActionPayload;
    }) => fireApi.returnUnusedFireRequest(requestId, payload),
    onSuccess: () => invalidateFire(queryClient),
  });
}

export function useCancelFireRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => fireApi.cancelFireRequest(requestId),
    onSuccess: () => invalidateFire(queryClient),
  });
}
