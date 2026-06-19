import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import {
  DISPATCH_PIPELINE_REFETCH_INTERVAL,
  DISPATCH_PIPELINE_STALE_TIME,
} from '../constants';
import type { DispatchPipelineFilters } from '../types';
import { dispatchPipelineApi } from './dispatch-pipeline.api';

export const DISPATCH_PIPELINE_QUERY_KEYS = {
  all: ['dispatch-pipeline'] as const,
  board: (filters: DispatchPipelineFilters, companyId?: number | string) =>
    [
      ...DISPATCH_PIPELINE_QUERY_KEYS.all,
      'board',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search,
        stage: filters.stage,
      },
    ] as const,
};

function retry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useDispatchPipelineBoard(filters: DispatchPipelineFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: DISPATCH_PIPELINE_QUERY_KEYS.board(filters, currentCompany?.company_id),
    queryFn: () => dispatchPipelineApi.getBoard(filters),
    staleTime: DISPATCH_PIPELINE_STALE_TIME,
    refetchInterval: DISPATCH_PIPELINE_REFETCH_INTERVAL,
    retry,
    enabled: !!filters.date_from && !!filters.date_to,
  });
}
