import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  TransferApprovePayload,
  TransferCreateBSTPayload,
  TransferPostAllocation,
  TransferRejectPayload,
  TransferRequestCreatePayload,
  TransferSecondLegPayload,
} from '../types';
import { transferRequestApi, type TransferRequestListParams } from './transferRequest.api';

// ============================================================================
// Query keys
// ============================================================================

export const TRANSFER_REQUEST_QUERY_KEYS = {
  all: ['warehouse', 'transfer-requests'] as const,
  list: (params?: TransferRequestListParams) =>
    [...TRANSFER_REQUEST_QUERY_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'detail', id] as const,
  pending: () => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'pending'] as const,
  inTransit: () => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'in-transit'] as const,
  reconcile: (all?: boolean) => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'reconcile', !!all] as const,
  batches: (id: number) => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'batches', id] as const,
  allocation: (id: number) => [...TRANSFER_REQUEST_QUERY_KEYS.all, 'allocation', id] as const,
  stock: (warehouse: string, search: string) =>
    [...TRANSFER_REQUEST_QUERY_KEYS.all, 'stock', warehouse, search] as const,
};

// ============================================================================
// Reads
// ============================================================================

export function useTransferRequests(params?: TransferRequestListParams) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.list(params),
    queryFn: () => transferRequestApi.list(params),
  });
}

export function useTransferRequest(requestId?: number) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.detail(requestId ?? 0),
    queryFn: () => transferRequestApi.get(requestId as number),
    enabled: !!requestId,
  });
}

/** Pass `enabled: false` for a permission-gated badge that must not fetch. */
export function usePendingTransferRequests(enabled = true) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.pending(),
    queryFn: () => transferRequestApi.pending(),
    enabled,
  });
}

export function useInTransitTransferRequests(enabled = true) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.inTransit(),
    queryFn: () => transferRequestApi.inTransit(),
    enabled,
  });
}

export function useTransferReconciliation(all = false, enabled = true) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.reconcile(all),
    queryFn: () => transferRequestApi.reconcile({ all }),
    enabled,
  });
}

/**
 * Items held in the source warehouse. Disabled until a warehouse is chosen —
 * the backend refuses the lookup without one, and there is nothing to show.
 */
export function useWarehouseStock(warehouse: string, search = '') {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.stock(warehouse, search),
    queryFn: () => transferRequestApi.stock({ warehouse, search, limit: 100 }),
    enabled: !!warehouse,
    // Stock moves constantly, but a picker re-reading SAP on every keystroke is
    // worse than a slightly stale list; posting revalidates anyway.
    staleTime: 30_000,
  });
}

/**
 * Which batches posting would take. Read-only and only fetched while the dialog
 * is open — it hits SAP's batch tables, so there is no reason to poll it.
 */
export function useAllocationPreview(requestId: number, enabled: boolean) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.allocation(requestId),
    queryFn: () => transferRequestApi.allocationPreview(requestId),
    enabled: !!requestId && enabled,
    // Always re-read on open: batches move, and a stale proposal would be
    // rejected server-side anyway.
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Batch verification reads SAP's own allocation table, so it is deliberately
 * on-demand rather than part of the detail payload.
 */
export function useTransferBatchVerification(requestId?: number, enabled = false) {
  return useQuery({
    queryKey: TRANSFER_REQUEST_QUERY_KEYS.batches(requestId ?? 0),
    queryFn: () => transferRequestApi.verifyBatches(requestId as number),
    enabled: !!requestId && enabled,
  });
}

// ============================================================================
// Writes
// ============================================================================

/** Every write invalidates the queues too — a decision moves it between them. */
function useTransferInvalidation() {
  const queryClient = useQueryClient();
  return (requestId?: number) => {
    queryClient.invalidateQueries({ queryKey: TRANSFER_REQUEST_QUERY_KEYS.all });
    if (requestId) {
      queryClient.invalidateQueries({
        queryKey: TRANSFER_REQUEST_QUERY_KEYS.detail(requestId),
      });
    }
  };
}

export function useCreateTransferRequest() {
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: (data: TransferRequestCreatePayload) => transferRequestApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useApproveTransferRequest() {
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data?: TransferApprovePayload;
    }) => transferRequestApi.approve(requestId, data ?? {}),
    onSuccess: (_result, variables) => invalidate(variables.requestId),
  });
}

export function useRejectTransferRequest() {
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: TransferRejectPayload }) =>
      transferRequestApi.reject(requestId, data),
    onSuccess: (_result, variables) => invalidate(variables.requestId),
  });
}

export function usePostTransferToSAP() {
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      allocations,
    }: {
      requestId: number;
      allocations?: TransferPostAllocation[];
    }) => transferRequestApi.post(requestId, allocations),
    onSuccess: (_result, variables) => invalidate(variables.requestId),
  });
}

export function useCreateBSTFromTransfer() {
  const queryClient = useQueryClient();
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data?: TransferCreateBSTPayload;
    }) => transferRequestApi.createBST(requestId, data ?? {}),
    onSuccess: (_result, variables) => {
      invalidate(variables.requestId);
      // A new BST appears on the BST dashboard, which is a different key tree.
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'bst'] });
    },
  });
}

export function usePostTransferSecondLeg() {
  const invalidate = useTransferInvalidation();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data?: TransferSecondLegPayload;
    }) => transferRequestApi.postSecondLeg(requestId, data ?? {}),
    onSuccess: (_result, variables) => invalidate(variables.requestId),
  });
}
