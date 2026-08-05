import { useCallback, useMemo, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import {
  useRefreshSalesPlanningRequirement,
  useSalesPlanningRequirementAnalysis,
  useSalesPlanningRequirementReport,
  useSalesPlanningRequirementStatus,
} from '../api';
import {
  SalesPlanningRequirementAnalysis,
  SalesPlanningRequirementFilters,
  SalesPlanningRequirementMetaCards,
  SalesPlanningRequirementRefreshPanel,
  SalesPlanningRequirementTable,
} from '../components';
import {
  SALES_PLANNING_REQUIREMENT_PAGE_SIZE,
} from '../constants';
import type { SalesPlanningRequirementFilters as SalesPlanningRequirementFiltersType } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function SalesPlanningRequirementDashboardPage() {
  const { hasPermission } = usePermission();
  const [filters, setFilters] = useState<SalesPlanningRequirementFiltersType>({
    status: 'all',
    page: 1,
    page_size: SALES_PLANNING_REQUIREMENT_PAGE_SIZE,
  });

  const reportQuery = useSalesPlanningRequirementReport(filters);
  const statusQuery = useSalesPlanningRequirementStatus();
  const analysisQuery = useSalesPlanningRequirementAnalysis();
  const refreshMutation = useRefreshSalesPlanningRequirement();

  const refresh = reportQuery.data?.refresh ?? statusQuery.data;
  const hasSAPError = isSAPError(reportQuery.error);

  const handleFiltersChange = useCallback((nextFilters: SalesPlanningRequirementFiltersType) => {
    setFilters((current) => ({
      ...current,
      ...nextFilters,
      page_size: current.page_size,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((current) => ({ ...current, page }));
  }, []);

  const handleSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search, page: 1 }));
  }, []);

  const statusSummary = useMemo(() => {
    const summary = reportQuery.data?.summary;
    if (!summary) return undefined;
    return {
      ...summary,
      total_items:
        filters.status === 'shortage'
          ? summary.shortage_items
          : filters.status === 'po_covered'
            ? summary.po_covered_items
            : summary.total_items,
    };
  }, [filters.status, reportQuery.data?.summary]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Sales Planning vs Requirement"
        description="Weekly SAP forecast requirement, stock coverage, open PO coverage, and net shortage"
      />

      <SalesPlanningRequirementRefreshPanel
        refresh={refresh}
        isRefreshing={refreshMutation.isPending}
        canRefresh={hasPermission(DASHBOARDS_PERMISSIONS.REFRESH_SALES_PLANNING_REQUIREMENT)}
        onRefresh={() => {
          void refreshMutation.mutateAsync();
        }}
      />

      <SalesPlanningRequirementFilters
        key={filters.search ?? 'empty-search'}
        filters={filters}
        isFetching={reportQuery.isFetching}
        onFiltersChange={handleFiltersChange}
      />

      {hasSAPError && (
        <SAPUnavailableBanner error={reportQuery.error as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!hasSAPError && (
        <>
          <SalesPlanningRequirementMetaCards summary={statusSummary} />
          <SalesPlanningRequirementAnalysis analysis={analysisQuery.data} />
          <SalesPlanningRequirementTable
            items={reportQuery.data?.data ?? []}
            meta={reportQuery.data?.meta}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
            onPageChange={handlePageChange}
            onSearchSelect={handleSearchSelect}
          />
        </>
      )}
    </div>
  );
}
