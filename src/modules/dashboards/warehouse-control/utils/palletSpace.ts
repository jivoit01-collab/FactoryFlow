/**
 * Pallet-space arithmetic for the Warehouse Control board.
 *
 * Answers one question — how many pallet slots does the warehouse have, and how
 * many are filled — from the WMS layout (`locations`) and the pallets placed on
 * it. Pure and side-effect-free so the numbers can be tested without a store.
 *
 * Space is counted per storage cell: its configured `capacity.maxPallets`, or
 * one slot when nothing is configured. Cells that hold no stock (paths, offices,
 * obstacles) and disabled cells carry no space at all.
 */
import type {
  CellPurpose,
  Pallet,
  Warehouse,
  WarehouseLocation,
  WmsSettings,
} from '@/modules/wms';
import { locationHoldsStock } from '@/modules/wms';

import {
  DEFAULT_PALLET_SLOTS_PER_LOCATION,
  NON_OCCUPYING_PALLET_STATUSES,
  UNAVAILABLE_LOCATION_STATUSES,
} from '../constants';
import type {
  PalletSpaceSummary,
  PalletSpaceWarehouseRow,
  StoredGoodsRow,
  StoredGoodsWarehouseRow,
} from '../types';

export interface PalletSpaceInput {
  warehouses: Warehouse[];
  locations: WarehouseLocation[];
  pallets: Pallet[];
  purposes: CellPurpose[];
}

/** Slots a single cell contributes. Absent capacity means one pallet per cell. */
function slotsFor(location: WarehouseLocation): number {
  const configured = location.capacity?.maxPallets;
  if (configured == null || configured <= 0) return DEFAULT_PALLET_SLOTS_PER_LOCATION;
  return configured;
}

/** A pallet still standing somewhere — shipped and removed ones hold no slot. */
function occupiesSpace(pallet: Pallet): boolean {
  return !NON_OCCUPYING_PALLET_STATUSES.includes(pallet.status);
}

function isUnavailable(location: WarehouseLocation): boolean {
  return UNAVAILABLE_LOCATION_STATUSES.includes(location.status);
}

function percentage(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((used / total) * 1000) / 10;
}

interface WarehouseAccumulator {
  totalSpace: number;
  usedSpace: number;
  unavailableSpace: number;
  storageLocations: number;
  locationsWithoutCapacity: number;
}

function emptyAccumulator(): WarehouseAccumulator {
  return {
    totalSpace: 0,
    usedSpace: 0,
    unavailableSpace: 0,
    storageLocations: 0,
    locationsWithoutCapacity: 0,
  };
}

export function summarisePalletSpace(input: PalletSpaceInput): PalletSpaceSummary {
  const purposesById = new Map(input.purposes.map((purpose) => [purpose.id, purpose]));
  const warehouseNames = new Map(input.warehouses.map((warehouse) => [warehouse.id, warehouse]));

  // Only cells that can actually take a pallet count as space.
  const storageLocations = input.locations.filter(
    (location) => location.enabled && locationHoldsStock(location, purposesById),
  );
  const storageById = new Map(storageLocations.map((location) => [location.id, location]));

  const byWarehouse = new Map<string, WarehouseAccumulator>();
  const accumulatorFor = (warehouseId: string) => {
    const existing = byWarehouse.get(warehouseId);
    if (existing) return existing;
    const created = emptyAccumulator();
    byWarehouse.set(warehouseId, created);
    return created;
  };

  for (const location of storageLocations) {
    const accumulator = accumulatorFor(location.warehouseId);
    const slots = slotsFor(location);
    accumulator.totalSpace += slots;
    accumulator.storageLocations += 1;
    if (location.capacity?.maxPallets == null) accumulator.locationsWithoutCapacity += 1;
    if (isUnavailable(location)) accumulator.unavailableSpace += slots;
  }

  let unplacedPallets = 0;
  let totalBoxes = 0;
  // Keyed on item code where there is one, else the name — a pallet with neither
  // still deserves a line rather than being silently dropped from the total.
  const goodsByItem = new Map<string, StoredGoodsRow>();

  for (const pallet of input.pallets) {
    if (!occupiesSpace(pallet)) continue;
    if (!pallet.currentLocationId) {
      unplacedPallets += 1;
      continue;
    }
    const location = storageById.get(pallet.currentLocationId);
    // A pallet parked on a non-storage or disabled cell is not in the rack, so
    // it neither fills a slot nor counts as unplaced stock.
    if (!location) continue;
    accumulatorFor(location.warehouseId).usedSpace += 1;

    const boxes = Number.isFinite(pallet.boxCount) ? pallet.boxCount : 0;
    totalBoxes += boxes;

    const itemCode = pallet.itemCode?.trim() ?? '';
    const itemName = pallet.itemName?.trim() ?? '';
    const key = itemCode || itemName || 'UNIDENTIFIED';
    let row = goodsByItem.get(key);
    if (row) {
      row.pallets += 1;
      row.boxes += boxes;
      // Earlier pallets may carry only a code; take a name from whichever has one.
      if (!row.itemName && itemName) row.itemName = itemName;
    } else {
      row = { itemCode, itemName, pallets: 1, boxes, warehouses: [] };
      goodsByItem.set(key, row);
    }

    // A handful of warehouses at most, so a scan beats a second map.
    const tag = row.warehouses.find((entry) => entry.warehouseId === location.warehouseId);
    if (tag) {
      tag.pallets += 1;
      tag.boxes += boxes;
    } else {
      const warehouse = warehouseNames.get(location.warehouseId);
      row.warehouses.push({
        warehouseId: location.warehouseId,
        code: warehouse?.code ?? '-',
        name: warehouse?.name ?? 'Unknown warehouse',
        pallets: 1,
        boxes,
      });
    }
  }

  const byBoxes = (a: StoredGoodsWarehouseRow, b: StoredGoodsWarehouseRow) =>
    b.boxes - a.boxes || b.pallets - a.pallets || a.name.localeCompare(b.name);

  const goods = [...goodsByItem.values()]
    .map((row) => ({ ...row, warehouses: [...row.warehouses].sort(byBoxes) }))
    .sort(
      (a, b) => b.boxes - a.boxes || b.pallets - a.pallets || a.itemName.localeCompare(b.itemName),
    );

  const rows: PalletSpaceWarehouseRow[] = [...byWarehouse.entries()]
    .map(([warehouseId, accumulator]) => {
      const warehouse = warehouseNames.get(warehouseId);
      return {
        warehouseId,
        code: warehouse?.code ?? '-',
        name: warehouse?.name ?? 'Unknown warehouse',
        totalSpace: accumulator.totalSpace,
        usedSpace: accumulator.usedSpace,
        unavailableSpace: accumulator.unavailableSpace,
        freeSpace: Math.max(
          0,
          accumulator.totalSpace - accumulator.usedSpace - accumulator.unavailableSpace,
        ),
        utilisationPct: percentage(accumulator.usedSpace, accumulator.totalSpace),
        storageLocations: accumulator.storageLocations,
        locationsWithoutCapacity: accumulator.locationsWithoutCapacity,
      };
    })
    .sort((a, b) => b.totalSpace - a.totalSpace || a.name.localeCompare(b.name));

  const totals = rows.reduce(
    (sum, row) => ({
      totalSpace: sum.totalSpace + row.totalSpace,
      usedSpace: sum.usedSpace + row.usedSpace,
      unavailableSpace: sum.unavailableSpace + row.unavailableSpace,
      locationsWithoutCapacity: sum.locationsWithoutCapacity + row.locationsWithoutCapacity,
    }),
    { totalSpace: 0, usedSpace: 0, unavailableSpace: 0, locationsWithoutCapacity: 0 },
  );

  return {
    totalSpace: totals.totalSpace,
    usedSpace: totals.usedSpace,
    unavailableSpace: totals.unavailableSpace,
    freeSpace: Math.max(0, totals.totalSpace - totals.usedSpace - totals.unavailableSpace),
    utilisationPct: percentage(totals.usedSpace, totals.totalSpace),
    unplacedPallets,
    locationsWithoutCapacity: totals.locationsWithoutCapacity,
    warehouses: rows,
    goods,
    totalBoxes,
  };
}

/**
 * Is the WMS module switched on anywhere?
 *
 * The master switch is a per-company singleton, so reading it across companies
 * returns one row per company — all under the same `wms-settings` id. The board
 * measures one physical building, so any company having switched the module on
 * means there is a layout to measure: `some`, not `every`, and not "the first
 * row wins".
 */
export function isWmsEnabledForAnyCompany(settings: WmsSettings[] | undefined): boolean {
  return (settings ?? []).some((row) => Boolean(row?.masterEnabled));
}
