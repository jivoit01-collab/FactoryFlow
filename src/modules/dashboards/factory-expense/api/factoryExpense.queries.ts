import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { BOARD_STALE_TIME, CONFIG_STALE_TIME, DEFAULT_REFRESH_MS } from '../constants';
import type { FactoryExpenseSettings, MonthlyBudgetPayload } from '../types';
import { factoryExpenseApi } from './factoryExpense.api';

export const FACTORY_EXPENSE_KEYS = {
  all: ['factory-expense'] as const,
  board: (date: string | undefined, companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'board', companyId, date ?? 'today'] as const,
  settings: (companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'settings', companyId] as const,
  rates: (date: string | undefined, companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'rates', companyId, date ?? 'today'] as const,
  budgets: (month: string | undefined, companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'budgets', companyId, month ?? 'all'] as const,
};

/**
 * The wall board, polling itself.
 *
 * The poll interval comes from the board's own settings once the first
 * response lands, so an admin can slow a screen down without a release. Until
 * then it uses the module default rather than hammering the server while the
 * settings are still unknown.
 */
export function useExpenseBoard(date?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.board(date, currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getBoard(date),
    staleTime: BOARD_STALE_TIME,
    refetchInterval: (query) => {
      const seconds = query.state.data?.settings?.refresh_seconds;
      return seconds ? seconds * 1000 : DEFAULT_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
  });
}

export function useExpenseSettings() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.settings(currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getSettings(),
    staleTime: CONFIG_STALE_TIME,
  });
}

/**
 * The Cost Master rows behind the board's labour and salary numbers.
 *
 * Read-only — there is no matching mutation. Somebody who wants to change a
 * rate is sent to Admin > Cost Master, which is the only place one is set.
 */
export function useResolvedRates(date?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.rates(date, currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getResolvedRates(date),
    staleTime: CONFIG_STALE_TIME,
  });
}

export function useMonthlyBudgets(month?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.budgets(month, currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getBudgets(month),
    staleTime: CONFIG_STALE_TIME,
  });
}

/**
 * Every configuration write invalidates the whole module, board included.
 *
 * Changing a rate changes what the wall says, so refreshing only the tab the
 * user is looking at would leave the board quoting the old number until its
 * next poll — and the first thing anyone does after setting a rate is walk over
 * and check the wall.
 */
function useConfigMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FACTORY_EXPENSE_KEYS.all });
    },
  });
}

export function useSaveSettings() {
  return useConfigMutation((payload: Partial<FactoryExpenseSettings>) =>
    factoryExpenseApi.updateSettings(payload),
  );
}

export function useSaveBudget() {
  return useConfigMutation(
    ({ id, payload }: { id?: number; payload: Partial<MonthlyBudgetPayload> }) =>
      id ? factoryExpenseApi.updateBudget(id, payload) : factoryExpenseApi.createBudget(payload),
  );
}

export function useRetireBudget() {
  return useConfigMutation((id: number) => factoryExpenseApi.retireBudget(id));
}
