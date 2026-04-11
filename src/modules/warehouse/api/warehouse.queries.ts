import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { WAREHOUSE_STALE_TIME } from '../constants';
import type { InventoryFilters, MovementHistoryFilters } from '../types';
import { warehouseApi } from './warehouse.api';

// ============================================================================
// Query Keys
// ============================================================================

export const WAREHOUSE_QUERY_KEYS = {
  all: ['warehouse'] as const,

  filterOptions: (companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'filter-options', companyId] as const,

  inventory: (filters: InventoryFilters, companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'inventory', companyId, filters] as const,

  itemDetail: (itemCode: string, companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'item-detail', companyId, itemCode] as const,

  movements: (itemCode: string, filters: MovementHistoryFilters, companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'movements', companyId, itemCode, filters] as const,

  dashboardSummary: (warehouseCode?: string, companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'dashboard', companyId, warehouseCode] as const,

  batchExpiry: (warehouseCode?: string, companyId?: number | string) =>
    [...WAREHOUSE_QUERY_KEYS.all, 'batch-expiry', companyId, warehouseCode] as const,
};

// ============================================================================
// Retry Helper
// ============================================================================

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

// ============================================================================
// Hooks
// ============================================================================

/** Filter options for dropdowns (warehouses, item groups). */
export function useWarehouseFilterOptions() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.filterOptions(currentCompany?.company_id),
    queryFn: () => warehouseApi.getFilterOptions(),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
  });
}

/** Inventory list with search and filters. */
export function useWarehouseInventory(filters: InventoryFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.inventory(filters, currentCompany?.company_id),
    queryFn: () => warehouseApi.getInventory(filters),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
  });
}

/** Item detail with warehouse breakdown and batches. */
export function useWarehouseItemDetail(itemCode: string | undefined) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.itemDetail(itemCode!, currentCompany?.company_id),
    queryFn: () => warehouseApi.getItemDetail(itemCode!),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
    enabled: !!itemCode,
  });
}

/** Movement history for a specific item. */
export function useMovementHistory(
  itemCode: string | undefined,
  filters: MovementHistoryFilters,
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.movements(itemCode!, filters, currentCompany?.company_id),
    queryFn: () => warehouseApi.getMovementHistory(itemCode!, filters),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
    enabled: !!itemCode,
  });
}

/** Dashboard summary with low-stock alerts. */
export function useWarehouseDashboard(warehouseCode?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.dashboardSummary(warehouseCode, currentCompany?.company_id),
    queryFn: () => warehouseApi.getDashboardSummary(warehouseCode),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
  });
}

/** Batch expiry report for non-moving FG tracking. */
export function useWarehouseBatchExpiry(warehouseCode?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_QUERY_KEYS.batchExpiry(warehouseCode, currentCompany?.company_id),
    queryFn: () => warehouseApi.getBatchExpiry(warehouseCode),
    staleTime: WAREHOUSE_STALE_TIME,
    retry: sapRetry,
  });
}
