import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ItemGroupResponse, NonMovingFilters, NonMovingReportResponse } from '../types';

const EP = API_ENDPOINTS.NON_MOVING_RM;

/**
 * Pin a read to one company.
 *
 * Both endpoints read the SAP schema named by the `Company-Code` header, and the
 * request interceptor leaves an explicit header untouched — so passing a code
 * here asks a named company rather than the active one. Used by the Warehouse
 * Control board, which reports on a warehouse that exists in a single company
 * and so must not change answer when the user switches company.
 */
function companyHeaders(companyCode?: string) {
  return companyCode ? { 'Company-Code': companyCode } : undefined;
}

export const nonMovingApi = {
  async getReport(
    filters: NonMovingFilters,
    companyCode?: string,
  ): Promise<NonMovingReportResponse> {
    const params: Record<string, number> = {
      age: filters.age,
    };
    if (filters.item_group !== 0) params.item_group = filters.item_group;

    const response = await apiClient.get<NonMovingReportResponse>(EP.REPORT, {
      params,
      headers: companyHeaders(companyCode),
    });
    return response.data;
  },

  async getItemGroups(companyCode?: string): Promise<ItemGroupResponse> {
    const response = await apiClient.get<ItemGroupResponse>(EP.ITEM_GROUPS, {
      headers: companyHeaders(companyCode),
    });
    return response.data;
  },
};
