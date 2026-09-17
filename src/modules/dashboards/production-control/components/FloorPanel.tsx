import { PackageX, Warehouse } from 'lucide-react';

import {
  ControlEmpty,
  ControlError,
  ControlScrollList,
  ControlSection,
  ControlSkeletonRows,
} from '@/modules/dashboards/warehouse-control/components';
import { ACCENTS } from '@/modules/dashboards/warehouse-control/constants/warehouse-control.theme';
import {
  formatCompactCurrency,
  formatCount,
} from '@/modules/dashboards/warehouse-control/utils/format';
import { cn } from '@/shared/utils';

import {
  CONTROL_WAREHOUSE,
  MAX_RENDERED_ROWS,
  OCCUPANCY_ALERT_PERCENT,
  PANEL_ACCENT,
} from '../constants';
import { type Occupancy, occupancyNote, type OccupancyRow } from '../utils';

export interface FloorPanelProps {
  occupancy: Occupancy | null;
  stockValue: number;
  unconfiguredItems: number;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
}

/** Green with room, amber past the alert line, red past capacity itself. */
function toneFor(occupancy: Occupancy) {
  if (occupancy.over) return { text: 'text-rose-600 dark:text-rose-400', fill: 'bg-rose-500' };
  if (occupancy.alert) return { text: 'text-amber-600 dark:text-amber-400', fill: 'bg-amber-500' };
  return { text: 'text-emerald-600 dark:text-emerald-400', fill: 'bg-emerald-500' };
}

const accent = ACCENTS[PANEL_ACCENT.occupancy];

function ItemRow({ row, largest }: { row: OccupancyRow; largest: number }) {
  const width = largest > 0 ? (row.pallets / largest) * 100 : 0;

  return (
    <li className="px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.itemName || row.itemCode}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.itemCode} ·{' '}
            {row.boxes != null
              ? `${formatCount(row.boxes)} boxes`
              : /* A loose SKU has no box count to show, so it says which
                   estimate converted it instead of implying a measurement. */
                `${formatCount(row.pieces)} loose · est.`}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {row.pallets < 1 ? '<1' : formatCount(row.pallets)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">plt</span>
        </p>
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
 * How full BH-PF is, and what is taking the room.
 *
 * The percentage is the point of the panel, so it carries the whole headline and
 * the threshold is drawn on the bar rather than described in a legend. Capacity
 * came from the warehouse rather than any system, and the footnote says so —
 * a board claiming a floor is over capacity owes the reader its basis.
 */
export function FloorPanel({
  occupancy,
  stockValue,
  unconfiguredItems,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: FloorPanelProps) {
  const tone = occupancy ? toneFor(occupancy) : null;
  const rows = occupancy?.rows.slice(0, MAX_RENDERED_ROWS) ?? [];
  const hidden = (occupancy?.rows.length ?? 0) - rows.length;
  const largest = rows[0]?.pallets ?? 0;

  // The bar runs to 130% of capacity so an overload reads as one instead of
  // pinning at a full bar that looks merely "full".
  const scale = 130;
  const fillWidth = occupancy ? Math.min((occupancy.percent / scale) * 100, 100) : 0;
  // Split proportionally to the two halves, so the segments together are the
  // fill and never overshoot it once the bar is clamped at the scale.
  const measuredShare =
    occupancy && occupancy.pallets > 0 ? occupancy.measuredShown / occupancy.pallets : 1;
  const measuredWidth = fillWidth * measuredShare;
  const estimatedWidth = fillWidth - measuredWidth;

  return (
    <ControlSection
      className={className}
      id="floor"
      title={`${CONTROL_WAREHOUSE} Floor`}
      description="Stock on the production-finished floor, against its pallet capacity"
      meta={
        occupancy
          ? `${formatCount(occupancy.rows.length)} items · ${formatCount(occupancy.totalPieces)} pcs · ${formatCompactCurrency(stockValue)}`
          : undefined
      }
      icon={Warehouse}
      accent={PANEL_ACCENT.occupancy}
      isFetching={isFetching && !loading}
      action={{ label: 'Stock', to: '/dashboards/stock-level' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback={`${CONTROL_WAREHOUSE} stock could not be read from SAP.`}
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={5} />
      ) : !occupancy || occupancy.rows.length === 0 ? (
        <ControlEmpty message={`${CONTROL_WAREHOUSE} is holding no stock.`} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="shrink-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={cn('text-4xl font-semibold leading-none tabular-nums', tone!.text)}>
                  {Math.round(occupancy.percent)}
                  <span className="ml-1 text-lg font-medium text-muted-foreground">% full</span>
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatCount(occupancy.pallets)} of {formatCount(occupancy.capacity)} pallets
                  {occupancy.over && ' · over capacity'}
                </p>
              </div>
              {/* Written as a sum, because it is one. Shown as two separate
                  lines the reader has to add up, "263 measured" beside a total
                  of 366 invites the question of whether it is being counted
                  twice — which is exactly what it did. */}
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {formatCount(occupancy.boxes)} boxes
                {occupancy.looseSkus > 0 ? (
                  <>
                    <br />
                    <span className="font-medium">
                      {formatCount(occupancy.measuredShown)} measured
                    </span>
                    {' + '}
                    <span className="font-medium">
                      {formatCount(occupancy.estimatedShown)} est.
                    </span>
                    <br />= {formatCount(occupancy.pallets)} pallets
                  </>
                ) : (
                  <>
                    <br />
                    {formatCount(occupancy.pallets)} pallets, all measured
                  </>
                )}
              </p>
            </div>

            <div className="relative mt-3 h-7 w-full overflow-visible rounded-md bg-muted">
              {/* The fill is drawn in its two parts rather than as one block, so
                  the split between what was measured and what was estimated is
                  visible in the bar and not only in the caption. The estimated
                  segment is the same hue at half strength — a second colour
                  would read as a different KIND of stock rather than the same
                  stock counted less certainly. */}
              <div
                className={cn('absolute inset-y-0 left-0 rounded-l-md transition-all', tone!.fill)}
                style={{ width: `${measuredWidth}%` }}
              />
              <div
                className={cn(
                  'absolute inset-y-0 rounded-r-md opacity-50 transition-all',
                  tone!.fill,
                )}
                style={{ left: `${measuredWidth}%`, width: `${estimatedWidth}%` }}
              />
              {/* The alert line and capacity, drawn where they fall on the scale. */}
              <div
                className="absolute -inset-y-1 w-0.5 bg-amber-500"
                style={{ left: `${(OCCUPANCY_ALERT_PERCENT / scale) * 100}%` }}
                aria-hidden
              />
              <div
                className="absolute -inset-y-1 w-0.5 bg-rose-500"
                style={{ left: `${(100 / scale) * 100}%` }}
                aria-hidden
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>
                {OCCUPANCY_ALERT_PERCENT}% alert · {formatCount(occupancy.capacity)} full
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <h4 className="mb-1.5 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Taking the room
            </h4>
            <ControlScrollList grow>
              {rows.map((row) => (
                <ItemRow key={row.itemCode} row={row} largest={largest} />
              ))}
            </ControlScrollList>
            {hidden > 0 && (
              <p className="mt-1.5 shrink-0 text-xs text-muted-foreground">
                {formatCount(hidden)} further item{hidden === 1 ? '' : 's'} are not drawn.
              </p>
            )}
          </div>

          <p className="shrink-0 text-xs leading-relaxed text-muted-foreground">
            {occupancyNote(occupancy)}
            {unconfiguredItems > 0 && (
              <>
                {' '}
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <PackageX className="h-3 w-3" />
                  {formatCount(unconfiguredItems)} SKU
                  {unconfiguredItems === 1 ? '' : 's'} have no pack size in SAP.
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </ControlSection>
  );
}
