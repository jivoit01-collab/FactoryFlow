/** Builders that turn lightweight input into fully-formed WMS records. */
import type {
  CellPurpose,
  InventoryRecord,
  MovementLogEntry,
  MovementType,
  Pallet,
  PalletStatus,
  WarehouseArea,
  WarehouseLocation,
  WmsId,
  Zone,
} from '../types';
import { createWmsId, nowIso } from '../utils';
import type { GeneratedLocation } from './layout';

/**
 * Default capacity / rules for a freshly generated block. Each grid cell
 * represents a single pallet slot, so pallet capacity defaults to 1; the other
 * dimensions stay unconstrained until edited (Step 4).
 */
function emptyLocationConfig() {
  return {
    capacity: { maxPallets: 1, maxUnits: null, maxWeight: null, maxVolume: null },
    dimensions: { length: null, width: null, height: null },
    materialRules: {
      allowedMaterialTypes: [],
      restrictedMaterialTypes: [],
      allowMixedItems: true,
      singleLotOnly: false,
      hazmatAllowed: false,
      hazmatClasses: [],
      temperatureClass: null,
    },
    replenishment: { minStock: null, maxStock: null },
    reservation: { isReserved: false, reference: '' },
  };
}

export function makeWarehouseLocation(
  warehouseId: WmsId,
  generated: GeneratedLocation,
  zoneId: WmsId | null = null,
): WarehouseLocation {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    warehouseId,
    zoneId,
    purposeId: null,
    code: generated.code,
    barcode: generated.barcode,
    column: generated.column,
    row: generated.row,
    level: generated.level,
    type: 'RACK',
    ...emptyLocationConfig(),
    status: 'ACTIVE',
    enabled: true,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface CellPurposeInput {
  name: string;
  code?: string;
  color: string;
  holdsStock: boolean;
}

export function makeCellPurpose(warehouseId: WmsId, input: CellPurposeInput): CellPurpose {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    warehouseId,
    code: input.code?.trim() || input.name.trim().toUpperCase().replace(/\s+/g, '-'),
    name: input.name.trim(),
    color: input.color,
    holdsStock: input.holdsStock,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface ZoneInput {
  name: string;
  code?: string;
  type: string;
  temperatureClass: Zone['temperatureClass'];
  color: string;
}

export function makeZone(warehouseId: WmsId, input: ZoneInput): Zone {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    warehouseId,
    code: input.code?.trim() || input.name.trim().toUpperCase().replace(/\s+/g, '-'),
    name: input.name.trim(),
    type: input.type,
    temperatureClass: input.temperatureClass,
    color: input.color,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface InventoryInput {
  locationId: WmsId;
  itemCode: string;
  itemName?: string;
  palletId?: WmsId | null;
  lotNumber?: string;
  serialNumber?: string;
  quantity: number;
  uom?: string;
  boxCount?: number | null;
  weight?: number | null;
  volume?: number | null;
  expiryDate?: string | null;
}

export function makeInventoryRecord(input: InventoryInput): InventoryRecord {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    locationId: input.locationId,
    itemCode: input.itemCode,
    itemName: input.itemName ?? '',
    palletId: input.palletId ?? null,
    lotNumber: input.lotNumber ?? '',
    serialNumber: input.serialNumber ?? '',
    quantity: input.quantity,
    uom: input.uom ?? 'EA',
    boxCount: input.boxCount ?? null,
    weight: input.weight ?? null,
    volume: input.volume ?? null,
    expiryDate: input.expiryDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface PalletInput {
  licensePlate: string;
  currentLocationId?: WmsId | null;
  itemCode: string;
  itemName?: string;
  boxCount: number;
  unitsPerBox?: number | null;
  totalUnits?: number | null;
  lotNumber?: string;
  expiryDate?: string | null;
  status?: PalletStatus;
}

export function makePallet(input: PalletInput): Pallet {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    licensePlate: input.licensePlate,
    currentLocationId: input.currentLocationId ?? null,
    itemCode: input.itemCode,
    itemName: input.itemName ?? '',
    boxCount: input.boxCount,
    unitsPerBox: input.unitsPerBox ?? null,
    totalUnits: input.totalUnits ?? null,
    lotNumber: input.lotNumber ?? '',
    expiryDate: input.expiryDate ?? null,
    status: input.status ?? 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface MovementInput {
  type: MovementType;
  itemCode?: string;
  itemName?: string;
  palletId?: WmsId | null;
  licensePlate?: string;
  fromLocationId?: WmsId | null;
  toLocationId?: WmsId | null;
  quantity?: number | null;
  boxCount?: number | null;
  lotNumber?: string;
  userId?: string;
  userName?: string;
  note?: string;
  auditConfirmed?: boolean | null;
  discrepancy?: boolean | null;
}

export function makeMovement(input: MovementInput): MovementLogEntry {
  return {
    id: createWmsId(),
    type: input.type,
    itemCode: input.itemCode ?? '',
    itemName: input.itemName ?? '',
    palletId: input.palletId ?? null,
    licensePlate: input.licensePlate ?? '',
    fromLocationId: input.fromLocationId ?? null,
    toLocationId: input.toLocationId ?? null,
    quantity: input.quantity ?? null,
    boxCount: input.boxCount ?? null,
    lotNumber: input.lotNumber ?? '',
    userId: input.userId ?? '',
    userName: input.userName ?? '',
    note: input.note ?? '',
    auditConfirmed: input.auditConfirmed ?? null,
    discrepancy: input.discrepancy ?? null,
    createdAt: nowIso(),
  };
}

export interface WarehouseAreaInput {
  name: string;
  prefix?: string;
  color: string;
  /** When set, this block joins an existing area (shared numbering). */
  groupId?: string;
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
}

export function makeWarehouseArea(input: WarehouseAreaInput): WarehouseArea {
  const id = createWmsId();
  return {
    id,
    groupId: input.groupId || id,
    name: input.name.trim(),
    prefix: (input.prefix ?? '').trim(),
    color: input.color,
    startColumn: input.startColumn,
    startRow: input.startRow,
    endColumn: input.endColumn,
    endRow: input.endRow,
  };
}

/** Preset area colours offered in the editor. */
export const AREA_COLOR_PRESETS: readonly string[] = [
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e0b', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#db2777', // pink
];

/** Preset cell-purpose colours offered in the editor. */
export const PURPOSE_COLOR_PRESETS: readonly string[] = [
  '#64748b', // slate — walkable path / aisle
  '#dc2626', // red — damaged goods
  '#f59e0b', // amber — staging
  '#0891b2', // cyan — receiving / dock
  '#7c3aed', // violet — quarantine
  '#16a34a', // green — storage
  '#a16207', // brown — obstacle / wall
  '#db2777', // pink — returns
];

/** Preset zone colours offered in the designer. */
export const ZONE_COLOR_PRESETS: readonly string[] = [
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e0b', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
];
