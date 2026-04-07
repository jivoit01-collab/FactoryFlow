import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  WMSDashboardData,
  StockOverviewResponse,
  ItemDetailResponse,
  StockMovement,
  WarehouseSummary,
  BillingOverviewResponse,
  WarehouseOption,
  ItemGroupOption,
} from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

export const wmsApi = {
  // Dashboard
  async getDashboard(warehouseCode?: string): Promise<WMSDashboardData> {
    const res = await apiClient.get<WMSDashboardData>(EP.WMS_DASHBOARD, {
      params: warehouseCode ? { warehouse_code: warehouseCode } : undefined,
    });
    return res.data;
  },

  // Stock Overview
  async getStockOverview(params?: {
    warehouse_code?: string;
    item_group?: string;
    search?: string;
    stock_filter?: string;
    page?: number;
    page_size?: number;
  }): Promise<StockOverviewResponse> {
    const res = await apiClient.get<StockOverviewResponse>(EP.WMS_STOCK_OVERVIEW, { params });
    return res.data;
  },

  // Item Detail
  async getItemDetail(itemCode: string): Promise<ItemDetailResponse> {
    const res = await apiClient.get<ItemDetailResponse>(EP.WMS_ITEM_DETAIL(itemCode));
    return res.data;
  },

  // Stock Movements
  async getStockMovements(params?: {
    item_code?: string;
    warehouse_code?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<{ movements: StockMovement[] }> {
    const res = await apiClient.get<{ movements: StockMovement[] }>(EP.WMS_STOCK_MOVEMENTS, {
      params,
    });
    return res.data;
  },

  // Warehouse Summary
  async getWarehouseSummary(): Promise<{ warehouses: WarehouseSummary[] }> {
    const res = await apiClient.get<{ warehouses: WarehouseSummary[] }>(EP.WMS_WAREHOUSE_SUMMARY);
    return res.data;
  },

  // Billing Overview
  async getBillingOverview(params?: {
    from_date?: string;
    to_date?: string;
    vendor?: string;
    warehouse_code?: string;
  }): Promise<BillingOverviewResponse> {
    const res = await apiClient.get<BillingOverviewResponse>(EP.WMS_BILLING_OVERVIEW, { params });
    return res.data;
  },

  // Warehouses dropdown
  async getWarehouses(): Promise<{ warehouses: WarehouseOption[] }> {
    const res = await apiClient.get<{ warehouses: WarehouseOption[] }>(EP.WMS_WAREHOUSE_LIST);
    return res.data;
  },

  // Item Groups dropdown
  async getItemGroups(): Promise<{ item_groups: ItemGroupOption[] }> {
    const res = await apiClient.get<{ item_groups: ItemGroupOption[] }>(EP.WMS_ITEM_GROUPS);
    return res.data;
  },
};
