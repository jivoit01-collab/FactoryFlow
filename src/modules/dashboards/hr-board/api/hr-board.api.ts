import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { HrBoardResponse } from '../types';

export const hrBoardApi = {
  /**
   * The whole board in one read.
   *
   * Deliberately one request, like its neighbours: both tiles re-read on every
   * refresh of a screen that never sleeps, and a per-tile fan-out would be two
   * round trips a poll for a board that is looked at rather than used.
   *
   * There is no date picker. Head count is "now" and labour is "today", both
   * computed server-side — a board whose window can be changed invites two
   * people quoting different days at each other.
   */
  async getBoard(): Promise<HrBoardResponse> {
    const response = await apiClient.get<HrBoardResponse>(API_ENDPOINTS.HR_BOARD.BOARD);
    return response.data;
  },
};
