import { useQuery } from '@tanstack/react-query';

import { wmsApi } from './wms.api';

export const WMS_QUERY_KEYS = {
  all: ['wms'] as const,
  dashboard: (wh?: string) => [...WMS_QUERY_KEYS.all, 'dashboard', wh] as const,
  stockOverview: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'stock-overview', filters] as const,
  itemDetail: (code: string) => [...WMS_QUERY_KEYS.all, 'item', code] as const,
  movements: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'movements', filters] as const,
  transfers: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'transfers', filters] as const,
  batchExpiry: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'batch-expiry', filters] as const,
  salesOrderBacklog: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'sales-order-backlog', filters] as const,
  warehouseSummary: () => [...WMS_QUERY_KEYS.all, 'warehouse-summary'] as const,
  billing: (filters: Record<string, unknown>) =>
    [...WMS_QUERY_KEYS.all, 'billing', filters] as const,
  warehouses: () => [...WMS_QUERY_KEYS.all, 'warehouses'] as const,
  itemGroups: () => [...WMS_QUERY_KEYS.all, 'item-groups'] as const,
};

export function useWMSDashboard(warehouseCode?: string) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.dashboard(warehouseCode),
    queryFn: () => wmsApi.getDashboard(warehouseCode),
  });
}

export function useStockOverview(params: {
  warehouse_code?: string;
  item_group?: string;
  search?: string;
  stock_filter?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.stockOverview(params),
    queryFn: () => wmsApi.getStockOverview(params),
  });
}

export function useItemDetail(itemCode: string | null) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.itemDetail(itemCode!),
    queryFn: () => wmsApi.getItemDetail(itemCode!),
    enabled: !!itemCode,
  });
}

export function useStockMovements(params: {
  item_code?: string;
  warehouse_code?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.movements(params),
    queryFn: () => wmsApi.getStockMovements(params),
  });
}

export function useTransferOverview(params: {
  from_date?: string;
  to_date?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  item_code?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.transfers(params),
    queryFn: () => wmsApi.getTransferOverview(params),
  });
}

export function useBatchExpiry(params: {
  warehouse_code?: string;
  item_code?: string;
  search?: string;
  days_to_expiry?: number;
  expiry_status?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.batchExpiry(params),
    queryFn: () => wmsApi.getBatchExpiry(params),
  });
}

export function useSalesOrderBacklog(params: {
  warehouse_code?: string;
  from_due_date?: string;
  to_due_date?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.salesOrderBacklog(params),
    queryFn: () => wmsApi.getSalesOrderBacklog(params),
  });
}

export function useWarehouseSummary() {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.warehouseSummary(),
    queryFn: () => wmsApi.getWarehouseSummary(),
  });
}

export function useBillingOverview(params: {
  from_date?: string;
  to_date?: string;
  vendor?: string;
  warehouse_code?: string;
}) {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.billing(params),
    queryFn: () => wmsApi.getBillingOverview(params),
  });
}

export function useWMSWarehouses() {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.warehouses(),
    queryFn: () => wmsApi.getWarehouses(),
  });
}

export function useWMSItemGroups() {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.itemGroups(),
    queryFn: () => wmsApi.getItemGroups(),
  });
}
