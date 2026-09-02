import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ExpenseBoard,
  FactoryExpenseSettings,
  MonthlyBudgetPayload,
  MonthlyBudgetRow,
  ResolvedRates,
} from '../types';

const EP = API_ENDPOINTS.FACTORY_EXPENSE;

export const factoryExpenseApi = {
  /**
   * The whole wall for a span of days.
   *
   * Both ends omitted means today, server-side — the board's normal state is a
   * single day, not a range.
   */
  async getBoard(dateFrom?: string, dateTo?: string): Promise<ExpenseBoard> {
    const params = dateFrom || dateTo ? { from: dateFrom, to: dateTo ?? dateFrom } : undefined;
    const response = await apiClient.get<ExpenseBoard>(EP.BOARD, { params });
    return response.data;
  },

  async getSettings(): Promise<FactoryExpenseSettings> {
    const response = await apiClient.get<FactoryExpenseSettings>(EP.SETTINGS);
    return response.data;
  },

  async updateSettings(payload: Partial<FactoryExpenseSettings>): Promise<FactoryExpenseSettings> {
    const response = await apiClient.patch<FactoryExpenseSettings>(EP.SETTINGS, payload);
    return response.data;
  },

  /**
   * The Cost Master rows the board would price with on `date`.
   *
   * Read-only: there is no create/update counterpart here by design. A rate is
   * changed in Admin > Cost Master so there is exactly one place it can be set.
   */
  async getResolvedRates(date?: string): Promise<ResolvedRates> {
    const response = await apiClient.get<ResolvedRates>(EP.RATES, {
      params: date ? { date } : undefined,
    });
    return response.data;
  },

  // ---- budgets ----

  async getBudgets(month?: string): Promise<MonthlyBudgetRow[]> {
    const response = await apiClient.get<MonthlyBudgetRow[]>(EP.BUDGETS, {
      params: month ? { month } : undefined,
    });
    return response.data;
  },

  async createBudget(payload: Partial<MonthlyBudgetPayload>): Promise<MonthlyBudgetRow> {
    const response = await apiClient.post<MonthlyBudgetRow>(EP.BUDGETS, payload);
    return response.data;
  },

  async updateBudget(
    id: number,
    payload: Partial<MonthlyBudgetPayload>,
  ): Promise<MonthlyBudgetRow> {
    const response = await apiClient.patch<MonthlyBudgetRow>(EP.BUDGET_DETAIL(id), payload);
    return response.data;
  },

  async retireBudget(id: number): Promise<void> {
    await apiClient.delete(EP.BUDGET_DETAIL(id));
  },
};
