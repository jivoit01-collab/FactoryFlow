import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import type { TransferRequest, WarehouseStockFilters } from '../types';
import { productionMovementsApi } from './production-movements.api';

const STALE_TIME = 60_000;

export const PRODUCTION_MOVEMENTS_QUERY_KEYS = {
  all: ['production-movements'] as const,

  warehouseRoles: (companyId?: number | string) =>
    [...PRODUCTION_MOVEMENTS_QUERY_KEYS.all, 'warehouse-roles', companyId] as const,

  stockBoard: (companyId?: number | string) =>
    [...PRODUCTION_MOVEMENTS_QUERY_KEYS.all, 'stock-board', companyId] as const,

  warehouseStock: (
    whsCode: string,
    filters: WarehouseStockFilters,
    companyId?: number | string,
  ) =>
    [
      ...PRODUCTION_MOVEMENTS_QUERY_KEYS.all,
      'warehouse-stock',
      companyId,
      whsCode,
      filters,
    ] as const,

  transferOptions: (companyId?: number | string) =>
    [...PRODUCTION_MOVEMENTS_QUERY_KEYS.all, 'transfer-options', companyId] as const,

  movements: (
    params: { movement_type?: string; status?: string },
    companyId?: number | string,
  ) => [...PRODUCTION_MOVEMENTS_QUERY_KEYS.all, 'movements', companyId, params] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useWarehouseRoles() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.warehouseRoles(currentCompany?.company_id),
    queryFn: () => productionMovementsApi.getWarehouseRoles(),
    staleTime: STALE_TIME,
    retry: sapRetry,
  });
}

export function useProductionStockBoard() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.stockBoard(currentCompany?.company_id),
    queryFn: () => productionMovementsApi.getStockBoard(),
    staleTime: STALE_TIME,
    retry: sapRetry,
  });
}

export function useWarehouseStock(
  whsCode: string,
  filters: WarehouseStockFilters,
  enabled = true,
) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.warehouseStock(
      whsCode,
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => productionMovementsApi.getWarehouseStock(whsCode, filters),
    enabled: enabled && Boolean(whsCode),
    staleTime: STALE_TIME,
    retry: sapRetry,
  });
}

export function useTransferOptions() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.transferOptions(currentCompany?.company_id),
    queryFn: () => productionMovementsApi.getTransferOptions(),
    staleTime: STALE_TIME,
    retry: sapRetry,
  });
}

export function useMovements(params: { movement_type?: string; status?: string } = {}) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.movements(params, currentCompany?.company_id),
    queryFn: () => productionMovementsApi.getMovements(params),
    staleTime: STALE_TIME,
    retry: sapRetry,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferRequest) => productionMovementsApi.createTransfer(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_MOVEMENTS_QUERY_KEYS.all });
    },
  });
}
