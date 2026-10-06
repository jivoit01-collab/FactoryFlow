import { useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Input } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import {
  useRefreshSalesPlanningRequirement,
  useSalesPlanningRequirementAnalysis,
  useSalesPlanningRequirementSheet,
  useSalesPlanningRequirementStatus,
} from '../api';
import {
  SalesPlanningRequirementAnalysis,
  SalesPlanningRequirementRefreshPanel,
  SalesPlanningRequirementTable,
} from '../components';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

/**
 * Sales Planning vs Requirement, laid out as a sheet.
 *
 * The whole report comes down at once and every filter works over the rows in
 * hand: the Find box here, and an Excel funnel on each column of the sheet —
 * the Status column's funnel is what the old Shortage / PO Covered drop-down
 * was. A keystroke or a tick costs no round trip.
 */
export default function SalesPlanningRequirementDashboardPage() {
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState('');

  const sheetQuery = useSalesPlanningRequirementSheet();
  const statusQuery = useSalesPlanningRequirementStatus();
  const analysisQuery = useSalesPlanningRequirementAnalysis();
  const refreshMutation = useRefreshSalesPlanningRequirement();

  const refresh = sheetQuery.data?.refresh ?? statusQuery.data;
  const hasSAPError = isSAPError(sheetQuery.error);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Sales Planning vs Requirement">
        <Input
          placeholder="Item code, item name, month…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Find"
          className="h-9 w-64"
        />
      </DashboardHeader>

      <SalesPlanningRequirementRefreshPanel
        refresh={refresh}
        isRefreshing={refreshMutation.isPending}
        canRefresh={hasPermission(DASHBOARDS_PERMISSIONS.REFRESH_SALES_PLANNING_REQUIREMENT)}
        onRefresh={() => {
          void refreshMutation.mutateAsync();
        }}
      />

      {hasSAPError && (
        <SAPUnavailableBanner error={sheetQuery.error as ApiError} onRetry={sheetQuery.refetch} />
      )}

      {!hasSAPError && (
        <>
          <SalesPlanningRequirementAnalysis analysis={analysisQuery.data} />
          <SalesPlanningRequirementTable
            items={sheetQuery.data?.data ?? []}
            isLoading={sheetQuery.isLoading}
            search={search}
          />
        </>
      )}
    </div>
  );
}
