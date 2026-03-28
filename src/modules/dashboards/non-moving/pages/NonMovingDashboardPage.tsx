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
import type { NonMovingFilters as NonMovingFiltersType } from '../types';

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

  const handleFiltersChange = useCallback((f: NonMovingFiltersType) => setFilters(f), []);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Non-Moving Raw Materials"
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
          <NonMovingMetaCards summary={reportQuery.data?.summary} />
          <NonMovingBranchSummary branches={reportQuery.data?.summary?.by_branch ?? []} />
          <NonMovingTable
            items={reportQuery.data?.data ?? []}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
            searchTerm={filters.search}
            warehouseFilter={filters.warehouse}
            subGroupFilter={filters.sub_group}
          />
        </>
      )}
    </div>
  );
}
