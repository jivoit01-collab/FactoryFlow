import { useMemo } from 'react';

import { DrillSub, OpsDrill, useExpandedRow } from '../../../logistics-control/components';
import type { NonMovingItem, PlantBoardStore } from '../../types';
import { money, NO_ROWS, shortDate, whole } from './format';

type Store = PlantBoardStore['stock_space'];
type StoreRow = Store['area']['by_store'][number];
type Block = Store['area']['blocks'][number];
type StoreSetting = Store['stores'][number];

/**
 * The measured floor one store stands on.
 *
 * Blocks rather than a single figure because that is how the factory measured
 * it: the first block covers three warehouses and CANNOT be split between
 * them, so a store inside it shares its square feet with its neighbours. A
 * per-store area invented by dividing would read as measurement and would not
 * be one.
 */
function StoreFloor({
  row,
  blocks,
  setting,
}: {
  row: StoreRow;
  blocks: Block[];
  setting?: StoreSetting;
}) {
  return (
    <DrillSub
      lede={`The measured floor ${row.warehouse} stands on`}
      stats={
        <>
          <b>{whole(row.pallets)}</b> {row.pallets === 1 ? 'pallet' : 'pallets'} ·{' '}
          <b>{money(row.value)}</b> held
          {setting?.capacity_tonnes != null && (
            <>
              {' '}
              · rated <b>{whole(setting.capacity_tonnes)}</b> t
            </>
          )}
          {/* The audit is the only check on every figure above it, so a store
              nobody has counted says so rather than leaving the reader to
              assume somebody has. */}
          <>
            {' '}
            · last counted{' '}
            <b>
              {setting?.last_audit_date ? shortDate(setting.last_audit_date) : 'never'}
            </b>
          </>
        </>
      }
      rows={blocks}
      rowKey={(block) => block.key}
      empty="No measured block covers this store — its floor is not in the survey."
      columns={[
        { label: 'Block', cell: (block) => block.label, width: '26%' },
        {
          label: 'Floor',
          cell: (block) => `${whole(block.sqft)} sq ft`,
          numeric: true,
          width: '18%',
        },
        {
          // Who else is standing on the same measurement. A block covering
          // three warehouses is one number for all three, and a reader
          // comparing two stores has to know when they are sharing.
          label: 'Shared with',
          cell: (block) =>
            block.warehouses.filter((code) => code !== row.warehouse).join(', ') || 'nobody',
          dim: true,
          width: '56%',
        },
      ]}
    />
  );
}

/** The packaging floor, store by store, and the blocks each one sits in. */
export function StockSpaceDrill({
  store,
  onClose,
}: {
  store: PlantBoardStore | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const area = store?.stock_space.area;
  const blocks = area?.blocks ?? [];
  const settings = store?.stock_space.stores ?? [];

  return (
    <OpsDrill<StoreRow>
      title="Stock space"
      subtitle="Measured floor against the stock standing on it — open a store for its blocks"
      domain="store"
      onClose={onClose}
      stats={[
        { label: 'Floor', value: `${whole(area?.sqft)} sq ft` },
        { label: 'In use', value: `${whole(area?.occupied_sqft)} sq ft` },
        { label: 'Free', value: `${whole(area?.free_sqft)} sq ft` },
        { label: 'Pallets standing', value: whole(area?.pallets) },
        { label: 'Held', value: money(area?.held_value) },
        { label: 'No pallet figure', value: whole(area?.unmeasured_items) },
      ]}
      breakdown={{
        title: 'The floor as it was measured',
        items: blocks.map((block) => ({
          key: block.key,
          label: block.label,
          value: `${whole(block.sqft)} sq ft`,
        })),
        empty: 'No floor blocks are configured.',
      }}
      rows={area?.by_store ?? []}
      rowKey={(row) => row.warehouse}
      empty="No packaging store is holding stock."
      onRowClick={(row) => toggle(row.warehouse)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <StoreFloor
          row={row}
          blocks={blocks.filter((block) => block.warehouses.includes(row.warehouse))}
          setting={settings.find((entry) => entry.warehouse === row.warehouse)}
        />
      )}
      columns={[
        { label: 'Store', cell: (row) => row.warehouse },
        { label: 'SKUs', cell: (row) => whole(row.items), numeric: true },
        { label: 'Pieces', cell: (row) => whole(row.pieces), numeric: true },
        { label: 'Pallets', cell: (row) => whole(row.pallets), numeric: true },
        {
          label: 'Floor used',
          cell: (row) => (row.occupied_sqft === null ? '—' : `${whole(row.occupied_sqft)} sq ft`),
          numeric: true,
        },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
      ]}
    />
  );
}

/** One band of the idle range, as the Non-Moving dashboard defines it. */
interface IdleBand {
  key: 'slow-moving' | 'non-moving';
  label: string;
  /** Every SKU in the band — the snapshot's own count, not the listed rows. */
  skus: number;
  value: number;
  /** How many of the band the feed actually names. */
  listed: number;
}

/** The named SKUs of one idle band, longest-standing first. */
function IdleBandItems({ band, items }: { band: IdleBand; items: NonMovingItem[] }) {
  const sorted = [...items].sort((a, b) => b.days - a.days);
  const listedValue = items.reduce((total, item) => total + (item.value ?? 0), 0);

  return (
    <DrillSub
      lede={
        band.listed < band.skus
          ? // The count above is every idle SKU; the feed carries the worst of
            // them. A list that did not admit the gap would be read as the
            // whole band.
            `The worst ${whole(band.listed)} of ${whole(band.skus)} ${band.label.toLowerCase()} SKUs`
          : `All ${whole(band.skus)} ${band.label.toLowerCase()} SKUs`
      }
      stats={
        <>
          <b>{money(listedValue)}</b> of <b>{money(band.value)}</b> in the band
        </>
      }
      rows={sorted}
      rowKey={(item) => item.item_code}
      empty="The feed names no SKU in this band."
      columns={[
        { label: 'Item', cell: (item) => item.item_name, width: '36%' },
        { label: 'Code', cell: (item) => item.item_code, dim: true, width: '13%' },
        {
          label: 'Store',
          cell: (item) => item.warehouses.join(', ') || '—',
          dim: true,
          width: '16%',
        },
        { label: 'Idle days', cell: (item) => whole(item.days), numeric: true, width: '11%' },
        { label: 'Quantity', cell: (item) => whole(item.quantity), numeric: true, width: '11%' },
        { label: 'Value', cell: (item) => money(item.value), numeric: true, width: '13%' },
      ]}
    />
  );
}

/** What has stood still in the stores, by how long, and the SKUs in a band. */
export function StoreNonMovingDrill({
  store,
  onClose,
}: {
  store: PlantBoardStore | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const idle = store?.non_moving;
  const items = useMemo(() => idle?.items ?? [], [idle?.items]);

  /*
   * Two rows, and both are the SNAPSHOT's own counts rather than a tally of
   * the rows underneath.
   *
   * The tile counts every idle SKU; the feed lists only the worst of them. A
   * band row built by counting the list would say "3 SKUs" beside a tile
   * saying 120, and a drill-down that disagrees with the tile that opened it
   * is worse than no drill-down. The list discloses its own truncation one
   * level down instead.
   */
  const bands = useMemo<IdleBand[]>(() => {
    if (!idle) return [];
    return [
      {
        key: 'non-moving' as const,
        label: 'Non-moving over 45 days',
        skus: idle.non_moving_count,
        value: idle.non_moving_value,
        listed: items.filter((item) => item.status === 'non-moving').length,
      },
      {
        key: 'slow-moving' as const,
        label: 'Slow-moving 30–45 days',
        skus: idle.slow_moving_count,
        value: idle.slow_moving_value,
        listed: items.filter((item) => item.status === 'slow-moving').length,
      },
    ].filter((band) => band.skus > 0 || band.listed > 0);
  }, [idle, items]);

  return (
    <OpsDrill<IdleBand>
      title="Non-moving stock"
      subtitle={idle?.basis}
      domain="store"
      onClose={onClose}
      stats={[
        { label: 'Idle in the stores', value: money(idle?.total_value) },
        { label: 'SKUs idle', value: whole(idle?.item_count) },
        { label: 'Slow 30–45d', value: whole(idle?.slow_moving_count) },
        { label: 'Non-moving 45d+', value: whole(idle?.non_moving_count) },
        { label: 'Oldest', value: `${whole(idle?.oldest_days)} days` },
        { label: 'Still moving', value: whole(idle?.recent_count) },
      ]}
      rows={bands}
      rowKey={(row) => row.key}
      empty="Nothing in the stores has stood still."
      onRowClick={(row) => toggle(row.key)}
      // A band the feed names nothing in cannot be opened: the count is real,
      // the list behind it is empty, and a chevron would promise otherwise.
      canOpenRow={(row) => row.listed > 0}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <IdleBandItems
          band={row}
          items={items.filter((item) => item.status === row.key)}
        />
      )}
      columns={[
        { label: 'How long it has stood', cell: (row) => row.label },
        { label: 'SKUs', cell: (row) => whole(row.skus), numeric: true },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
        {
          label: 'Share of the idle money',
          numeric: true,
          cell: (row) =>
            (idle?.total_value ?? 0) > 0
              ? `${Math.round((row.value / (idle?.total_value ?? 1)) * 100)}%`
              : '—',
        },
        {
          label: 'Named below',
          // What the panel can actually show of the band, stated on the row
          // that opens it rather than discovered after clicking.
          cell: (row) => `${whole(row.listed)} of ${whole(row.skus)}`,
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}

/** Today's packing-material intake. Totals only — the register holds the trucks. */
export function PmVehiclesDrill({
  store,
  onClose,
}: {
  store: PlantBoardStore | null;
  onClose: () => void;
}) {
  const vehicles = store?.pm_vehicles_today;
  return (
    <OpsDrill<never>
      title="Packing material in"
      subtitle="Trucks unloaded at the gate today, and what SAP has been told about them"
      domain="store"
      onClose={onClose}
      stats={[
        { label: 'Vehicles', value: whole(vehicles?.count) },
        { label: 'POs', value: whole(vehicles?.po_count) },
        { label: 'Lines', value: whole(vehicles?.line_count) },
        { label: 'Received at the gate', value: whole(vehicles?.received_qty) },
        { label: 'Booked to SAP', value: whole(vehicles?.accepted_qty) },
        { label: 'Rejected', value: whole(vehicles?.rejected_qty) },
      ]}
      breakdown={{
        title: 'What the gate took in',
        items: [
          { key: 'booked', label: 'Booked to SAP', value: whole(vehicles?.accepted_qty) },
          { key: 'rejected', label: 'Rejected', value: whole(vehicles?.rejected_qty) },
          {
            key: 'awaiting',
            label: 'Awaiting GRPO',
            value: whole(vehicles?.awaiting_grpo_qty),
            // Stock in the building SAP does not have yet. On a board scoped
            // to today this is usually most of the day's intake, and is not a
            // quality problem.
            sub: 'in the building, not yet in SAP',
          },
        ],
      }}
      rows={[]}
      rowKey={(_row, index) => String(index)}
      empty="The board carries today's totals. The individual vehicles are on the Raw Material Gate-in register."
      columns={NO_ROWS}
    />
  );
}

/** Blowing over the plan month, day by day. */
export function BlowingDrill({
  store,
  onClose,
}: {
  store: PlantBoardStore | null;
  onClose: () => void;
}) {
  const blowing = store?.blowing;
  return (
    <OpsDrill<{ date: string; bottles: number }>
      title="Blowing this month"
      subtitle={blowing?.basis}
      domain="store"
      onClose={onClose}
      stats={[
        { label: 'Bottles made', value: whole(blowing?.bottles_made) },
        { label: 'Rejected', value: whole(blowing?.bottles_rejected) },
        { label: 'Cost', value: money(blowing?.cost) },
        { label: 'Per bottle', value: money(blowing?.cost_per_bottle) },
        { label: 'Runs', value: whole(blowing?.runs) },
        { label: 'Not costed yet', value: whole(blowing?.uncosted_runs) },
      ]}
      breakdown={{
        title: 'What the money went on',
        items: [
          { key: 'preform', label: 'Preform', value: money(blowing?.preform_cost) },
          { key: 'conversion', label: 'Conversion', value: money(blowing?.conversion_cost) },
        ],
      }}
      rows={blowing?.daily ?? []}
      rowKey={(row) => row.date}
      empty="No blowing run in the window."
      columns={[
        { label: 'Day', cell: (row) => shortDate(row.date) },
        { label: 'Bottles', cell: (row) => whole(row.bottles), numeric: true },
      ]}
    />
  );
}
