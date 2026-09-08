import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { PmDemandFilters, PmDemandReportResponse } from '../types';

const EP = API_ENDPOINTS.PM_DEMAND;

export const pmDemandApi = {
  /**
   * The whole board in one call.
   *
   * `search` and `sub_group` are not sent: they narrow the rows already on
   * screen. Pushing them to the server would re-run five HANA reads to answer
   * a keystroke, and would also rebase every share and total on the filtered
   * subset, so a family filter would show that family as 100% of the spend.
   */
  async getReport(filters: PmDemandFilters): Promise<PmDemandReportResponse> {
    const response = await apiClient.get<PmDemandReportResponse>(EP.REPORT, {
      params: {
        date_from: filters.date_from,
        date_to: filters.date_to,
        top: filters.top,
        include_intercompany: filters.include_intercompany,
        source: filters.source,
      },
    });
    return response.data;
  },
};
