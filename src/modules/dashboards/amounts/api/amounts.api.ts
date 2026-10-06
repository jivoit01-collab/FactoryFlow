import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AmountsBoardResponse,
  AmountsDebtorBills,
  AmountsDebtorDrill,
  AmountsDebtorKey,
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

  /** The customers behind one debtor tile, or all three companies' for the Total. */
  async getDebtors(key: AmountsDebtorKey): Promise<AmountsDebtorDrill> {
    const response = await apiClient.get<AmountsDebtorDrill>(EP.DEBTORS, {
      params: { debtor: key },
    });
    return response.data;
  },

  /** One customer's unpaid bills, oldest first. */
  async getDebtorBills(companyCode: string, cardCode: string): Promise<AmountsDebtorBills> {
    const response = await apiClient.get<AmountsDebtorBills>(EP.DEBTOR_BILLS, {
      params: { company: companyCode, customer: cardCode },
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
