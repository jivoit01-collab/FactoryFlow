import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApproveBOMRequestPayload,
  CreateBOMRequestPayload,
  CreateFGReceiptPayload,
  DispatchScheduleParams,
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
  fgReceipts: (status?: string, productionRunId?: number) => [...WAREHOUSE_QUERY_KEYS.all, 'fg-receipts', { status, productionRunId }] as const,
  fgReceiptDetail: (id: number) => [...WAREHOUSE_QUERY_KEYS.all, 'fg-receipt', id] as const,
  dispatchSchedule: (params?: DispatchScheduleParams) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'dispatch-schedule', params ?? {}] as const,
  dispatchScheduleItems: (docEntry: number) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'dispatch-schedule-items', docEntry] as const,
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
      qc.invalidateQueries({ queryKey: ['production-execution'] });
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
// Dispatch Schedule (read-only)
// ============================================================================

export function useDispatchSchedule(params?: DispatchScheduleParams) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.dispatchSchedule(params),
    queryFn: () => warehouseApi.getDispatchSchedule(params),
    staleTime: 60 * 1000,
  });
}

export function useDispatchScheduleItems(docEntry?: number | null, enabled = false) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.dispatchScheduleItems(docEntry ?? 0),
    queryFn: () => warehouseApi.getDispatchScheduleItems(docEntry!),
    enabled: enabled && !!docEntry,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// FG Receipt Queries
// ============================================================================

export function useFGReceipts(
  status?: string,
  productionRunId?: number,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.fgReceipts(status, productionRunId),
    queryFn: () => warehouseApi.getFGReceipts({
      ...(status ? { status } : {}),
      ...(productionRunId ? { production_run_id: productionRunId } : {}),
    }),
    enabled,
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
      qc.invalidateQueries({ queryKey: ['production-execution'] });
    },
  });
}

export function useReceiveFG() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: number) => warehouseApi.receiveFG(receiptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WAREHOUSE_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: ['production-execution'] });
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
