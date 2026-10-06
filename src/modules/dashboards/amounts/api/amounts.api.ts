import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AmountsBoardResponse,
  AmountsGodownItems,
  AmountsOwnersResponse,
  AmountsPerson,
  StockCategoryKey,
} from '../types';

const EP = API_ENDPOINTS.AMOUNTS_BOARD;

export const amountsBoardApi = {
  /** The whole board: both plants and the debtors, in one read. */
  async getBoard(): Promise<AmountsBoardResponse> {
    const response = await apiClient.get<AmountsBoardResponse>(EP.BOARD);
    return response.data;
  },

  /** What one godown holds of one category -- read only when it is opened. */
  async getGodownItems(
    companyCode: string,
    category: StockCategoryKey,
    warehouse: string,
  ): Promise<AmountsGodownItems> {
    const response = await apiClient.get<AmountsGodownItems>(EP.GODOWN_ITEMS, {
      params: { company: companyCode, category, warehouse },
    });
    return response.data;
  },

  async getOwners(): Promise<AmountsOwnersResponse> {
    const response = await apiClient.get<AmountsOwnersResponse>(EP.OWNERS);
    return response.data;
  },

  /** Name a plant's owner for one category; `user: null` clears it. */
  async setOwner(payload: {
    company: string;
    category: StockCategoryKey;
    user: number | null;
  }): Promise<{ owner: AmountsPerson | null }> {
    const response = await apiClient.put<{ owner: AmountsPerson | null }>(EP.OWNERS, payload);
    return response.data;
  },
};
