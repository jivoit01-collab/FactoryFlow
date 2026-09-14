import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ExpenseMatrix } from '../types';

const EP = API_ENDPOINTS.FACTORY_EXPENSE;

export const companyExpenseApi = {
  /**
   * The company × bucket grid for a span of days.
   *
   * No `scope` parameter, deliberately: the server always answers for every
   * company the viewer holds. Narrowing to one would move cost into the shared
   * row purely because the viewer cannot see the company that owns it.
   */
  async getMatrix(dateFrom: string, dateTo: string): Promise<ExpenseMatrix> {
    const response = await apiClient.get<ExpenseMatrix>(EP.MATRIX, {
      params: { from: dateFrom, to: dateTo },
    });
    return response.data;
  },
};
