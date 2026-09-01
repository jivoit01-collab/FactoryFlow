import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PRODUCTION_WALL_REFRESH_MS } from '../constants/production-wall.constants';
import { reconciliationApi,type ReconParams } from './reconciliation.api';

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404 || status === 502 || status === 503) {
    return false;
  }
  return failureCount < 1;
}

export function useProductionReconciliation(params: ReconParams) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['prod-recon', 'production', currentCompany?.company_id, params],
    queryFn: () => reconciliationApi.production(params),
    staleTime: PRODUCTION_WALL_REFRESH_MS,
    refetchInterval: PRODUCTION_WALL_REFRESH_MS,
    retry: sapRetry,
    enabled: !!params.date_from && !!params.date_to,
  });
}

export function useMaterialReconciliation(params: ReconParams) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['prod-recon', 'material', currentCompany?.company_id, params],
    queryFn: () => reconciliationApi.material(params),
    staleTime: PRODUCTION_WALL_REFRESH_MS,
    refetchInterval: PRODUCTION_WALL_REFRESH_MS,
    retry: sapRetry,
    enabled: !!params.date_from && !!params.date_to,
  });
}

export function useWastageReconciliation(params: ReconParams) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['prod-recon', 'wastage', currentCompany?.company_id, params],
    queryFn: () => reconciliationApi.wastage(params),
    staleTime: PRODUCTION_WALL_REFRESH_MS,
    refetchInterval: PRODUCTION_WALL_REFRESH_MS,
    retry: sapRetry,
    enabled: !!params.date_from && !!params.date_to,
  });
}
