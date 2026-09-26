import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type BudgetPayload,
  type JournalEntryFilters,
  type LedgerFilters,
  sapFinanceApi,
} from './sap-finance.api';

/** Every query key this module owns. A mutation invalidates every list that shows its rows. */
const KEYS = {
  journalEntries: (filters: JournalEntryFilters) => ['sapFinance', 'journalEntries', filters] as const,
  ledger: (filters: LedgerFilters) => ['sapFinance', 'ledger', filters] as const,
  ledgerAccounts: (search: string) => ['sapFinance', 'ledgerAccounts', search] as const,
  chart: (search: string, drawer?: number) => ['sapFinance', 'chart', search, drawer] as const,
  budgets: ['sapFinance', 'budgets'] as const,
  budget: (docEntry: number) => ['sapFinance', 'budgets', docEntry] as const,
  budgetChanges: (docEntry?: number) => ['sapFinance', 'budgetChanges', docEntry ?? 'all'] as const,
  costingCodes: (dimension: number) => ['sapFinance', 'costingCodes', dimension] as const,
};

export function useJournalEntries(filters: JournalEntryFilters, enabled = true) {
  return useQuery({
    queryKey: KEYS.journalEntries(filters),
    queryFn: () => sapFinanceApi.journalEntries(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useGeneralLedger(filters: LedgerFilters) {
  return useQuery({
    queryKey: KEYS.ledger(filters),
    queryFn: () => sapFinanceApi.generalLedger(filters),
    enabled: !!filters.account,
    placeholderData: keepPreviousData,
  });
}

export function useLedgerAccountSearch(search: string) {
  return useQuery({
    queryKey: KEYS.ledgerAccounts(search),
    queryFn: () => sapFinanceApi.ledgerAccounts(search),
    enabled: search.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useChartOfAccounts(search: string, drawer?: number) {
  return useQuery({
    queryKey: KEYS.chart(search, drawer),
    queryFn: () => sapFinanceApi.chartOfAccounts(search, drawer),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useBudgets(enabled = true) {
  return useQuery({ queryKey: KEYS.budgets, queryFn: sapFinanceApi.budgets, enabled });
}

export function useBudget(docEntry: number | null) {
  return useQuery({
    queryKey: KEYS.budget(docEntry ?? 0),
    queryFn: () => sapFinanceApi.budget(docEntry as number),
    enabled: docEntry !== null,
  });
}

export function useBudgetChanges(docEntry?: number) {
  return useQuery({
    queryKey: KEYS.budgetChanges(docEntry),
    queryFn: () => sapFinanceApi.budgetChanges(docEntry),
  });
}

/** Budget heads are cost dimension 3, sub-budgets dimension 4 (SAP Portal's rule). */
export function useCostingCodes(dimension: number, enabled = true) {
  return useQuery({
    queryKey: KEYS.costingCodes(dimension),
    queryFn: () => sapFinanceApi.costingCodes(dimension),
    enabled,
    staleTime: 10 * 60_000,
  });
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: KEYS.budgets });
    void queryClient.invalidateQueries({ queryKey: ['sapFinance', 'budgetChanges'] });
  };
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (payload: BudgetPayload) => sapFinanceApi.createBudget(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ docEntry, payload }: { docEntry: number; payload: BudgetPayload }) =>
      sapFinanceApi.updateBudget(docEntry, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (docEntry: number) => sapFinanceApi.deleteBudget(docEntry),
    onSuccess: invalidate,
  });
}
