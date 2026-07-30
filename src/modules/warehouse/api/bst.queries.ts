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

// Live polling for the two-sided flow: a non-gated internal transfer becomes
// receivable on the sender's first scan, so both the scan page and the
// destination's receive page poll to see each other's boxes appear in near
// real time. 4s is snappy enough for a scan-along workflow without hammering.
export const BST_LIVE_POLL_MS = 4000;

interface PollOptions {
  refetchInterval?: number | false;
  /** Skip the request entirely — used by permission-gated sidebar badges. */
  enabled?: boolean;
}

export const BST_QUERY_KEYS = {
  all: ['warehouse', 'bst'] as const,
  list: (params?: BSTListParams) => [...BST_QUERY_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...BST_QUERY_KEYS.all, 'detail', id] as const,
  incoming: (params?: BSTListParams) => [...BST_QUERY_KEYS.all, 'incoming', params ?? {}] as const,
  incomingDetail: (id: number) => [...BST_QUERY_KEYS.all, 'incoming', id] as const,
  gateOutwards: (params?: BSTListParams) =>
    [...BST_QUERY_KEYS.all, 'gate', 'outwards', params ?? {}] as const,
  gateInwards: () => [...BST_QUERY_KEYS.all, 'gate', 'inwards'] as const,
  sapTransfers: (search?: string, documentType?: string) =>
    [...BST_QUERY_KEYS.all, 'sap-transfers', { search, documentType }] as const,
  sapTransfer: (docEntry: number) => [...BST_QUERY_KEYS.all, 'sap-transfer', docEntry] as const,
  partialTransfers: (params?: BSTListParams) =>
    [...BST_QUERY_KEYS.all, 'partial-transfers', params ?? {}] as const,
};

// ============================================================================
// SAP stock-transfer lookup
// ============================================================================

export function useBSTSapTransfers(search?: string, enabled = true, documentType?: string) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.sapTransfers(search, documentType),
    queryFn: () =>
      bstApi.listSapTransfers({
        ...(search ? { search } : {}),
        ...(documentType ? { document_type: documentType } : {}),
      }),
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

export function useBSTTransfers(params?: BSTListParams, options?: PollOptions) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.list(params),
    queryFn: () => bstApi.list(params),
    refetchInterval: options?.refetchInterval,
  });
}

export function useBSTTransfer(transferId: number | null, options?: PollOptions) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.detail(transferId!),
    queryFn: () => bstApi.get(transferId!),
    enabled: transferId !== null,
    refetchInterval: options?.refetchInterval,
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
// Partial-transfer approval (seal a short scan with admin sign-off)
// ============================================================================

export function useRequestBSTPartialTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, reason }: { transferId: number; reason: string }) =>
      bstApi.requestPartialTransfer(transferId, reason),
    onSuccess: (_res, { transferId }) =>
      qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.detail(transferId) }),
  });
}

export function useBSTPartialTransfers(params?: BSTListParams, options?: PollOptions) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.partialTransfers(params),
    queryFn: () => bstApi.listPartialTransfers(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useApproveBSTPartialTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reviewNotes }: { requestId: number; reviewNotes?: string }) =>
      bstApi.approvePartialTransfer(requestId, reviewNotes ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

export function useRejectBSTPartialTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reviewNotes }: { requestId: number; reviewNotes: string }) =>
      bstApi.rejectPartialTransfer(requestId, reviewNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
  });
}

// ============================================================================
// Receiver
// ============================================================================

export function useBSTIncoming(params?: BSTListParams, options?: PollOptions) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.incoming(params),
    queryFn: () => bstApi.listIncoming(params),
    refetchInterval: options?.refetchInterval,
  });
}

export function useBSTIncomingDetail(transferId: number | null, options?: PollOptions) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.incomingDetail(transferId!),
    queryFn: () => bstApi.getIncoming(transferId!),
    enabled: transferId !== null,
    refetchInterval: options?.refetchInterval,
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

export function useBSTGateOutwards(
  params?: BSTListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: BST_QUERY_KEYS.gateOutwards(params),
    queryFn: () => bstApi.listGateOutwards(params),
    enabled: options?.enabled ?? true,
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
