import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  WMSDashboardData,
  StockOverviewResponse,
  ItemDetailResponse,
  StockMovement,
  WMSTransferOverviewResponse,
  WMSBatchExpiryResponse,
  WMSSalesOrderBacklogResponse,
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

  // Stock Transfers
  async getTransferOverview(params?: {
    from_date?: string;
    to_date?: string;
    from_warehouse?: string;
    to_warehouse?: string;
    item_code?: string;
    limit?: number;
  }): Promise<WMSTransferOverviewResponse> {
    const res = await apiClient.get<WMSTransferOverviewResponse>(EP.WMS_TRANSFER_OVERVIEW, {
      params,
    });
    return res.data;
  },

  // Batch Expiry / FEFO
  async getBatchExpiry(params?: {
    warehouse_code?: string;
    item_code?: string;
    search?: string;
    days_to_expiry?: number;
    expiry_status?: string;
    limit?: number;
  }): Promise<WMSBatchExpiryResponse> {
    const res = await apiClient.get<WMSBatchExpiryResponse>(EP.WMS_BATCH_EXPIRY, { params });
    return res.data;
  },

  // Sales Order Backlog
  async getSalesOrderBacklog(params?: {
    warehouse_code?: string;
    from_due_date?: string;
    to_due_date?: string;
    search?: string;
    limit?: number;
  }): Promise<WMSSalesOrderBacklogResponse> {
    const res = await apiClient.get<WMSSalesOrderBacklogResponse>(
      EP.WMS_SALES_ORDER_BACKLOG,
      { params },
    );
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
