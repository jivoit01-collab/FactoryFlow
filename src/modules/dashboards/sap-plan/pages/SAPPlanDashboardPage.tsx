import { useCallback, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge } from '@/shared/components/ui';

import { usePlanProcurement, usePlanSummary } from '../api';
import {
  PlanDashboardFilters,
  ProcurementTable,
  SAPUnavailableBanner,
  SKUSummaryTable,
  SummaryMetaCards,
} from '../components';
import type { PlanDashboardFilters as Filters } from '../types';

type ActiveTab = 'summary' | 'procurement';

const TABS: { label: string; value: ActiveTab }[] = [
  { label: 'SKU Summary', value: 'summary' },
  { label: 'Procurement', value: 'procurement' },
];

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function SAPPlanDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [filters, setFilters] = useState<Filters>({});

  const handleFiltersChange = useCallback((f: Filters) => setFilters(f), []);

  const summaryQuery = usePlanSummary(filters);
  const procurementQuery = usePlanProcurement(filters, activeTab === 'procurement');

  const activeError = activeTab === 'summary' ? summaryQuery.error : procurementQuery.error;
  const isFetching =
    activeTab === 'summary' ? summaryQuery.isFetching : procurementQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="SAP Material Plan"
        description="Production order shortfall, BOM component detail & procurement requirements"
      />

      <PlanDashboardFilters onFiltersChange={handleFiltersChange} isFetching={isFetching} />

      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        {TABS.map((tab) => (
          <Badge
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* SAP-level error banner (502/503) */}
      {activeError && isSAPError(activeError) && (
        <SAPUnavailableBanner
          error={activeError as ApiError}
          onRetry={
            activeTab === 'summary' ? summaryQuery.refetch : procurementQuery.refetch
          }
        />
      )}

      {/* Tab content */}
      {activeTab === 'summary' && !(activeError && isSAPError(activeError)) && (
        <>
          <SummaryMetaCards meta={summaryQuery.data?.meta} />
          <SKUSummaryTable
            orders={summaryQuery.data?.data ?? []}
            isLoading={summaryQuery.isLoading || summaryQuery.isFetching}
            statusFilter={filters.status}
          />
        </>
      )}

      {activeTab === 'procurement' && !(activeError && isSAPError(activeError)) && (
        <ProcurementTable
          items={procurementQuery.data?.data ?? []}
          isLoading={procurementQuery.isLoading || procurementQuery.isFetching}
        />
      )}
    </div>
  );
}
