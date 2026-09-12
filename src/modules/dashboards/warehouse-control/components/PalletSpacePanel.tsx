import { Warehouse } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_MAX_RENDERED_ROWS } from '../constants';
import { ACCENTS, occupancyAccent, SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { PalletSpaceSummary, PalletSpaceWarehouseRow, StoredGoodsRow } from '../types';
import { formatCount, formatPercent } from '../utils/format';
import { shortWarehouseTags } from '../utils/warehouseTag';
import { CapacityMeter } from './CapacityMeter';
import { ControlScrollList } from './ControlScrollList';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlSkeletonBar } from './ControlStates';

export interface PalletSpacePanelProps {
  summary: PalletSpaceSummary;
  loading: boolean;
  /** The WMS module is switched off, so there is no layout to measure. */
  moduleOff: boolean;
  /** Grid placement, set by the board. */
  className?: string;
}

function WarehouseRow({ row }: { row: PalletSpaceWarehouseRow }) {
  const accent = ACCENTS[occupancyAccent(row.utilisationPct)];

  return (
    <li className="px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.code} · {formatCount(row.storageLocations)} cells
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-semibold tabular-nums', accent.text)}>
            {formatPercent(row.utilisationPct)}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatCount(row.freeSpace)} free
          </p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', accent.fill)}
          style={{ width: `${Math.min(100, row.utilisationPct)}%` }}
        />
      </div>
    </li>
  );
}

/**
 * One product line — "CANOLA 4 LTR · 500 boxes on 12 pallets".
 *
 * Boxes is the number the floor talks in, so it is the figure on the right and
 * the one the bar is scaled against; the pallet count rides underneath as the
 * secondary fact.
 *
 * The line totals every warehouse, so it carries a tag for each one it stands
 * in — otherwise a reader cannot tell Gupta stock from Basement stock, or see
 * that a line is split across both.
 */
function GoodsRow({
  row,
  largest,
  tags,
}: {
  row: StoredGoodsRow;
  largest: number;
  tags: Map<string, string>;
}) {
  const accent = ACCENTS[SECTION_ACCENT.palletSpace];
  const width = largest > 0 ? (row.boxes / largest) * 100 : 0;
  const palletWord = row.pallets === 1 ? 'pallet' : 'pallets';

  return (
    <li className="px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.itemName || row.itemCode || 'Unidentified stock'}
          </p>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate">
              {row.itemCode && row.itemName ? `${row.itemCode} · ` : ''}
              {formatCount(row.pallets)} {palletWord}
            </span>
            {row.warehouses.map((warehouse) => (
              <span
                key={warehouse.warehouseId}
                className="shrink-0 rounded border border-border/70 bg-muted/60 px-1 py-px text-[10px] font-medium uppercase tracking-wide"
                title={`${warehouse.name} · ${formatCount(warehouse.pallets)} ${
                  warehouse.pallets === 1 ? 'pallet' : 'pallets'
                } · ${formatCount(warehouse.boxes)} boxes`}
              >
                {tags.get(warehouse.warehouseId) ?? warehouse.name}
              </span>
            ))}
          </div>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCount(row.boxes)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">boxes</span>
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
 * Total pallet space against what is filled, company-wide and per warehouse.
 *
 * Space comes from the WMS layout, so the panel only means anything once a
 * warehouse has been drawn there. Every other state says so in words rather than
 * showing a zero that reads like an empty warehouse.
 */
export function PalletSpacePanel({
  summary,
  loading,
  moduleOff,
  className,
}: PalletSpacePanelProps) {
  const ranked = summary.warehouses.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hidden = summary.warehouses.length - ranked.length;
  const hasLayout = summary.warehouses.length > 0;

  // The panel is the shortest of the three in its row, so the space under the
  // warehouse bars goes to what the racking is holding.
  const goods = summary.goods.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hiddenGoods = summary.goods.length - goods.length;
  const largestGoods = goods[0]?.boxes ?? 0;
  // Built from every warehouse, not just the drawn ones, so two names that
  // shorten alike are still caught.
  const tags = useMemo(() => shortWarehouseTags(summary.warehouses), [summary.warehouses]);

  const meta = hasLayout
    ? `${formatCount(summary.totalSpace)} slots across ${formatCount(summary.warehouses.length)} warehouses`
    : 'Rack slots and what is standing in them';

  return (
    <ControlSection
      className={className}
      id="pallet-space"
      title="Pallet Space"
      description="Rack slots across every company's warehouse layout, and how many carry a pallet"
      meta={meta}
      icon={Warehouse}
      accent={SECTION_ACCENT.palletSpace}
      action={moduleOff ? undefined : { label: 'Warehouse Ops', to: '/warehouse-ops' }}
    >
      {moduleOff ? (
        <ControlEmpty message="Warehouse Ops is switched off in every company you can see, so there is no layout to measure." />
      ) : loading ? (
        <div className="space-y-4">
          <ControlSkeletonBar className="h-10 w-40" />
          <ControlSkeletonBar className="h-2.5 w-full" />
          <ControlSkeletonBar className="h-24 w-full" />
        </div>
      ) : !hasLayout ? (
        <ControlEmpty message="No warehouse layout has been drawn yet in Warehouse Ops." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <CapacityMeter
            className="shrink-0"
            headline
            total={summary.totalSpace}
            used={summary.usedSpace}
            unavailable={summary.unavailableSpace}
          />

          <ControlScrollList maxHeight="max-h-[11rem]">
            {ranked.map((row) => (
              <WarehouseRow key={row.warehouseId} row={row} />
            ))}
          </ControlScrollList>

          {goods.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  On the pallets
                </h4>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCount(summary.totalBoxes)} boxes · {formatCount(summary.goods.length)}{' '}
                  items
                </p>
              </div>
              <ControlScrollList grow>
                {goods.map((row) => (
                  <GoodsRow
                    key={row.itemCode || row.itemName}
                    row={row}
                    largest={largestGoods}
                    tags={tags}
                  />
                ))}
              </ControlScrollList>
              {hiddenGoods > 0 && (
                <p className="mt-1.5 shrink-0 text-xs text-muted-foreground">
                  {formatCount(hiddenGoods)} further item{hiddenGoods === 1 ? '' : 's'} are not
                  drawn.
                </p>
              )}
            </div>
          )}

          <div className="shrink-0 space-y-1 text-xs text-muted-foreground">
            {hidden > 0 && (
              <p>
                {formatCount(hidden)} more warehouse{hidden === 1 ? '' : 's'} in Warehouse Ops.
              </p>
            )}
            {summary.unplacedPallets > 0 && (
              <p>
                {formatCount(summary.unplacedPallets)} pallets are off the map and hold no slot.
              </p>
            )}
            {summary.locationsWithoutCapacity > 0 && (
              <p>
                {formatCount(summary.locationsWithoutCapacity)} cells have no pallet capacity set
                and are counted as one slot each.
              </p>
            )}
          </div>
        </div>
      )}
    </ControlSection>
  );
}
