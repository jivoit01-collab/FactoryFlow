import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  costMasterApi,
  type CostRateListParams,
  type CostRateUpsertRequest,
  type CostTypeCreateRequest,
  type CostTypeUpdateRequest,
} from './costMaster.api';

export const COST_MASTER_QUERY_KEYS = {
  all: ['costMaster'] as const,
  costTypes: (includeInactive?: boolean) =>
    [...COST_MASTER_QUERY_KEYS.all, 'costTypes', includeInactive ?? false] as const,
  rates: (params?: CostRateListParams) => [...COST_MASTER_QUERY_KEYS.all, 'rates', params] as const,
};

function invalidateCostMaster(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: COST_MASTER_QUERY_KEYS.all });
}

export function useCostTypes(includeInactive?: boolean) {
  return useQuery({
    queryKey: COST_MASTER_QUERY_KEYS.costTypes(includeInactive),
    queryFn: () => costMasterApi.getCostTypes(includeInactive),
    staleTime: 60 * 1000,
  });
}

export function useCostMasterRates(params?: CostRateListParams) {
  return useQuery({
    queryKey: COST_MASTER_QUERY_KEYS.rates(params),
    queryFn: () => costMasterApi.getRates(params),
    staleTime: 15 * 1000,
  });
}

export function useOrgDepartments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...COST_MASTER_QUERY_KEYS.all, 'orgDepartments'] as const,
    queryFn: () => costMasterApi.getDepartments(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCostType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CostTypeCreateRequest) => costMasterApi.createCostType(data),
    onSuccess: () => invalidateCostMaster(queryClient),
  });
}

export function useUpdateCostType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CostTypeUpdateRequest }) =>
      costMasterApi.updateCostType(id, data),
    onSuccess: () => invalidateCostMaster(queryClient),
  });
}

export function useDeleteCostType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => costMasterApi.deleteCostType(id),
    onSuccess: () => invalidateCostMaster(queryClient),
  });
}

export function useUpsertCostMasterRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CostRateUpsertRequest) => costMasterApi.upsertRate(data),
    onSuccess: () => invalidateCostMaster(queryClient),
  });
}

export function useDeleteCostMasterRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => costMasterApi.deleteRate(id),
    onSuccess: () => invalidateCostMaster(queryClient),
  });
}
