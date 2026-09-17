import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AdminBoardResponse } from '../types';

export const adminBoardApi = {
  /**
   * The whole board in one read.
   *
   * Deliberately one request. The storage tiles alone span two SAP schemas and
   * the cost tile re-runs the factory expense board, so a per-tile fan-out
   * would be six round trips a minute against HANA for a screen that is mostly
   * looked at rather than interacted with.
   *
   * Scope is the calendar month to date, computed server-side. There is no date
   * picker on purpose: every figure here is "this month so far" and a board
   * whose window can be changed invites two people quoting different months at
   * each other.
   */
  async getBoard(): Promise<AdminBoardResponse> {
    const response = await apiClient.get<AdminBoardResponse>(API_ENDPOINTS.ADMIN_BOARD.BOARD);
    return response.data;
  },
};
