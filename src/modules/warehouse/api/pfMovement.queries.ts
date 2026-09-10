import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreatePFMovementPayload,
  pfMovementApi,
  type PFMovementListParams,
  type UpdatePFMovementPayload,
} from './pfMovement.api';

export const PF_MOVEMENT_QUERY_KEYS = {
  all: ['warehouse', 'pf-movements'] as const,
  list: (params?: PFMovementListParams) =>
    [
      ...PF_MOVEMENT_QUERY_KEYS.all,
      'list',
      params?.fromWarehouse ?? '',
      params?.toWarehouse ?? '',
      params?.dateFrom ?? '',
      params?.dateTo ?? '',
      params?.search ?? '',
      params?.includeCancelled ?? false,
      params?.allCompanies ?? false,
    ] as const,
  detail: (id: number) => [...PF_MOVEMENT_QUERY_KEYS.all, 'detail', id] as const,
  items: (search: string, warehouseCode?: string) =>
    [...PF_MOVEMENT_QUERY_KEYS.all, 'items', warehouseCode ?? '', search] as const,
  destinations: () => [...PF_MOVEMENT_QUERY_KEYS.all, 'destinations'] as const,
};

export function usePFMovements(params?: PFMovementListParams) {
  return useQuery({
    queryKey: PF_MOVEMENT_QUERY_KEYS.list(params),
    queryFn: () => pfMovementApi.list(params),
  });
}

export function usePFMovementDetail(id: number | null) {
  return useQuery({
    queryKey: PF_MOVEMENT_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => pfMovementApi.detail(id as number),
    enabled: id != null,
  });
}

/**
 * Finished-goods items from SAP, for the item picker.
 *
 * Kept off until there is something to search for: every call is a HANA round
 * trip, and an unfiltered one would fetch a screenful of the finished-goods
 * group before the keeper has typed anything useful.
 */
export function usePFMovementItemSearch(
  search: string,
  warehouseCode?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: PF_MOVEMENT_QUERY_KEYS.items(search, warehouseCode),
    queryFn: () => pfMovementApi.items({ search, warehouseCode }),
    enabled: options?.enabled ?? search.trim().length >= 2,
    // The item master barely moves within a session, and the on-hand riding
    // along is only shown for context.
    staleTime: 60 * 1000,
  });
}

/**
 * Destination warehouses, every company.
 *
 * Three HANA round trips behind one call, and warehouse masters change perhaps
 * monthly — so it is cached for the session rather than re-fetched each time
 * the form opens.
 */
export function usePFMovementDestinations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: PF_MOVEMENT_QUERY_KEYS.destinations(),
    queryFn: () => pfMovementApi.destinations(),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreatePFMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePFMovementPayload) => pfMovementApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PF_MOVEMENT_QUERY_KEYS.all });
    },
  });
}

export function useUpdatePFMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; payload: UpdatePFMovementPayload }) =>
      pfMovementApi.update(vars.id, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PF_MOVEMENT_QUERY_KEYS.all });
    },
  });
}

export function useCancelPFMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason?: string }) =>
      pfMovementApi.cancel(vars.id, vars.reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PF_MOVEMENT_QUERY_KEYS.all });
    },
  });
}

export function useRestorePFMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; note?: string }) =>
      pfMovementApi.restore(vars.id, vars.note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PF_MOVEMENT_QUERY_KEYS.all });
    },
  });
}
