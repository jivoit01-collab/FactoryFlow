import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BSTCreatePayload, BSTReceiveScanPayload, BSTUpdatePayload } from '../types';
import { bstApi } from './bst.api';

// ============================================================================
// Query Keys
// ============================================================================

export interface BSTListParams {
  status?: string;
  from_date?: string;
  to_date?: string;
}

export const BST_QUERY_KEYS = {
  all: ['warehouse', 'bst'] as const,
  list: (params?: BSTListParams) => [...BST_QUERY_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...BST_QUERY_KEYS.all, 'detail', id] as const,
  incoming: (params?: BSTListParams) => [...BST_QUERY_KEYS.all, 'incoming', params ?? {}] as const,
  incomingDetail: (id: number) => [...BST_QUERY_KEYS.all, 'incoming', id] as const,
  gateOutwards: () => [...BST_QUERY_KEYS.all, 'gate', 'outwards'] as const,
  gateInwards: () => [...BST_QUERY_KEYS.all, 'gate', 'inwards'] as const,
  sapTransfers: (search?: string) => [...BST_QUERY_KEYS.all, 'sap-transfers', { search }] as const,
  sapTransfer: (docEntry: number) => [...BST_QUERY_KEYS.all, 'sap-transfer', docEntry] as const,
};

// ============================================================================
// SAP stock-transfer lookup
// ============================================================================

export function useBSTSapTransfers(search?: string, enabled = true) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.sapTransfers(search),
    queryFn: () => bstApi.listSapTransfers(search ? { search } : undefined),
    enabled,
  });
}

export function useBSTSapTransfer(docEntry: number | null) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.sapTransfer(docEntry!),
    queryFn: () => bstApi.getSapTransfer(docEntry!),
    enabled: docEntry !== null,
  });
}

// ============================================================================
// Sender
// ============================================================================

export function useBSTTransfers(params?: BSTListParams) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.list(params),
    queryFn: () => bstApi.list(params),
  });
}

export function useBSTTransfer(transferId: number | null) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.detail(transferId!),
    queryFn: () => bstApi.get(transferId!),
    enabled: transferId !== null,
  });
}

export function useCreateBST() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BSTCreatePayload) => bstApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

export function useUpdateBST() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, data }: { transferId: number; data: BSTUpdatePayload }) =>
      bstApi.update(transferId, data),
    onSuccess: (_res, { transferId }) =>
      qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.detail(transferId) }),
  });
}

export function useScanBSTBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, barcodeRaw }: { transferId: number; barcodeRaw: string }) =>
      bstApi.scanBox(transferId, barcodeRaw),
    onSuccess: (_res, { transferId }) =>
      qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.detail(transferId) }),
  });
}

export function useRemoveBSTScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, scanId }: { transferId: number; scanId: number }) =>
      bstApi.removeScan(transferId, scanId),
    onSuccess: (_res, { transferId }) =>
      qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.detail(transferId) }),
  });
}

export function useApproveBST() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: number) => bstApi.approve(transferId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

export function useCancelBST() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, cancelReason }: { transferId: number; cancelReason: string }) =>
      bstApi.cancel(transferId, cancelReason),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

// ============================================================================
// Receiver
// ============================================================================

export function useBSTIncoming(params?: BSTListParams) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.incoming(params),
    queryFn: () => bstApi.listIncoming(params),
  });
}

export function useBSTIncomingDetail(transferId: number | null) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.incomingDetail(transferId!),
    queryFn: () => bstApi.getIncoming(transferId!),
    enabled: transferId !== null,
  });
}

export function useReceiveBSTScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, payload }: { transferId: number; payload: BSTReceiveScanPayload }) =>
      bstApi.receiveScan(transferId, payload),
    onSuccess: (_res, { transferId }) =>
      qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.incomingDetail(transferId) }),
  });
}

export function useCompleteBSTReceive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: number) => bstApi.receiveComplete(transferId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

// ============================================================================
// Gate
// ============================================================================

export function useBSTGateOutwards() {
  return useQuery({
    queryKey: BST_QUERY_KEYS.gateOutwards(),
    queryFn: () => bstApi.listGateOutwards(),
  });
}

export function useBSTGateInwards() {
  return useQuery({
    queryKey: BST_QUERY_KEYS.gateInwards(),
    queryFn: () => bstApi.listGateInwards(),
  });
}

export function useMarkBSTGateOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: number) => bstApi.markGateOut(transferId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

export function useMarkBSTGateIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: number) => bstApi.markGateIn(transferId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}
