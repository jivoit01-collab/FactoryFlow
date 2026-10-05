import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { OpenPoResponse } from '../types';

const EP = API_ENDPOINTS.PLANNING_PURCHASE;

export const openPoApi = {
  /**
   * Every open PO line in SAP for the selected company. The server keeps a read
   * for two minutes; `refresh` asks SAP again. SAP not answering is a 503 with
   * its reason, which the page shows where the lines would be, so no global
   * toast as well.
   */
  async list(refresh = false): Promise<OpenPoResponse> {
    const response = await apiClient.get<OpenPoResponse>(EP.OPEN_POS, {
      params: refresh ? { refresh: 1 } : undefined,
      suppressErrorToast: true,
    });
    return response.data;
  },
};
