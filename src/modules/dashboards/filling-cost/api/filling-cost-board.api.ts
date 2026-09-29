import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { FillingCostBoard } from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const fillingCostBoardApi = {
  /** `month` YYYY-MM; `day` YYYY-MM-DD, or omitted for yesterday. */
  async getBoard(month?: string, day?: string): Promise<FillingCostBoard> {
    const response = await apiClient.get<FillingCostBoard>(EP.FILLING_COST_BOARD, {
      params: { month, day },
    });
    return response.data;
  },
};
