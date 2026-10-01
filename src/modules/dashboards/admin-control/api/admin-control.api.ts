import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AdminBoardResponse, AdminDispatchBills } from '../types';

export const adminBoardApi = {
  /**
   * The whole board in one read.
   *
   * Deliberately one request. The storage tiles alone span two SAP schemas and
   * the cost tile re-runs the factory expense board, so a per-tile fan-out
   * would be six round trips a minute against HANA for a screen that is mostly
   * looked at rather than interacted with.
   *
   * Scope is the calendar month to date, computed server-side. Still no free
   * date picker, on purpose — a board whose window can be any range invites two
   * people quoting different ranges at each other. What it does take is a whole
   * ended month (`YYYY-MM`), read as of that month's last day; omitted, it is
   * this month so far.
   */
  async getBoard(month?: string | null): Promise<AdminBoardResponse> {
    const response = await apiClient.get<AdminBoardResponse>(API_ENDPOINTS.ADMIN_BOARD.BOARD, {
      params: month ? { month } : undefined,
    });
    return response.data;
  },

  /**
   * The bills behind one company's row on the Total dispatch panel.
   *
   * Its own read, and only on a click: a month is several hundred bills, and
   * carrying them on a board that re-reads every minute would be paying for a
   * list almost nobody opens.
   */
  async getDispatchBills(companyCode: string, month?: string | null): Promise<AdminDispatchBills> {
    const response = await apiClient.get<AdminDispatchBills>(
      API_ENDPOINTS.ADMIN_BOARD.DISPATCH_BILLS,
      { params: { company: companyCode, ...(month ? { month } : {}) } },
    );
    return response.data;
  },
};
