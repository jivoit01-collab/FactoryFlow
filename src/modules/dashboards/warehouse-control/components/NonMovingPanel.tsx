import { PackageX } from 'lucide-react';

import type { ReportSummary, WarehouseGroup } from '@/modules/dashboards/non-moving/types';
import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_PREVIEW_ROWS } from '../constants';
import { ACCENTS, SECTION_ACCENT } from '../constants/warehouse-control.theme';
import { formatCompactCurrency, formatCount } from '../utils/format';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';

export interface NonMovingPanelProps {
  summary?: ReportSummary;
  /** Factory warehouses only, already re-totalled against the visible rows. */
  warehouses: WarehouseGroup[];
  ageDays: number;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
}

const accent = ACCENTS[SECTION_ACCENT.nonMoving];

/**
 * Non-moving stock, summarised from the Non-Moving dashboard's own feed.
 *
 * Warehouse rows are ranked by value and drawn with a bar relative to the
 * largest, so the one worth chasing stands out without the reader comparing
 * rupee figures digit by digit.
 */
export function NonMovingPanel({
  summary,
  warehouses,
  ageDays,
  loading,
  isFetching,
  error,
  onRetry,
}: NonMovingPanelProps) {
  const ranked = [...warehouses].sort((a, b) => b.total_value - a.total_value);
  const visible = ranked.slice(0, WAREHOUSE_CONTROL_PREVIEW_ROWS);
  const hidden = ranked.length - visible.length;
  const largest = visible[0]?.total_value ?? 0;

  const meta = summary
    ? `${formatCount(summary.total_items)} items · ${formatCompactCurrency(summary.total_value)} · ${formatCount(summary.by_branch.length)} branches`
    : `No movement for more than ${ageDays} days`;

  return (
    <ControlSection
      id="non-moving"
      title="Non-Moving Stock"
      description={`Material with no movement for more than ${ageDays} days`}
      meta={meta}
      icon={PackageX}
      accent={SECTION_ACCENT.nonMoving}
      isFetching={isFetching && !loading}
      action={{ label: 'Full report', to: '/dashboards/non-moving' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="The non-moving report could not be read from SAP."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : !summary ? (
        <ControlEmpty message="Non-moving stock could not be read." />
      ) : visible.length === 0 ? (
        <ControlEmpty message="No factory warehouse is holding non-moving stock." />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y overflow-hidden rounded-lg border">
            {visible.map((warehouse) => {
              const width = largest > 0 ? (warehouse.total_value / largest) * 100 : 0;
              return (
                <li
                  key={warehouse.warehouse}
                  className="px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {warehouse.warehouse_name?.trim() || warehouse.warehouse}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {warehouse.warehouse} · {formatCount(warehouse.item_count)} items
                      </p>
                    </div>
                    <p className={cn('shrink-0 text-sm font-semibold tabular-nums', accent.text)}>
                      {formatCompactCurrency(warehouse.total_value)}
                    </p>
                  </div>
                  <div className={cn('mt-2 h-1.5 w-full overflow-hidden rounded-full', accent.track)}>
                    <div
                      className={cn('h-full rounded-full transition-all', accent.fill)}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {hidden > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatCount(hidden)} more warehouse{hidden === 1 ? '' : 's'} on the full report.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
