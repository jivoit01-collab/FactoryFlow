import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { BOARD_STALE_TIME, CONFIG_STALE_TIME, DEFAULT_REFRESH_MS } from '../constants';
import type {
  DepartmentSalaryPayload,
  FactoryExpenseSettings,
  LabourRatePayload,
  MonthlyBudgetPayload,
} from '../types';
import { factoryExpenseApi } from './factoryExpense.api';

export const FACTORY_EXPENSE_KEYS = {
  all: ['factory-expense'] as const,
  board: (date: string | undefined, companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'board', companyId, date ?? 'today'] as const,
  settings: (companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'settings', companyId] as const,
  departments: (companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'departments', companyId] as const,
  labourRates: (companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'labour-rates', companyId] as const,
  salaries: (month: string | undefined, companyId?: number | string) =>
    [...FACTORY_EXPENSE_KEYS.all, 'salaries', companyId, month ?? 'all'] as const,
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

export function useExpenseDepartments() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.departments(currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getDepartments(),
    staleTime: 5 * 60_000,
  });
}

export function useLabourRates() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.labourRates(currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getLabourRates(),
    staleTime: CONFIG_STALE_TIME,
  });
}

export function useDepartmentSalaries(month?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: FACTORY_EXPENSE_KEYS.salaries(month, currentCompany?.company_id),
    queryFn: () => factoryExpenseApi.getDepartmentSalaries(month),
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

export function useSaveLabourRate() {
  return useConfigMutation(
    ({ id, payload }: { id?: number; payload: Partial<LabourRatePayload> }) =>
      id
        ? factoryExpenseApi.updateLabourRate(id, payload)
        : factoryExpenseApi.createLabourRate(payload),
  );
}

export function useRetireLabourRate() {
  return useConfigMutation((id: number) => factoryExpenseApi.retireLabourRate(id));
}

export function useSaveDepartmentSalary() {
  return useConfigMutation(
    ({ id, payload }: { id?: number; payload: Partial<DepartmentSalaryPayload> }) =>
      id
        ? factoryExpenseApi.updateDepartmentSalary(id, payload)
        : factoryExpenseApi.createDepartmentSalary(payload),
  );
}

export function useRetireDepartmentSalary() {
  return useConfigMutation((id: number) => factoryExpenseApi.retireDepartmentSalary(id));
}

export function useSaveBudget() {
  return useConfigMutation(
    ({ id, payload }: { id?: number; payload: Partial<MonthlyBudgetPayload> }) =>
      id
        ? factoryExpenseApi.updateBudget(id, payload)
        : factoryExpenseApi.createBudget(payload),
  );
}

export function useRetireBudget() {
  return useConfigMutation((id: number) => factoryExpenseApi.retireBudget(id));
}
