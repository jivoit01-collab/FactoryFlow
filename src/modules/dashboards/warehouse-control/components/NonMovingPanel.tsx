import { CalendarOff, ChevronRight, PackageX } from 'lucide-react';

import type { ReportSummary, WarehouseGroup } from '@/modules/dashboards/non-moving/types';
import { getMovementStatus } from '@/modules/dashboards/non-moving/utils/movementStatus';
import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_MAX_RENDERED_ROWS } from '../constants';
import { ACCENTS, MOVEMENT_AGE_TONE, SECTION_ACCENT } from '../constants/warehouse-control.theme';
import { formatCompactCurrency, formatCompanyChip, formatCount } from '../utils/format';
import { oldestDays } from '../utils/nonMovingAge';
import { type NonMovingItemRow, rollUpNonMovingItems } from '../utils/nonMovingItems';
import { useControlDetail } from './controlDetailContext';
import { ControlScrollList } from './ControlScrollList';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';

export interface NonMovingPanelProps {
  summary?: ReportSummary;
  /** Factory warehouses only, already re-totalled against the visible rows. */
  warehouses: WarehouseGroup[];
  ageDays: number;
  /** Warehouse codes the panel is narrowed to; empty means every factory one. */
  scope: readonly string[];
  /**
   * The company whose SAP schema was read.
   *
   * Named in the panel because it is pinned rather than following the company
   * selector: the warehouse in scope lives in one company's books, so a reader
   * sitting in a sibling company has to be told whose stock this is.
   */
  companyCode: string;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  /** Grid placement, set by the board. */
  className?: string;
}

const accent = ACCENTS[SECTION_ACCENT.nonMoving];

/**
 * One stuck item, under the warehouse that is holding it.
 *
 * The age leads in colour here rather than the money, because the warehouse row
 * above already carries the rupees — what this list adds is which line is the
 * old one. Rows are inert: opening a warehouse is what the panel offers, and a
 * second click target on top of it would only compete with that.
 */
function ItemRow({ row, largest }: { row: NonMovingItemRow; largest: number }) {
  const width = largest > 0 ? (row.value / largest) * 100 : 0;
  const tone = MOVEMENT_AGE_TONE[getMovementStatus(row.days)];

  return (
    <li className="px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.itemName || row.itemCode || 'Unidentified stock'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.itemCode && row.itemName ? `${row.itemCode} · ` : ''}
            {row.warehouses > 1
              ? `${formatCount(row.warehouses)} warehouses`
              : row.warehouse || row.subGroup}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'flex items-center justify-end gap-1 text-sm font-semibold tabular-nums',
              tone,
            )}
          >
            <CalendarOff className="h-3 w-3" />
            {formatCount(row.days)}d
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatCompactCurrency(row.value)} · {formatCount(row.quantity)} qty
          </p>
        </div>
      </div>
      <div className={cn('mt-1.5 h-1 w-full overflow-hidden rounded-full', accent.track)}>
        <div
          className={cn('h-full rounded-full transition-all', accent.fill)}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

/**
 * Non-moving stock in the pinned company's factory warehouse.
 *
 * Warehouse rows are ranked by value and drawn with a bar relative to the
 * largest, so the one worth chasing stands out without the reader comparing
 * rupee figures digit by digit. Under them the same feed is rolled up by item,
 * longest stuck first — with only one or two factory warehouses in scope the
 * warehouse list is a couple of rows and the panel would otherwise sit half
 * empty next to its neighbours, which are stretched to the tallest of the row.
 */
export function NonMovingPanel({
  summary,
  warehouses,
  ageDays,
  scope,
  companyCode,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: NonMovingPanelProps) {
  const { showNonMovingWarehouse } = useControlDetail();
  const ranked = [...warehouses].sort((a, b) => b.total_value - a.total_value);
  const visible = ranked.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hidden = ranked.length - visible.length;
  const largest = visible[0]?.total_value ?? 0;

  const items = rollUpNonMovingItems(visible);
  const visibleItems = items.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hiddenItems = items.length - visibleItems.length;
  const largestItem = Math.max(...visibleItems.map((row) => row.value), 0);
  const itemValue = items.reduce((sum, row) => sum + row.value, 0);

  const meta = summary
    ? `${formatCount(summary.total_items)} items · ${formatCompactCurrency(summary.total_value)} · ${formatCount(summary.by_branch.length)} branches`
    : `No movement for more than ${ageDays} days`;

  // The pinned company, spelled out in the panel's own line so the figure is
  // never read as "the company I am currently in".
  const company = formatCompanyChip(companyCode);
  const where = [company, scope.length > 0 ? scope.join(', ') : ''].filter(Boolean).join(' · ');

  return (
    <ControlSection
      className={className}
      id="non-moving"
      title="Non-Moving Stock"
      description={
        where
          ? `${where} — no movement for more than ${ageDays} days`
          : `Material with no movement for more than ${ageDays} days`
      }
      meta={meta}
      icon={PackageX}
      accent={SECTION_ACCENT.nonMoving}
      isFetching={isFetching && !loading}
      action={{ label: 'Full report', to: '/dashboards/non-moving' }}
    >
      {error ? (
        <ControlError
          error={error}
          // A 403 here is the ordinary case of a user who does not hold the
          // pinned company, not a broken feed — say which company that is, since
          // switching to it is not the fix either (the read is pinned).
          fallback={
            (error as { status?: number })?.status === 403
              ? `This panel reports on ${company} stock, which you do not have access to.`
              : 'The non-moving report could not be read from SAP.'
          }
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : !summary ? (
        <ControlEmpty message="Non-moving stock could not be read." />
      ) : visible.length === 0 ? (
        <ControlEmpty
          message={
            scope.length > 0
              ? `${scope.join(', ')} (${company}) is holding no non-moving stock.`
              : 'No factory warehouse is holding non-moving stock.'
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ControlScrollList
            grow={visibleItems.length === 0}
            maxHeight={visible.length > 2 ? 'max-h-[11rem]' : undefined}
          >
            {visible.map((warehouse) => {
              const width = largest > 0 ? (warehouse.total_value / largest) * 100 : 0;
              const worst = oldestDays(warehouse.items);
              return (
                <li key={warehouse.warehouse}>
                  <button
                    type="button"
                    onClick={() => showNonMovingWarehouse(warehouse, ageDays)}
                    className="w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
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
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="text-right">
                          <p className={cn('text-sm font-semibold tabular-nums', accent.text)}>
                            {formatCompactCurrency(warehouse.total_value)}
                          </p>
                          {worst > 0 && (
                            <p
                              className={cn(
                                'flex items-center justify-end gap-1 text-xs tabular-nums',
                                MOVEMENT_AGE_TONE[getMovementStatus(worst)],
                              )}
                            >
                              <CalendarOff className="h-3 w-3" />
                              {formatCount(worst)}d
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div
                      className={cn('mt-2 h-1.5 w-full overflow-hidden rounded-full', accent.track)}
                    >
                      <div
                        className={cn('h-full rounded-full transition-all', accent.fill)}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ControlScrollList>

          {visibleItems.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Standing longest
                </h4>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCount(items.length)} item{items.length === 1 ? '' : 's'} ·{' '}
                  {formatCompactCurrency(itemValue)}
                </p>
              </div>
              <ControlScrollList grow>
                {visibleItems.map((row) => (
                  <ItemRow key={row.itemCode || row.itemName} row={row} largest={largestItem} />
                ))}
              </ControlScrollList>
              {hiddenItems > 0 && (
                <p className="mt-1.5 shrink-0 text-xs text-muted-foreground">
                  {formatCount(hiddenItems)} further item{hiddenItems === 1 ? '' : 's'} are not
                  drawn.
                </p>
              )}
            </div>
          )}

          {hidden > 0 && (
            <p className="shrink-0 text-xs text-muted-foreground">
              {formatCount(hidden)} more warehouse{hidden === 1 ? '' : 's'} in scope are not drawn.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
