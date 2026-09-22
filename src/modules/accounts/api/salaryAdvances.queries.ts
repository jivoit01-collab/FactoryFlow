import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import {
  type DecideSalaryAdvancePayload,
  type RecordSalaryAdvancePayload,
  type SalaryAdvanceListParams,
  salaryAdvancesApi,
} from './salaryAdvances.api';

/**
 * Keyed on the company, like the rest of the cash book: each has its own box,
 * its own register and its own advances, and the company switcher must not
 * leave one company's list on screen under another's name.
 */
export const SALARY_ADVANCE_QUERY_KEYS = {
  all: ['salary-advances'] as const,
  list: (companyId: number | string | undefined, params?: SalaryAdvanceListParams) =>
    [...SALARY_ADVANCE_QUERY_KEYS.all, 'list', companyId, params ?? {}] as const,
  employees: (companyId: number | string | undefined, search: string) =>
    [...SALARY_ADVANCE_QUERY_KEYS.all, 'employees', companyId, search] as const,
};

export function useSalaryAdvances(params?: SalaryAdvanceListParams) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALARY_ADVANCE_QUERY_KEYS.list(currentCompany?.company_id, params),
    queryFn: () => salaryAdvancesApi.list(params),
  });
}

/**
 * The payroll, for the picker that names who an advance was for.
 *
 * Searched on the server because a factory's roll is thousands of names, and
 * long-lived because it changes when somebody is hired, not while a dialog is
 * open.
 */
export function useSalaryAdvanceEmployees(search = '', enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALARY_ADVANCE_QUERY_KEYS.employees(currentCompany?.company_id, search),
    queryFn: () => salaryAdvancesApi.employees(search),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Every write invalidates the whole list.
 *
 * A verdict changes the row's state and the totals above it together, and the
 * summary is counted over the whole book rather than the rows on show — so
 * there is no smaller invalidation that leaves the screen telling the truth.
 */
function useSalaryAdvanceMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SALARY_ADVANCE_QUERY_KEYS.all });
    },
  });
}

export function useRecordSalaryAdvance() {
  return useSalaryAdvanceMutation((payload: RecordSalaryAdvancePayload) =>
    salaryAdvancesApi.record(payload),
  );
}

/** HR's verdict. Several at once, each carrying its own. */
export function useDecideSalaryAdvances() {
  return useSalaryAdvanceMutation((payload: DecideSalaryAdvancePayload) =>
    salaryAdvancesApi.decide(payload),
  );
}
