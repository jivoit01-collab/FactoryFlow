import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  StockBoardResponse,
  TransferOptions,
  TransferRequest,
  TransferResult,
  WarehouseMovement,
  WarehouseRole,
  WarehouseStockFilters,
  WarehouseStockResponse,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_MOVEMENTS;

export const productionMovementsApi = {
  async getWarehouseRoles(): Promise<WarehouseRole[]> {
    const response = await apiClient.get<WarehouseRole[]>(EP.WAREHOUSE_ROLES);
    return response.data;
  },

  async getStockBoard(): Promise<StockBoardResponse> {
    const response = await apiClient.get<StockBoardResponse>(EP.STOCK_BOARD);
    return response.data;
  },

  async getWarehouseStock(
    whsCode: string,
    filters: WarehouseStockFilters = {},
  ): Promise<WarehouseStockResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (filters.pm_only) params.pm_only = true;
    if (filters.search) params.search = filters.search;
    if (filters.stock_filter) params.stock_filter = filters.stock_filter;
    if (filters.page) params.page = filters.page;
    if (filters.page_size) params.page_size = filters.page_size;

    const response = await apiClient.get<WarehouseStockResponse>(
      EP.WAREHOUSE_STOCK(whsCode),
      { params },
    );
    return response.data;
  },

  async getTransferOptions(): Promise<TransferOptions> {
    const response = await apiClient.get<TransferOptions>(EP.TRANSFER_OPTIONS);
    return response.data;
  },

  async createTransfer(body: TransferRequest): Promise<TransferResult> {
    const response = await apiClient.post<TransferResult>(EP.TRANSFERS, body);
    return response.data;
  },

  async getMovements(params: {
    movement_type?: string;
    status?: string;
  } = {}): Promise<WarehouseMovement[]> {
    const response = await apiClient.get<WarehouseMovement[]>(EP.MOVEMENTS, { params });
    return response.data;
  },
};
