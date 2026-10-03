import { apiClient } from '@/core/api';

import type { ReportDaysResponse } from '../types';

/**
 * Kept here rather than in `API_ENDPOINTS`: one board, one endpoint, read from
 * one hook.
 */
const DAYS_ENDPOINT = '/dashboards/operations-report/days/';

export const operationsReportApi = {
  /** The company's report days, `from` to `to` inclusive (YYYY-MM-DD). */
  async getDays(span: { from: string; to: string }): Promise<ReportDaysResponse> {
    const response = await apiClient.get<ReportDaysResponse>(DAYS_ENDPOINT, {
      params: { from: span.from, to: span.to },
    });
    return response.data;
  },
};
