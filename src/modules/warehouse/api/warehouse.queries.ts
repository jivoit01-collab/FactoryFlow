import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApproveBOMRequestPayload,
  CreateBOMRequestPayload,
  CreateFGReceiptPayload,
  MaterialIssuePayload,
  RejectBOMRequestPayload,
} from '../types';
import { warehouseApi } from './warehouse.api';

// ============================================================================
// Query Keys
// ============================================================================

export const WAREHOUSE_QUERY_KEYS = {
  all: ['warehouse'] as const,
  bomRequests: (status?: string) => [...WAREHOUSE_QUERY_KEYS.all, 'bom-requests', { status }] as const,
  bomRequestDetail: (id: number) => [...WAREHOUSE_QUERY_KEYS.all, 'bom-request', id] as const,
  fgReceipts: (status?: string) => [...WAREHOUSE_QUERY_KEYS.all, 'fg-receipts', { status }] as const,
  fgReceiptDetail: (id: number) => [...WAREHOUSE_QUERY_KEYS.all, 'fg-receipt', id] as const,
};

// ============================================================================
// BOM Request Queries
// ============================================================================

export function useBOMRequests(status?: string) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.bomRequests(status),
    queryFn: () => warehouseApi.getBOMRequests(status ? { status } : undefined),
  });
}

export function useBOMRequestDetail(requestId: number | null) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.bomRequestDetail(requestId!),
    queryFn: () => warehouseApi.getBOMRequestDetail(requestId!),
    enabled: requestId !== null,
  });
}

// ============================================================================
// BOM Request Mutations
// ============================================================================

export function useCreateBOMRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBOMRequestPayload) => warehouseApi.createBOMRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
      // Also invalidate production runs to refresh warehouse_approval_status
      qc.invalidateQueries({ queryKey: ['production-execution'] });
    },
  });
}

export function useApproveBOMRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: ApproveBOMRequestPayload }) =>
      warehouseApi.approveBOMRequest(requestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: ['production-execution'] });
    },
  });
}

export function useRejectBOMRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: RejectBOMRequestPayload }) =>
      warehouseApi.rejectBOMRequest(requestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: ['production-execution'] });
    },
  });
}

export function useIssueMaterials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data?: MaterialIssuePayload }) =>
      warehouseApi.issueMaterials(requestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Stock Check
// ============================================================================

export function useStockCheck(itemCodes: string[], enabled = false) {
  return useQuery({
    queryKey: [...WAREHOUSE_QUERY_KEYS.all, 'stock', itemCodes],
    queryFn: () => warehouseApi.checkStock(itemCodes),
    enabled: enabled && itemCodes.length > 0,
  });
}

// ============================================================================
// FG Receipt Queries
// ============================================================================

export function useFGReceipts(status?: string) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.fgReceipts(status),
    queryFn: () => warehouseApi.getFGReceipts(status ? { status } : undefined),
  });
}

export function useFGReceiptDetail(receiptId: number | null) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.fgReceiptDetail(receiptId!),
    queryFn: () => warehouseApi.getFGReceiptDetail(receiptId!),
    enabled: receiptId !== null,
  });
}

// ============================================================================
// FG Receipt Mutations
// ============================================================================

export function useCreateFGReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFGReceiptPayload) => warehouseApi.createFGReceipt(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
    },
  });
}

export function useReceiveFG() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: number) => warehouseApi.receiveFG(receiptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
    },
  });
}

export function usePostFGToSAP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: number) => warehouseApi.postFGToSAP(receiptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: ['production-execution'] });
    },
  });
}
