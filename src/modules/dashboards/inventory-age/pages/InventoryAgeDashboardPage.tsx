import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { useInventoryAgeFilterOptions, useInventoryAgeReport } from '../api';
import {
  InventoryAgeFilters,
  InventoryAgeMetaCards,
  InventoryAgeTable,
  InventoryAgeWarehouseSummary,
} from '../components';
import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import type { InventoryAgeFilters as InventoryAgeFiltersType, InventoryAgeItem, InventoryAgeMeta, WarehouseSummary } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function InventoryAgeDashboardPage() {
  const [filters, setFilters] = useState<InventoryAgeFiltersType>({});

  const handleFiltersChange = useCallback(
    (f: InventoryAgeFiltersType) => setFilters(f),
    [],
  );

  const optionsQuery = useInventoryAgeFilterOptions();
  const reportQuery = useInventoryAgeReport(filters);

  const sapError = reportQuery.error ?? optionsQuery.error;

  const filteredItems = useMemo(() => {
    let result = reportQuery.data?.data ?? [];
    if (filters.warehouse?.length) {
      result = result.filter((item) => filters.warehouse!.includes(item.warehouse));
    }
    if (filters.sub_group?.length) {
      result = result.filter((item) => filters.sub_group!.includes(item.sub_group));
    }
    if (filters.variety?.length) {
      result = result.filter((item) => filters.variety!.includes(item.variety));
    }
    return result;
  }, [reportQuery.data, filters.warehouse, filters.sub_group, filters.variety]);

  const filteredMeta = useMemo((): InventoryAgeMeta | undefined => {
    if (!reportQuery.data) return undefined;
    const whsSet = new Set(filteredItems.map((i) => i.warehouse));
    return {
      total_items: filteredItems.length,
      total_value: filteredItems.reduce((s, i) => s + i.in_stock_value, 0),
      total_quantity: filteredItems.reduce((s, i) => s + i.on_hand, 0),
      total_litres: filteredItems.reduce((s, i) => s + i.litres, 0),
      warehouse_count: whsSet.size,
      fetched_at: reportQuery.data.meta.fetched_at,
    };
  }, [reportQuery.data, filteredItems]);

  const filteredWarehouseSummary = useMemo((): WarehouseSummary[] => {
    const map = new Map<string, WarehouseSummary>();
    for (const item of filteredItems) {
      const existing = map.get(item.warehouse);
      if (existing) {
        existing.item_count += 1;
        existing.total_value += item.in_stock_value;
        existing.total_quantity += item.on_hand;
        existing.total_litres += item.litres;
      } else {
        map.set(item.warehouse, {
          warehouse: item.warehouse,
          item_count: 1,
          total_value: item.in_stock_value,
          total_quantity: item.on_hand,
          total_litres: item.litres,
        });
      }
    }
    return [...map.values()];
  }, [filteredItems]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inventory"
        description="Stock present across warehouses — age, valuation, and group breakdown"
      />

      <InventoryAgeFilters
        onFiltersChange={handleFiltersChange}
        isFetching={optionsQuery.isFetching || reportQuery.isFetching}
        filterOptions={optionsQuery.data}
      />

      {sapError && isSAPError(sapError) && (
        <SAPUnavailableBanner
          error={sapError as ApiError}
          onRetry={reportQuery.refetch}
        />
      )}

      {!filters.item_group && !reportQuery.data && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select an <span className="font-medium text-foreground">Item Group</span> to
            load inventory data.
          </p>
        </div>
      )}

      {filters.item_group && !(sapError && isSAPError(sapError)) && (
        <>
          <InventoryAgeMetaCards meta={filteredMeta} />
          <InventoryAgeWarehouseSummary data={filteredWarehouseSummary} />
          <InventoryAgeTable
            items={filteredItems}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
