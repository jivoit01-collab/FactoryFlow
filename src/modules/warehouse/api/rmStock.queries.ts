import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type RawMaterialStockListParams,
  rmStockApi,
  type SetRawMaterialStockPayload,
} from './rmStock.api';

export const RM_STOCK_QUERY_KEYS = {
  all: ['warehouse', 'rm-stock'] as const,
  list: (params?: RawMaterialStockListParams) =>
    [
      ...RM_STOCK_QUERY_KEYS.all,
      'list',
      params?.warehouseCode ?? '',
      params?.search ?? '',
      params?.includeInactive ?? false,
    ] as const,
  detail: (id: number) => [...RM_STOCK_QUERY_KEYS.all, 'detail', id] as const,
  items: (search: string, warehouseCode?: string) =>
    [...RM_STOCK_QUERY_KEYS.all, 'items', warehouseCode ?? '', search] as const,
};

export function useRMStock(params?: RawMaterialStockListParams) {
  return useQuery({
    queryKey: RM_STOCK_QUERY_KEYS.list(params),
    queryFn: () => rmStockApi.list(params),
  });
}

/**
 * Upload the issue sheet. Preview and commit are the same call; only a commit
 * invalidates the register, since a preview changes nothing.
 */
export function useImportRMSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      file?: File | null;
      text?: string;
      commit?: boolean;
      acceptMismatches?: boolean;
    }) =>
      rmStockApi.importSheet(
        { file: vars.file, text: vars.text },
        { commit: vars.commit, acceptMismatches: vars.acceptMismatches },
      ),
    onSuccess: (data) => {
      if (data.committed) qc.invalidateQueries({ queryKey: RM_STOCK_QUERY_KEYS.all });
    },
  });
}

export function useRMStockDetail(id: number | null) {
  return useQuery({
    queryKey: RM_STOCK_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => rmStockApi.detail(id as number),
    enabled: id != null,
  });
}

/**
 * Raw-material items from SAP, for the picker.
 *
 * Kept off by default and enabled only once there is something to search for:
 * every call is a HANA round trip, and an unfiltered one would fetch the first
 * screenful of a group that runs to hundreds of items before the keeper has
 * typed anything useful.
 */
export function useRMItemSearch(
  search: string,
  warehouseCode?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: RM_STOCK_QUERY_KEYS.items(search, warehouseCode),
    queryFn: () => rmStockApi.items({ search, warehouseCode }),
    enabled: options?.enabled ?? search.trim().length >= 2,
    // The item master barely moves within a session, and the on-hand figure
    // riding along is only shown for context.
    staleTime: 60 * 1000,
  });
}

export function useSetRMStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetRawMaterialStockPayload) => rmStockApi.set(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: RM_STOCK_QUERY_KEYS.all });
    },
  });
}

export function useRemoveRMStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rmStockApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: RM_STOCK_QUERY_KEYS.all });
    },
  });
}
