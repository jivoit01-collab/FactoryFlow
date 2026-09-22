import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type DecideSalaryAdvancePayload,
  type RecordSalaryAdvancePayload,
  type SalaryAdvanceListParams,
  salaryAdvancesApi,
} from './salaryAdvances.api';

export const SALARY_ADVANCE_QUERY_KEYS = {
  all: ['salary-advances'] as const,
  list: (params?: SalaryAdvanceListParams) =>
    [...SALARY_ADVANCE_QUERY_KEYS.all, 'list', params ?? {}] as const,
  employees: (search: string) =>
    [...SALARY_ADVANCE_QUERY_KEYS.all, 'employees', search] as const,
};

export function useSalaryAdvances(params?: SalaryAdvanceListParams) {
  return useQuery({
    queryKey: SALARY_ADVANCE_QUERY_KEYS.list(params),
    queryFn: () => salaryAdvancesApi.list(params),
  });
}

/**
 * The payroll, for the picker.
 *
 * Searched on the server because a factory's roll is thousands of names, and
 * long-lived because it changes when somebody is hired, not while a form is
 * open.
 */
export function useSalaryAdvanceEmployees(search = '') {
  return useQuery({
    queryKey: SALARY_ADVANCE_QUERY_KEYS.employees(search),
    queryFn: () => salaryAdvancesApi.employees(search),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Every write invalidates the whole list.
 *
 * The screen's figures are summed over the book rather than the rows on show,
 * so a verdict on one advance moves the headline totals above every tab —
 * there is no smaller correct invalidation.
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

export function useUpdateSalaryAdvance() {
  return useSalaryAdvanceMutation(
    (vars: { id: number; payload: Partial<RecordSalaryAdvancePayload> }) =>
      salaryAdvancesApi.update(vars.id, vars.payload),
  );
}

export function useCancelSalaryAdvance() {
  return useSalaryAdvanceMutation((id: number) => salaryAdvancesApi.cancel(id));
}

/** HR's verdict. Several at once, each carrying its own. */
export function useDecideSalaryAdvances() {
  return useSalaryAdvanceMutation((payload: DecideSalaryAdvancePayload) =>
    salaryAdvancesApi.decide(payload),
  );
}

export function useMarkSalaryAdvanceDeducted() {
  return useSalaryAdvanceMutation((vars: { id: number; deductedOn?: string }) =>
    salaryAdvancesApi.markDeducted(vars.id, vars.deductedOn),
  );
}

export function useUndoSalaryAdvanceDeduction() {
  return useSalaryAdvanceMutation((id: number) => salaryAdvancesApi.undoDeduction(id));
}
