import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PLAN_POLL_MS } from '../constants/api';
import type {
  BunchSapPlan,
  GLItemMapPayload,
  GrpoRedatePayload,
  RoutingPayload,
  VoucherInfoPayload,
  VoucherOverridePayload,
} from '../types';
import { planHasLiveWork } from '../utils/status';
import { cashSapApi } from './cashSap.api';

/**
 * Root `['cash-sap']`. Every write invalidates it and the cash book's own root
 * (`['cash-book']`, `CASH_BOOK_QUERY_KEYS.all` in the accounts module): a bill
 * added or a voucher left out here changes what the cash book's screens may
 * show, and the keys are cheap to refetch.
 */
export const CASH_SAP_QUERY_KEYS = {
  all: ['cash-sap'] as const,
  options: () => [...CASH_SAP_QUERY_KEYS.all, 'options'] as const,
  bunches: (state?: string) => [...CASH_SAP_QUERY_KEYS.all, 'bunches', state ?? ''] as const,
  statuses: (ids: number[]) => [...CASH_SAP_QUERY_KEYS.all, 'statuses', ids] as const,
  plan: (bunchId: number) => [...CASH_SAP_QUERY_KEYS.all, 'plan', bunchId] as const,
  voucherInfo: (entryId: number) => [...CASH_SAP_QUERY_KEYS.all, 'voucher-info', entryId] as const,
  routing: () => [...CASH_SAP_QUERY_KEYS.all, 'routing'] as const,
  glMap: (sapCompanyCode: string, includeRetired: boolean) =>
    [...CASH_SAP_QUERY_KEYS.all, 'gl-map', sapCompanyCode, includeRetired] as const,
  items: (sapCompanyCode: string, search: string) =>
    [...CASH_SAP_QUERY_KEYS.all, 'items', sapCompanyCode, search] as const,
};

const CASH_BOOK_ROOT = ['cash-book'] as const;

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: CASH_SAP_QUERY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: CASH_BOOK_ROOT });
  };
}

/** Puts a plan the server just answered with on screen, then refreshes the rest. */
function useSettlePlan() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAll();
  return (bunchId: number, plan: BunchSapPlan | undefined) => {
    if (plan) queryClient.setQueryData(CASH_SAP_QUERY_KEYS.plan(bunchId), plan);
    invalidate();
  };
}

/** The switches and this user's rights. Long-lived, like the cash book's options. */
export function useCashSapOptions() {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.options(),
    queryFn: () => cashSapApi.options(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCashSapBunches(state?: 'SENT' | 'UNSENT') {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.bunches(state),
    queryFn: () => cashSapApi.bunches(state),
  });
}

/** The SAP badge of each listed bunch, keyed by bunch id. */
export function useBunchSapStatuses(ids: number[]) {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.statuses(ids),
    queryFn: async () => {
      const rows = await cashSapApi.bunchStatuses(ids);
      return Object.fromEntries(rows.map((row) => [row.bunch_id, row]));
    },
    enabled: ids.length > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * The bunch's plan. Polled every 15 s while a document waits in the queue or
 * in SAP approval -- the worker and SAP move it on without the page asking --
 * and left alone otherwise.
 */
export function useBunchSapPlan(bunchId: number | null) {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.plan(bunchId ?? 0),
    queryFn: () => cashSapApi.plan(bunchId as number),
    enabled: bunchId != null && bunchId > 0,
    refetchInterval: (query) => (planHasLiveWork(query.state.data) ? PLAN_POLL_MS : false),
  });
}

export function useVoucherSapInfo(entryId: number | null) {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.voucherInfo(entryId ?? 0),
    queryFn: () => cashSapApi.voucherInfo(entryId as number),
    enabled: entryId != null && entryId > 0,
  });
}

export function useCashSapRouting() {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.routing(),
    queryFn: () => cashSapApi.routing(),
  });
}

export function useGLItemMap(sapCompanyCode = '', includeRetired = false) {
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.glMap(sapCompanyCode, includeRetired),
    queryFn: () => cashSapApi.glMap({ sapCompanyCode, includeRetired }),
  });
}

/** SAP items for one company; asks only once two characters are typed. */
export function useSapItems(sapCompanyCode: string, search: string, enabled = true) {
  const term = search.trim();
  return useQuery({
    queryKey: CASH_SAP_QUERY_KEYS.items(sapCompanyCode, term),
    queryFn: () => cashSapApi.items(sapCompanyCode, term),
    enabled: enabled && !!sapCompanyCode && term.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Writes on one bunch. Each answers with the plan (or {sent, remaining, plan}).
// ---------------------------------------------------------------------------

export function usePostBunchToSap(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: (sapCompanyCode?: string) => cashSapApi.post(bunchId, sapCompanyCode),
    onSuccess: (result) => settle(bunchId, result.plan),
  });
}

export function useStopBunch(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: (reason: string) => cashSapApi.stop(bunchId, reason),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useRecheckBunch(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: () => cashSapApi.recheck(bunchId),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useAcceptBunchChanges(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: (note: string) => cashSapApi.acceptChanges(bunchId, note),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useClosePO(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: (batchId: number) => cashSapApi.closePO(bunchId, batchId),
    onSuccess: (result) => settle(bunchId, result.plan),
  });
}

export function useResetBunch(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: () => cashSapApi.reset(bunchId),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useOverrideVoucher(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: ({ entryId, payload }: { entryId: number; payload: VoucherOverridePayload }) =>
      cashSapApi.overrideVoucher(bunchId, entryId, payload),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useLeaveOutVoucher(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: number; reason: string }) =>
      cashSapApi.leaveOut(bunchId, entryId, reason),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

export function useRedateGrpo(bunchId: number) {
  const settle = useSettlePlan();
  return useMutation({
    mutationFn: ({ grpoId, payload }: { grpoId: number; payload: GrpoRedatePayload }) =>
      cashSapApi.redateGrpo(bunchId, grpoId, payload),
    onSuccess: (plan) => settle(bunchId, plan),
  });
}

// ---------------------------------------------------------------------------
// Writes on one voucher, and the settings.
// ---------------------------------------------------------------------------

export function useUpdateVoucherInfo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ entryId, payload }: { entryId: number; payload: VoucherInfoPayload }) =>
      cashSapApi.updateVoucherInfo(entryId, payload),
    onSuccess: invalidate,
  });
}

export function useAttachVoucherBill() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ entryId, file }: { entryId: number; file: File }) =>
      cashSapApi.attachBill(entryId, file),
    onSuccess: invalidate,
  });
}

export function useRemoveVoucherBill() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (billId: number) => cashSapApi.removeBill(billId),
    onSuccess: invalidate,
  });
}

export function useSaveRouting() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ branchId, payload }: { branchId: number; payload: RoutingPayload }) =>
      cashSapApi.saveRouting(branchId, payload),
    onSuccess: invalidate,
  });
}

export function useSaveGLMapRow() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ rowId, payload }: { rowId?: number; payload: GLItemMapPayload }) =>
      rowId != null
        ? cashSapApi.updateGlMapRow(rowId, payload)
        : cashSapApi.createGlMapRow(payload),
    onSuccess: invalidate,
  });
}

export function useRetireGLMapRow() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (rowId: number) => cashSapApi.retireGlMapRow(rowId),
    onSuccess: invalidate,
  });
}
