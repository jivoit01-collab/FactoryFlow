import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BudgetApprovalFilters,
  BudgetApprovalReportResponse,
  ColumnValuesResponse,
} from '../types';

const EP = API_ENDPOINTS.BUDGET_APPROVALS;

function baseParams(filters: BudgetApprovalFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.branch) params.branch = filters.branch;
  if (filters.effect_month) params.effect_month = filters.effect_month;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (Object.keys(filters.column_filters).length) {
    params.column_filters = JSON.stringify(filters.column_filters);
  }
  return params;
}

export const budgetApprovalsApi = {
  async getReport(filters: BudgetApprovalFilters): Promise<BudgetApprovalReportResponse> {
    const params = baseParams(filters);
    params.page = filters.page;
    params.page_size = filters.page_size;
    if (filters.sort_by) {
      params.sort_by = filters.sort_by;
      params.sort_dir = filters.sort_dir;
    }

    const response = await apiClient.get<BudgetApprovalReportResponse>(EP.REPORT, {
      params,
    });
    return response.data;
  },

  async getColumnValues(
    field: string,
    filters: BudgetApprovalFilters,
  ): Promise<ColumnValuesResponse> {
    const params = baseParams(filters);
    params.field = field;

    const response = await apiClient.get<ColumnValuesResponse>(EP.COLUMN_VALUES, {
      params,
    });
    return response.data;
  },
};
