import { useCallback, useState } from 'react';

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
import type { InventoryAgeFilters as InventoryAgeFiltersType } from '../types';

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
          <InventoryAgeMetaCards meta={reportQuery.data?.meta} />
          <InventoryAgeWarehouseSummary data={reportQuery.data?.warehouse_summary ?? []} />
          <InventoryAgeTable
            items={reportQuery.data?.data ?? []}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
