import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  DepartmentOption,
  DepartmentSalary,
  DepartmentSalaryPayload,
  ExpenseBoard,
  FactoryExpenseSettings,
  LabourRate,
  LabourRatePayload,
  MonthlyBudgetPayload,
  MonthlyBudgetRow,
} from '../types';

const EP = API_ENDPOINTS.FACTORY_EXPENSE;

export const factoryExpenseApi = {
  /** The whole wall for one day. `date` omitted means today, server-side. */
  async getBoard(date?: string): Promise<ExpenseBoard> {
    const response = await apiClient.get<ExpenseBoard>(EP.BOARD, {
      params: date ? { date } : undefined,
    });
    return response.data;
  },

  async getSettings(): Promise<FactoryExpenseSettings> {
    const response = await apiClient.get<FactoryExpenseSettings>(EP.SETTINGS);
    return response.data;
  },

  async updateSettings(
    payload: Partial<FactoryExpenseSettings>,
  ): Promise<FactoryExpenseSettings> {
    const response = await apiClient.patch<FactoryExpenseSettings>(EP.SETTINGS, payload);
    return response.data;
  },

  async getDepartments(): Promise<DepartmentOption[]> {
    const response = await apiClient.get<DepartmentOption[]>(EP.DEPARTMENTS);
    return response.data;
  },

  // ---- labour rates ----

  async getLabourRates(): Promise<LabourRate[]> {
    const response = await apiClient.get<LabourRate[]>(EP.LABOUR_RATES);
    return response.data;
  },

  async createLabourRate(payload: Partial<LabourRatePayload>): Promise<LabourRate> {
    const response = await apiClient.post<LabourRate>(EP.LABOUR_RATES, payload);
    return response.data;
  },

  async updateLabourRate(
    id: number,
    payload: Partial<LabourRatePayload>,
  ): Promise<LabourRate> {
    const response = await apiClient.patch<LabourRate>(EP.LABOUR_RATE_DETAIL(id), payload);
    return response.data;
  },

  async retireLabourRate(id: number): Promise<void> {
    await apiClient.delete(EP.LABOUR_RATE_DETAIL(id));
  },

  // ---- department salaries ----

  async getDepartmentSalaries(month?: string): Promise<DepartmentSalary[]> {
    const response = await apiClient.get<DepartmentSalary[]>(EP.DEPARTMENT_SALARIES, {
      params: month ? { month } : undefined,
    });
    return response.data;
  },

  async createDepartmentSalary(
    payload: Partial<DepartmentSalaryPayload>,
  ): Promise<DepartmentSalary> {
    const response = await apiClient.post<DepartmentSalary>(
      EP.DEPARTMENT_SALARIES,
      payload,
    );
    return response.data;
  },

  async updateDepartmentSalary(
    id: number,
    payload: Partial<DepartmentSalaryPayload>,
  ): Promise<DepartmentSalary> {
    const response = await apiClient.patch<DepartmentSalary>(
      EP.DEPARTMENT_SALARY_DETAIL(id),
      payload,
    );
    return response.data;
  },

  async retireDepartmentSalary(id: number): Promise<void> {
    await apiClient.delete(EP.DEPARTMENT_SALARY_DETAIL(id));
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
