import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  expenseClaimsApi,
  type ExpenseListParams,
  type SubmitExpensePayload,
} from './expenseClaims.api';

/**
 * Expenses are common to every company, so nothing here is keyed on the one
 * selected in the header. The SAP pickers are keyed on the company the entry
 * page names instead.
 */
export const EXPENSE_CLAIM_QUERY_KEYS = {
  all: ['expense-claims'] as const,
  list: (params: ExpenseListParams) => [...EXPENSE_CLAIM_QUERY_KEYS.all, 'list', params] as const,
  companies: () => [...EXPENSE_CLAIM_QUERY_KEYS.all, 'companies'] as const,
  budgets: (company: string) => [...EXPENSE_CLAIM_QUERY_KEYS.all, 'budgets', company] as const,
  glAccounts: (company: string, search: string) =>
    [...EXPENSE_CLAIM_QUERY_KEYS.all, 'gl-accounts', company, search] as const,
  approvers: () => [...EXPENSE_CLAIM_QUERY_KEYS.all, 'approvers'] as const,
};

export function useExpenseClaims(params: ExpenseListParams) {
  return useQuery({
    queryKey: EXPENSE_CLAIM_QUERY_KEYS.list(params),
    queryFn: () => expenseClaimsApi.list(params),
  });
}

export function useExpenseCompanies() {
  return useQuery({
    queryKey: EXPENSE_CLAIM_QUERY_KEYS.companies(),
    queryFn: () => expenseClaimsApi.companies(),
    staleTime: 60 * 60 * 1000,
  });
}

/** A company's SAP business places. A handful of rows, read whole and kept a while. */
export function useExpenseBudgets(company: string) {
  return useQuery({
    queryKey: EXPENSE_CLAIM_QUERY_KEYS.budgets(company),
    queryFn: () => expenseClaimsApi.budgets(company),
    enabled: company !== '',
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** A company's chart of accounts, searched on the server as you type. */
export function useSapGLAccounts(company: string, search: string) {
  return useQuery({
    queryKey: EXPENSE_CLAIM_QUERY_KEYS.glAccounts(company, search),
    queryFn: () => expenseClaimsApi.glAccounts(company, search),
    enabled: company !== '',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Everyone an expense may go to: every active user but the caller. */
export function useExpenseApprovers() {
  return useQuery({
    queryKey: EXPENSE_CLAIM_QUERY_KEYS.approvers(),
    queryFn: () => expenseClaimsApi.approvers(),
    staleTime: 10 * 60 * 1000,
  });
}

/** Every write invalidates every list: a new expense or a verdict moves the counts. */
function useExpenseClaimMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...EXPENSE_CLAIM_QUERY_KEYS.all, 'list'] });
    },
  });
}

export function useSubmitExpense() {
  return useExpenseClaimMutation((payload: SubmitExpensePayload) =>
    expenseClaimsApi.submit(payload),
  );
}

export function useUpdateExpense() {
  return useExpenseClaimMutation((vars: { id: number; payload: SubmitExpensePayload }) =>
    expenseClaimsApi.update(vars.id, vars.payload),
  );
}

export function useDecideExpense() {
  return useExpenseClaimMutation((vars: { id: number; approve: boolean; note?: string }) =>
    expenseClaimsApi.decide(vars.id, vars.approve, vars.note ?? ''),
  );
}
