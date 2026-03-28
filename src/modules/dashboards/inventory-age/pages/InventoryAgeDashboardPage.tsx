import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { useInventoryAge } from '../api';
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
  const [searchParams] = useSearchParams();

  const initialFilters = useMemo<InventoryAgeFiltersType>(() => {
    const search = searchParams.get('search');
    return search ? { search } : {};
  }, []);

  const [filters, setFilters] = useState<InventoryAgeFiltersType>(initialFilters);

  const handleFiltersChange = useCallback(
    (f: InventoryAgeFiltersType) => setFilters(f),
    [],
  );

  const query = useInventoryAge(filters);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inventory Age & Value"
        description="Stock present across warehouses — age, valuation, and group breakdown"
      />

      <InventoryAgeFilters
        onFiltersChange={handleFiltersChange}
        isFetching={query.isFetching}
        filterOptions={query.data?.filter_options}
        defaultValues={initialFilters}
      />

      {query.error && isSAPError(query.error) && (
        <SAPUnavailableBanner error={query.error as ApiError} onRetry={query.refetch} />
      )}

      {!(query.error && isSAPError(query.error)) && (
        <>
          <InventoryAgeMetaCards meta={query.data?.meta} />
          <InventoryAgeWarehouseSummary data={query.data?.warehouse_summary ?? []} />
          <InventoryAgeTable
            items={query.data?.data ?? []}
            isLoading={query.isLoading || query.isFetching}
          />
        </>
      )}
    </div>
  );
}
