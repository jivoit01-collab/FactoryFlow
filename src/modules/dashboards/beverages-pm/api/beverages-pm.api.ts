import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { PiecesResponse } from '../types';

export const beveragesPmApi = {
  /** Every packaging item in every store, in pieces. No parameters: it is now. */
  async getStockPieces(): Promise<PiecesResponse> {
    const response = await apiClient.get<PiecesResponse>(
      API_ENDPOINTS.PACKING_MATERIAL.STOCK_PIECES,
    );
    return response.data;
  },
};
