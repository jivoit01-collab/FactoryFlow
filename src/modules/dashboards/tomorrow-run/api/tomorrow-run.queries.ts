import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { TOMORROW_RUN_STALE_TIME } from '../constants';
import type { ChoiceBody, PlanEnvelope } from '../types';
import { tomorrowRunApi } from './tomorrow-run.api';

// Every key carries the company: the plan is one company's machines.
export const TOMORROW_RUN_QUERY_KEYS = {
  all: ['tomorrow-run'] as const,
  plan: (companyId?: number | string) =>
    [...TOMORROW_RUN_QUERY_KEYS.all, 'plan', companyId] as const,
  sheets: (companyId?: number | string) =>
    [...TOMORROW_RUN_QUERY_KEYS.all, 'sheets', companyId] as const,
};

function retry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useTomorrowRunPlan() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: TOMORROW_RUN_QUERY_KEYS.plan(currentCompany?.company_id),
    queryFn: () => tomorrowRunApi.getPlan(),
    staleTime: TOMORROW_RUN_STALE_TIME,
    retry,
  });
}

/** A pick answers with the whole re-timed plan, so it goes straight into the cache. */
function useWritesPlan<T>(fn: (arg: T) => Promise<PlanEnvelope>) {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(TOMORROW_RUN_QUERY_KEYS.plan(currentCompany?.company_id), data);
    },
  });
}

export function useChoose() {
  return useWritesPlan((body: ChoiceBody) => tomorrowRunApi.choose(body));
}

export function useRebuild() {
  return useWritesPlan<void>(() => tomorrowRunApi.rebuild());
}

export function usePlanningSheets(enabled: boolean) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: TOMORROW_RUN_QUERY_KEYS.sheets(currentCompany?.company_id),
    queryFn: () => tomorrowRunApi.listSheets(),
    enabled,
    retry,
  });
}

export function usePutInSheet() {
  const { currentCompany } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, stockDate }: { file: File; stockDate?: string }) =>
      tomorrowRunApi.putInSheet(file, stockDate),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: TOMORROW_RUN_QUERY_KEYS.sheets(currentCompany?.company_id),
      });
    },
  });
}
