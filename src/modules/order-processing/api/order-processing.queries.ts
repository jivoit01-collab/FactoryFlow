import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { getErrorMessage } from '@/shared/utils';

import type { OrderFilters } from './order-processing.api';
import { orderProcessingApi } from './order-processing.api';

export const OP_KEYS = {
  all: ['order-processing'] as const,
  dashboard: (c?: number | string) => [...OP_KEYS.all, 'dashboard', c] as const,
  orders: (f: OrderFilters, c?: number | string) => [...OP_KEYS.all, 'orders', c, f] as const,
  order: (id: number, c?: number | string) => [...OP_KEYS.all, 'order', c, id] as const,
  timeline: (id: number, c?: number | string) => [...OP_KEYS.all, 'timeline', c, id] as const,
  production: (s: string, c?: number | string) => [...OP_KEYS.all, 'production', c, s] as const,
  materials: (short: boolean, c?: number | string) => [...OP_KEYS.all, 'materials', c, short] as const,
  procurement: (s: string, c?: number | string) => [...OP_KEYS.all, 'procurement', c, s] as const,
  lineIssues: (i: string, c?: number | string) => [...OP_KEYS.all, 'line-issues', c, i] as const,
  sync: (c?: number | string) => [...OP_KEYS.all, 'sync', c] as const,
};

// The mirror only moves when the sync job runs, so a short stale time would just
// add requests without adding truth.
const STALE = 2 * 60 * 1000;

export function useOpDashboard() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.dashboard(currentCompany?.company_id),
    queryFn: () => orderProcessingApi.dashboard(),
    staleTime: STALE,
  });
}

export function useOpOrders(filters: OrderFilters) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.orders(filters, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.orders(filters),
    staleTime: STALE,
  });
}

export function useOpOrder(id?: number) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.order(id ?? 0, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.order(id!),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

export function useOpTimeline(id?: number) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.timeline(id ?? 0, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.timeline(id!),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

export function useOpProduction(status = 'open') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.production(status, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.production(status),
    staleTime: STALE,
  });
}

export function useOpMaterials(shortOnly = true) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.materials(shortOnly, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.materials(shortOnly),
    staleTime: STALE,
  });
}

export function useOpProcurement(status = 'open') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.procurement(status, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.procurement(status),
    staleTime: STALE,
  });
}

export function useOpLineIssues(issue = 'NO_WAREHOUSE') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.lineIssues(issue, currentCompany?.company_id),
    queryFn: () => orderProcessingApi.lineIssues(issue),
    staleTime: STALE,
  });
}

export function useOpSyncStatus() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OP_KEYS.sync(currentCompany?.company_id),
    queryFn: () => orderProcessingApi.syncStatus(),
    staleTime: STALE,
  });
}

function useOpMutation<TArgs>(fn: (a: TArgs) => Promise<unknown>, ok: string, fallback: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void queryClient.invalidateQueries({ queryKey: OP_KEYS.all });
    },
    onError: (e) => toast.error(getErrorMessage(e, fallback)),
  });
}

export function useOpSync() {
  return useOpMutation(
    (full: boolean) => orderProcessingApi.sync(full),
    'Orders pulled from OMS.',
    'Could not reach OMS.',
  );
}

export function useOpCheckStock() {
  return useOpMutation(
    (id: number) => orderProcessingApi.checkStock(id),
    'Stock checked.',
    'Could not check stock.',
  );
}

export function useOpPlanMaterials() {
  return useOpMutation(
    (bomDepth: number) => orderProcessingApi.planMaterials(bomDepth),
    'BOMs exploded and procurement replanned.',
    'Could not plan materials.',
  );
}
