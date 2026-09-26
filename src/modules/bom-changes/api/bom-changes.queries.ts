import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bomChangesApi, type ChangeRequestPayload, type RequestFilters } from './bom-changes.api';

/** Every query key this module owns. A mutation invalidates every list that shows its rows. */
const KEYS = {
  all: ['bomChanges'] as const,
  workflow: ['bomChanges', 'workflow'] as const,
  sapBoms: (search: string) => ['bomChanges', 'sapBoms', search] as const,
  sapBom: (treeCode: string) => ['bomChanges', 'sapBom', treeCode] as const,
  requests: (filters: RequestFilters) => ['bomChanges', 'requests', filters] as const,
  request: (id: number) => ['bomChanges', 'request', id] as const,
  items: (search: string) => ['bomChanges', 'lookup', 'items', search] as const,
  resources: (search: string) => ['bomChanges', 'lookup', 'resources', search] as const,
  warehouses: ['bomChanges', 'lookup', 'warehouses'] as const,
};

export function useBomWorkflow() {
  return useQuery({
    queryKey: KEYS.workflow,
    queryFn: bomChangesApi.workflow,
    staleTime: 10 * 60_000,
  });
}

export function useSapBoms(search: string) {
  return useQuery({
    queryKey: KEYS.sapBoms(search),
    queryFn: () => bomChangesApi.sapBoms(search),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useSapBom(treeCode: string | null) {
  return useQuery({
    queryKey: KEYS.sapBom(treeCode ?? ''),
    queryFn: () => bomChangesApi.sapBom(treeCode as string),
    enabled: !!treeCode,
  });
}

export function useChangeRequests(filters: RequestFilters) {
  return useQuery({
    queryKey: KEYS.requests(filters),
    queryFn: () => bomChangesApi.requests(filters),
    placeholderData: keepPreviousData,
  });
}

export function useChangeRequest(id: number | null) {
  return useQuery({
    queryKey: KEYS.request(id ?? 0),
    queryFn: () => bomChangesApi.request(id as number),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useSapItemSearch(search: string) {
  return useQuery({
    queryKey: KEYS.items(search),
    queryFn: () => bomChangesApi.items(search),
    enabled: search.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useSapResourceSearch(search: string) {
  return useQuery({
    queryKey: KEYS.resources(search),
    queryFn: () => bomChangesApi.resources(search),
    staleTime: 5 * 60_000,
  });
}

export function useSapWarehouses() {
  return useQuery({
    queryKey: KEYS.warehouses,
    queryFn: bomChangesApi.warehouses,
    staleTime: 10 * 60_000,
  });
}

/**
 * Requests appear in every list, in their own detail and — once pushed — in
 * the SAP BOM viewer, so a change to one refreshes the whole module.
 */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEYS.all });
}

export function useCreateChangeRequest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: ChangeRequestPayload) => bomChangesApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useDirectPush() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: ChangeRequestPayload) => bomChangesApi.directPush(payload),
    onSuccess: invalidate,
  });
}

export function useApproveRequest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      bomChangesApi.approve(id, remarks),
    // A refused push still records why on the request, so refresh either way.
    onSettled: invalidate,
  });
}

export function useRejectRequest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      bomChangesApi.reject(id, remarks),
    onSuccess: invalidate,
  });
}

export function useCancelRequest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => bomChangesApi.cancel(id),
    onSuccess: invalidate,
  });
}
