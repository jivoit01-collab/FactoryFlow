import { apiClient } from '@/core/api';

import type { DocumentsResponse, ProductionDispatchReport } from '../types';

/** Kept here rather than in `API_ENDPOINTS`: one page, two endpoints, read from its own hooks. */
const BASE = '/dashboards/production-dispatch';

export interface DateRange {
  from: string;
  to: string;
}

export const productionDispatchApi = {
  /** Oil's production and dispatch per day and item, `from` to `to` inclusive. */
  async getReport(range: DateRange): Promise<ProductionDispatchReport> {
    const response = await apiClient.get<ProductionDispatchReport>(`${BASE}/report/`, {
      params: { from: range.from, to: range.to },
    });
    return response.data;
  },

  /** The production and dispatch lines behind it, for one item or all of them. */
  async getDocuments(range: DateRange, item?: string): Promise<DocumentsResponse> {
    const response = await apiClient.get<DocumentsResponse>(`${BASE}/documents/`, {
      params: { from: range.from, to: range.to, ...(item ? { item } : {}) },
    });
    return response.data;
  },
};
