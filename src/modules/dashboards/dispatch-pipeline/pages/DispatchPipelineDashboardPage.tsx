import { useCallback, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { getErrorMessage } from '@/shared/utils';

import { useDispatchPipelineBoard } from '../api';
import { DispatchPipelineFilters, PipelineBoard } from '../components';
import { createDefaultPipelineFilters } from '../constants';
import type { DispatchPipelineFilters as Filters } from '../types';

export default function DispatchPipelineDashboardPage() {
  const { hasPermission } = usePermission();
  const canView = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);

  const [filters, setFilters] = useState<Filters>(() => createDefaultPipelineFilters());
  const handleChange = useCallback((next: Filters) => setFilters(next), []);

  const boardQuery = useDispatchPipelineBoard(filters);
  const columns = boardQuery.data?.columns ?? [];
  const cards = boardQuery.data?.cards ?? [];

  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          You don't have permission to view the Dispatch Pipeline.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Pipeline"
        description="Which vehicle is at which stage — from vehicle linking through sales dispatch out"
      />

      <DispatchPipelineFilters
        filters={filters}
        isFetching={boardQuery.isFetching}
        onChange={handleChange}
        onRefresh={() => void boardQuery.refetch()}
      />

      {boardQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {getErrorMessage(boardQuery.error, 'Failed to load the dispatch pipeline.')}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {boardQuery.data?.meta.total ?? 0} vehicle
            {(boardQuery.data?.meta.total ?? 0) === 1 ? '' : 's'} in window
          </div>
          <PipelineBoard columns={columns} cards={cards} isLoading={boardQuery.isLoading} />
        </>
      )}
    </div>
  );
}
