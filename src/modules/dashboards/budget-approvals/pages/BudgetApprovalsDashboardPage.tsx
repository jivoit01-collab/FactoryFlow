import { useCallback, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { useBudgetApprovalReport } from '../api';
import {
  BudgetApprovalsFilters,
  BudgetApprovalsMetaCards,
  BudgetApprovalsTable,
} from '../components';
import { DEFAULT_BUDGET_APPROVAL_FILTERS } from '../constants';
import type { BudgetApprovalFilters as FiltersType } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function BudgetApprovalsDashboardPage() {
  const [filters, setFilters] = useState<FiltersType>({
    ...DEFAULT_BUDGET_APPROVAL_FILTERS,
  });

  const reportQuery = useBudgetApprovalReport(filters);

  const handlePageChange = useCallback((page: number) => {
    setFilters((current) => ({ ...current, page }));
  }, []);

  const sapError = reportQuery.error && isSAPError(reportQuery.error);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Budget Approvals"
        description="Factory budget draft approvals from SAP — pending, approved and rejected expense drafts against the Factory budget head"
      />

      <BudgetApprovalsFilters
        filters={filters}
        onFiltersChange={setFilters}
        options={reportQuery.data?.options}
        isFetching={reportQuery.isFetching}
      />

      {sapError && (
        <SAPUnavailableBanner
          error={reportQuery.error as ApiError}
          onRetry={reportQuery.refetch}
        />
      )}

      {!sapError && (
        <>
          <BudgetApprovalsMetaCards summary={reportQuery.data?.summary} />
          <BudgetApprovalsTable
            lines={reportQuery.data?.data ?? []}
            meta={reportQuery.data?.meta}
            isLoading={reportQuery.isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
