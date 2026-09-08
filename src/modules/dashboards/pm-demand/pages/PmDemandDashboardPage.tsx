import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { usePmDemandReport } from '../api';
import {
  PmDemandCoverPanel,
  PmDemandFamilyRollup,
  PmDemandFilters,
  PmDemandHeadline,
  PmDemandTopTable,
  PmDemandUpstreamPanel,
} from '../components';
import { defaultPmDemandFilters } from '../constants';
import type { PmDemandFilters as PmDemandFiltersType } from '../types';
import { collectSubGroups, filterPmItems } from '../utils';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

/**
 * Packing Material Demand.
 *
 * Two top lists over one period, side by side, off one request: the packaging
 * production consumed, and the packaging that left the gate inside the
 * finished goods that were invoiced. Every row can be opened to see the same
 * material counted at both stages with the gap between them named -- the
 * "made 400, shipped 200" split, per packing item.
 *
 * The App/SAP switch changes only the QUANTITIES. The recipe, the stock and
 * the open purchase orders come from SAP in both modes, and on app data the
 * consumption column becomes the APPROVED BOM rather than the actual issue --
 * so the headings and the notes above the board change with it.
 */
export default function PmDemandDashboardPage() {
  // The default period is fixed at mount rather than recomputed on render, so
  // a board left open overnight does not silently change month underneath the
  // person reading it.
  const [defaults] = useState(() => defaultPmDemandFilters(new Date()));
  const [filters, setFilters] = useState<PmDemandFiltersType>(defaults);

  const reportQuery = usePmDemandReport(filters);
  const report = reportQuery.data;

  const subGroups = useMemo(
    () =>
      collectSubGroups(
        report?.production_top,
        report?.dispatch_top,
        report?.cover_watch,
        report?.upstream,
      ),
    [report],
  );

  const narrowing = useMemo(
    () => ({ search: filters.search, subGroup: filters.sub_group }),
    [filters.search, filters.sub_group],
  );

  const productionItems = useMemo(
    () => filterPmItems(report?.production_top ?? [], narrowing),
    [report, narrowing],
  );
  const dispatchItems = useMemo(
    () => filterPmItems(report?.dispatch_top ?? [], narrowing),
    [report, narrowing],
  );
  const coverItems = useMemo(
    () => filterPmItems(report?.cover_watch ?? [], narrowing),
    [report, narrowing],
  );

  const handleFiltersChange = useCallback((next: PmDemandFiltersType) => {
    setFilters(next);
  }, []);

  const sapDown = reportQuery.error && isSAPError(reportQuery.error);
  const isLoading = reportQuery.isLoading || reportQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Packing Material Demand"
        description="Which packing material production consumed, and which of it shipped out inside finished goods"
      />

      <PmDemandFilters
        onFiltersChange={handleFiltersChange}
        defaultValues={defaults}
        subGroups={subGroups}
        isFetching={reportQuery.isFetching}
      />

      {sapDown && (
        <SAPUnavailableBanner
          error={reportQuery.error as ApiError}
          onRetry={reportQuery.refetch}
        />
      )}

      {!sapDown && (
        <>
          <PmDemandHeadline
            summary={report?.summary}
            meta={report?.meta}
            isLoading={isLoading}
          />

          {/* Paired at 1536px and stacked below. Reading the two lists
              together is the point, but each carries eleven columns, so at
              1280px they were 640px wide and both scrolled horizontally --
              which defeats reading them together far worse than stacking. */}
          <div className="grid gap-6 2xl:grid-cols-2">
            <PmDemandTopTable
              board="production"
              items={productionItems}
              isLoading={isLoading}
              periodValue={report?.summary.pm_consumed_value}
              basis={report?.meta.consumption_basis}
            />
            <PmDemandTopTable
              board="dispatch"
              items={dispatchItems}
              isLoading={isLoading}
              periodValue={report?.summary.pm_dispatched_value}
              basis={report?.meta.consumption_basis}
            />
          </div>

          {/* Cover first of the lower row: it is the only panel here that
              asks for a decision today rather than describing the month. */}
          <div className="grid gap-6 xl:grid-cols-5">
            {/* Cover carries five columns to the roll-up's one bar, so it
                takes three fifths rather than half. */}
            <div className="xl:col-span-3">
              <PmDemandCoverPanel
                items={coverItems}
                meta={report?.meta}
                isLoading={isLoading}
              />
            </div>
            <div className="xl:col-span-2">
              <PmDemandFamilyRollup
                families={report?.families ?? []}
                isLoading={isLoading}
                selected={filters.sub_group}
              />
            </div>
          </div>

          <PmDemandUpstreamPanel
            items={report?.upstream ?? []}
            warehouses={report?.meta.upstream_warehouses}
          />
        </>
      )}
    </div>
  );
}
