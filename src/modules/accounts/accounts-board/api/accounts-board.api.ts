import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AccountsBoardResponse, AccountsPeriod } from '../types';

export const accountsBoardApi = {
  /**
   * The whole dashboard in one read.
   *
   * One request rather than a fan-out per panel: every panel re-reads together
   * on each poll, and six round trips would only add latency to a screen that
   * is looked at more than it is used.
   *
   * `period` scopes the movement figures. Omitting it means the whole book —
   * which is a real choice on this screen, not a missing default — so it is
   * only sent when there is one, and both parts go together because the API
   * rejects a year without a month rather than guessing January.
   */
  async getBoard(period?: AccountsPeriod | null): Promise<AccountsBoardResponse> {
    const response = await apiClient.get<AccountsBoardResponse>(
      API_ENDPOINTS.ACCOUNTS_BOARD.BOARD,
      period ? { params: { year: period.year, month: period.month } } : undefined,
    );
    return response.data;
  },
};
