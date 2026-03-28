import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { useStockLevels } from '../api';
import { StockLevelFilters, StockLevelMetaCards, StockLevelTable } from '../components';
import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import type { StockDashboardFilters } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function StockLevelDashboardPage() {
  const [searchParams] = useSearchParams();

  const initialFilters = useMemo<StockDashboardFilters>(() => {
    const search = searchParams.get('search');
    return search ? { search } : {};
  }, []); // Only read URL params on mount

  const [filters, setFilters] = useState<StockDashboardFilters>(initialFilters);

  const handleFiltersChange = useCallback((f: StockDashboardFilters) => setFilters(f), []);

  const query = useStockLevels(filters);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Stock Levels"
        description="Inventory items with minimum stock thresholds — monitor on-hand vs. minimum requirements"
      />

      <StockLevelFilters
        onFiltersChange={handleFiltersChange}
        isFetching={query.isFetching}
        defaultValues={initialFilters}
      />

      {query.error && isSAPError(query.error) && (
        <SAPUnavailableBanner error={query.error as ApiError} onRetry={query.refetch} />
      )}

      {!(query.error && isSAPError(query.error)) && (
        <>
          <StockLevelMetaCards meta={query.data?.meta} />
          <StockLevelTable
            items={query.data?.data ?? []}
            isLoading={query.isLoading || query.isFetching}
            statusFilter={filters.status}
          />
        </>
      )}
    </div>
  );
}
