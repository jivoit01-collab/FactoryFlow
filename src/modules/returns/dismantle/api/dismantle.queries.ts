import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateDismantlePayload,
  dismantleApi,
  type DismantleStatus,
  type SaveComponentsPayload,
} from './dismantle.api';

export const dismantleKeys = {
  all: ['dismantle'] as const,
  list: (params?: Record<string, unknown>) => ['dismantle', 'list', params ?? {}] as const,
  detail: (id: number) => ['dismantle', 'detail', id] as const,
  returnedLines: (search: string) => ['dismantle', 'returned-lines', search] as const,
  stock: (warehouse: string, search: string) => ['dismantle', 'stock', warehouse, search] as const,
  batches: (itemCode: string, warehouse: string) =>
    ['dismantle', 'batches', itemCode, warehouse] as const,
  warehouses: () => ['dismantle', 'warehouses'] as const,
};

export function useDismantles(params?: { status?: DismantleStatus; search?: string }) {
  return useQuery({
    queryKey: dismantleKeys.list(params),
    queryFn: () => dismantleApi.list(params),
  });
}

export function useDismantle(id: number | null) {
  return useQuery({
    queryKey: dismantleKeys.detail(id ?? 0),
    queryFn: () => dismantleApi.get(id as number),
    enabled: !!id,
  });
}

/**
 * Returned stock still waiting to be dealt with.
 *
 * Never cached for long: two people working the returns floor would otherwise
 * both be offered the same pieces, and the second would raise a disassembly
 * order for stock the first has already taken apart.
 */
export function useDismantleReturnedLines(search = '') {
  return useQuery({
    queryKey: dismantleKeys.returnedLines(search),
    queryFn: () => dismantleApi.returnedLines({ search, limit: 200 }),
    staleTime: 10_000,
  });
}

/** Warehouse stock with a BOM — covers returns keyed straight into SAP. */
export function useDismantlableStock(warehouseCode: string, search = '') {
  return useQuery({
    queryKey: dismantleKeys.stock(warehouseCode, search),
    queryFn: () => dismantleApi.stock({ warehouse_code: warehouseCode, search, limit: 100 }),
    enabled: !!warehouseCode,
    staleTime: 10_000,
  });
}

export function useDismantleBatches(itemCode: string, warehouseCode: string) {
  return useQuery({
    queryKey: dismantleKeys.batches(itemCode, warehouseCode),
    queryFn: () => dismantleApi.batches({ item_code: itemCode, warehouse_code: warehouseCode }),
    enabled: !!itemCode && !!warehouseCode,
    staleTime: 10_000,
  });
}

export function useDismantleWarehouses() {
  return useQuery({
    queryKey: dismantleKeys.warehouses(),
    queryFn: () => dismantleApi.warehouses(),
    staleTime: 10 * 60_000,
  });
}

/**
 * What the post would check, run on demand.
 *
 * A mutation rather than a query because it is a live SAP read (stock, batches,
 * the item's Variety) and because a cached answer is worse than none: the stock
 * it reports on moves.
 */
export function useDismantlePreview() {
  return useMutation({
    mutationFn: (id: number) => dismantleApi.preview(id),
  });
}

export function useCreateDismantle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDismantlePayload) => dismantleApi.create(payload),
    onSuccess: (data) => {
      qc.setQueryData(dismantleKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: dismantleKeys.all });
    },
  });
}

/** A basket of items — one record per item, all or nothing. */
export function useCreateDismantles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateDismantlePayload[]) => dismantleApi.createMany(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dismantleKeys.all });
    },
  });
}

export function useUpdateDismantleHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: number; quantity?: string | number; batch_number?: string; remarks?: string }) =>
      dismantleApi.updateHeader(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(dismantleKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: dismantleKeys.list() });
    },
  });
}

export function useSaveDismantleComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & SaveComponentsPayload) =>
      dismantleApi.saveComponents(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(dismantleKeys.detail(data.id), data);
    },
  });
}

export function useRebuildDismantleComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismantleApi.rebuildComponents(id),
    onSuccess: (data) => {
      qc.setQueryData(dismantleKeys.detail(data.id), data);
    },
  });
}

export function usePostDismantle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismantleApi.post(id),
    onSuccess: (data) => {
      qc.setQueryData(dismantleKeys.detail(data.id), data);
      // The returned-line list is now short by what this dismantle claimed.
      qc.invalidateQueries({ queryKey: dismantleKeys.all });
    },
  });
}

/** Soft-delete a draft. The returned-line it claimed becomes available again. */
export function useDeleteDismantle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismantleApi.remove(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: dismantleKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dismantleKeys.all });
    },
  });
}
