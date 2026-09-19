import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AccountsBoardResponse, AccountsPeriodChoice } from '../types';

export const accountsBoardApi = {
  /**
   * The whole dashboard in one read.
   *
   * One request rather than a fan-out per panel: every panel re-reads together
   * on each poll, and six round trips would only add latency to a screen that
   * is looked at more than it is used.
   *
   * `period` scopes the movement figures, and has three answers rather than
   * two: `latest` (the newest month the book has, resolved server-side so the
   * page opens on it in ONE round trip), a named month, or `all` for the whole
   * book — which is a real choice on this screen, not a missing default.
   *
   * Year and month always travel together: the API rejects a year alone rather
   * than quietly meaning January.
   */
  async getBoard(period: AccountsPeriodChoice): Promise<AccountsBoardResponse> {
    const params =
      period.kind === 'latest'
        ? { period: 'latest' }
        : period.kind === 'month'
          ? { year: period.year, month: period.month }
          : undefined;

    const response = await apiClient.get<AccountsBoardResponse>(
      API_ENDPOINTS.ACCOUNTS_BOARD.BOARD,
      params ? { params } : undefined,
    );
    return response.data;
  },
};
