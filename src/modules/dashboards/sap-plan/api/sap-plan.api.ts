import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  DetailsResponse,
  PlanDashboardFilters,
  ProcurementResponse,
  SKUDetailResponse,
  SummaryResponse,
} from '../types';

const EP = API_ENDPOINTS.SAP_PLAN_DASHBOARD;

export const sapPlanApi = {
  async getSummary(filters?: PlanDashboardFilters): Promise<SummaryResponse> {
    const response = await apiClient.get<SummaryResponse>(EP.SUMMARY, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async getDetails(filters?: PlanDashboardFilters): Promise<DetailsResponse> {
    const response = await apiClient.get<DetailsResponse>(EP.DETAILS, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async getProcurement(filters?: PlanDashboardFilters): Promise<ProcurementResponse> {
    const response = await apiClient.get<ProcurementResponse>(EP.PROCUREMENT, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async getSKUDetail(docEntry: number): Promise<SKUDetailResponse> {
    const response = await apiClient.get<SKUDetailResponse>(EP.SKU_DETAIL(docEntry));
    return response.data;
  },
};

function buildParams(filters?: PlanDashboardFilters): Record<string, string | boolean> {
  if (!filters) return {};
  const p: Record<string, string | boolean> = {};
  // status filtering is done client-side (multi-select)
  if (filters.due_date_from) p.due_date_from = filters.due_date_from;
  if (filters.due_date_to) p.due_date_to = filters.due_date_to;
  if (filters.warehouse) p.warehouse = filters.warehouse;
  if (filters.sku) p.sku = filters.sku;
  if (filters.show_shortfall_only) p.show_shortfall_only = true;
  return p;
}
