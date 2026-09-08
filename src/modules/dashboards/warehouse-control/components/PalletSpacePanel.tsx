import { Warehouse } from 'lucide-react';

import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_PREVIEW_ROWS } from '../constants';
import { ACCENTS, occupancyAccent, SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { PalletSpaceSummary, PalletSpaceWarehouseRow } from '../types';
import { formatCount, formatPercent } from '../utils/format';
import { CapacityMeter } from './CapacityMeter';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlSkeletonBar } from './ControlStates';

export interface PalletSpacePanelProps {
  summary: PalletSpaceSummary;
  loading: boolean;
  /** The WMS module is switched off, so there is no layout to measure. */
  moduleOff: boolean;
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
 * Total pallet space against what is filled, company-wide and per warehouse.
 *
 * Space comes from the WMS layout, so the panel only means anything once a
 * warehouse has been drawn there. Every other state says so in words rather than
 * showing a zero that reads like an empty warehouse.
 */
export function PalletSpacePanel({ summary, loading, moduleOff }: PalletSpacePanelProps) {
  const ranked = summary.warehouses.slice(0, WAREHOUSE_CONTROL_PREVIEW_ROWS);
  const hidden = summary.warehouses.length - ranked.length;
  const hasLayout = summary.warehouses.length > 0;

  const meta = hasLayout
    ? `${formatCount(summary.totalSpace)} slots across ${formatCount(summary.warehouses.length)} warehouses`
    : 'Rack slots and what is standing in them';

  return (
    <ControlSection
      id="pallet-space"
      title="Pallet Space"
      description="Rack slots across the warehouse layout and how many carry a pallet"
      meta={meta}
      icon={Warehouse}
      accent={SECTION_ACCENT.palletSpace}
      action={moduleOff ? undefined : { label: 'Warehouse Ops', to: '/warehouse-ops' }}
    >
      {moduleOff ? (
        <ControlEmpty message="Warehouse Ops is switched off, so there is no layout to measure." />
      ) : loading ? (
        <div className="space-y-4">
          <ControlSkeletonBar className="h-10 w-40" />
          <ControlSkeletonBar className="h-2.5 w-full" />
          <ControlSkeletonBar className="h-24 w-full" />
        </div>
      ) : !hasLayout ? (
        <ControlEmpty message="No warehouse layout has been drawn yet in Warehouse Ops." />
      ) : (
        <div className="space-y-4">
          <CapacityMeter
            headline
            total={summary.totalSpace}
            used={summary.usedSpace}
            unavailable={summary.unavailableSpace}
          />

          <ul className="divide-y overflow-hidden rounded-lg border">
            {ranked.map((row) => (
              <WarehouseRow key={row.warehouseId} row={row} />
            ))}
          </ul>

          <div className="space-y-1 text-xs text-muted-foreground">
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
