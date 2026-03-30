import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { useItemGroups, useNonMovingReport } from '../api';
import {
  NonMovingBranchSummary,
  NonMovingFilters,
  NonMovingMetaCards,
  NonMovingTable,
} from '../components';
import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import type { BranchSummary, NonMovingFilters as NonMovingFiltersType, ReportSummary } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function NonMovingDashboardPage() {
  const itemGroupsQuery = useItemGroups();

  const [filters, setFilters] = useState<NonMovingFiltersType>({
    age: 45,
    item_group: 0,
  });

  // Default to "Raw Material" group once loaded, fallback to first group
  useEffect(() => {
    if (itemGroupsQuery.data?.data?.length && filters.item_group === 0) {
      const groups = itemGroupsQuery.data.data;
      const rawMaterial = groups.find(
        (g) => g.item_group_name.toLowerCase() === 'raw material',
      );
      setFilters((prev) => ({
        ...prev,
        item_group: rawMaterial?.item_group_code ?? groups[0].item_group_code,
      }));
    }
  }, [itemGroupsQuery.data, filters.item_group]);

  const hasValidFilters = filters.item_group !== 0;
  const reportQuery = useNonMovingReport(filters);

  const warehouses = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    return [...new Set(items.map((item) => item.warehouse).filter(Boolean))].sort();
  }, [reportQuery.data]);

  const subGroups = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    return [...new Set(items.map((item) => item.sub_group).filter(Boolean))].sort();
  }, [reportQuery.data]);

  const filteredItems = useMemo(() => {
    let result = reportQuery.data?.data ?? [];
    if (filters.warehouse?.length) {
      result = result.filter((item) => filters.warehouse!.includes(item.warehouse));
    }
    if (filters.sub_group?.length) {
      result = result.filter((item) => filters.sub_group!.includes(item.sub_group));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.item_code.toLowerCase().includes(term) ||
          item.item_name.toLowerCase().includes(term) ||
          item.branch.toLowerCase().includes(term) ||
          item.warehouse.toLowerCase().includes(term),
      );
    }
    return result;
  }, [reportQuery.data, filters.warehouse, filters.sub_group, filters.search]);

  const filteredSummary = useMemo((): ReportSummary | undefined => {
    if (!reportQuery.data) return undefined;
    const branchMap = new Map<string, BranchSummary>();
    for (const item of filteredItems) {
      const existing = branchMap.get(item.branch);
      if (existing) {
        existing.item_count += 1;
        existing.total_value += item.value;
        existing.total_quantity += item.quantity;
      } else {
        branchMap.set(item.branch, {
          branch: item.branch,
          item_count: 1,
          total_value: item.value,
          total_quantity: item.quantity,
        });
      }
    }
    return {
      total_items: filteredItems.length,
      total_value: filteredItems.reduce((s, i) => s + i.value, 0),
      total_quantity: filteredItems.reduce((s, i) => s + i.quantity, 0),
      by_branch: [...branchMap.values()],
    };
  }, [reportQuery.data, filteredItems]);

  const handleFiltersChange = useCallback((f: NonMovingFiltersType) => setFilters(f), []);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Non-Moving"
        description="Raw materials with no movement beyond the specified age threshold — identify dead stock and slow-moving inventory"
      />

      <NonMovingFilters
        onFiltersChange={handleFiltersChange}
        isFetching={reportQuery.isFetching}
        defaultValues={filters}
        itemGroups={itemGroupsQuery.data?.data ?? []}
        isLoadingGroups={itemGroupsQuery.isLoading}
        warehouses={warehouses}
        subGroups={subGroups}
      />

      {reportQuery.error && isSAPError(reportQuery.error) && (
        <SAPUnavailableBanner error={reportQuery.error as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!(reportQuery.error && isSAPError(reportQuery.error)) && hasValidFilters && (
        <>
          <NonMovingMetaCards summary={filteredSummary} />
          <NonMovingBranchSummary branches={filteredSummary?.by_branch ?? []} />
          <NonMovingTable
            items={filteredItems}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
