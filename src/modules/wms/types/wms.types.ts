/**
 * WMS (Warehouse Management System) — domain record types.
 *
 * Step 1 of the WMS build: every record the specification describes is defined
 * here. The module is fully dynamic and frontend-driven; these records are the
 * single source of truth that the storage adapter persists and every later
 * screen reads through the central store.
 *
 * Field-naming note: this module is browser-native (no backend mirror yet), so
 * records use camelCase. The future API adapter (see `storage/apiAdapter.ts`)
 * is the one place that will map to/from any backend representation.
 *
 * Computed-not-stored note: occupancy, status colour, and utilization are
 * DERIVED later from inventory + capacity (Step 5's occupancy engine). They are
 * deliberately NOT fields on any record here.
 */

/** Opaque identifier for every WMS record (generated with `crypto.randomUUID`). */
export type WmsId = string;

/** ISO-8601 timestamp string, e.g. `2026-06-26T10:00:00.000Z`. */
export type IsoDateTime = string;

export type PutawayMode = 'DIRECTED' | 'MANUAL' | 'HYBRID';
export type PickStrategy = 'FIFO' | 'LIFO' | 'FEFO';

/**
 * Self-contained module role. ADMIN/manager designs the warehouse, edits
 * properties/settings, and approves large audit discrepancies; OPERATOR runs
 * only the scan workflows. Stored in settings since the module is frontend-driven.
 */
export type WmsRole = 'ADMIN' | 'OPERATOR';

/** Whether a rule violation hard-blocks the action or only warns. */
export type ViolationMode = 'BLOCK' | 'WARN';

export type TemperatureClass = 'AMBIENT' | 'CHILLED' | 'FROZEN' | 'CONTROLLED';

/**
 * Movement / audit log entry kinds. Covers every flow in the later steps so the
 * log is a complete audit trail from the start.
 */
export type MovementType =
  | 'RECEIVE'
  | 'PUTAWAY'
  | 'TRANSFER'
  | 'PICK'
  | 'OUTBOUND'
  | 'ADJUSTMENT'
  | 'AUDIT'
  | 'CYCLE_COUNT';

/** Manual lifecycle status of a location (display colour is computed later). */
export type LocationStatus = 'ACTIVE' | 'BLOCKED' | 'DAMAGED' | 'MAINTENANCE' | 'RESERVED';

export type PalletStatus = 'ACTIVE' | 'PARTIAL' | 'EMPTY' | 'PICKED' | 'SHIPPED' | 'ON_HOLD';

/** Mixin every persisted record shares so the adapter can key on `id`. */
export interface WmsRecordBase {
  id: WmsId;
}

// ============================================================================
// Warehouse
// ============================================================================

/** How the designer auto-names columns / rows / levels when generating a grid. */
export interface WarehouseNamingScheme {
  columnStyle: 'LETTERS' | 'NUMBERS';
  rowStyle: 'LETTERS' | 'NUMBERS';
  levelStyle: 'LETTERS' | 'NUMBERS';
  /** Optional code prefix applied to generated location codes. */
  prefix: string;
  /** Separator placed between code segments (e.g. `-` → `A-01-1`). */
  separator: string;
}

/**
 * How a warehouse is managed:
 * - OWN: internally designed grid of locations/bins (the WMS designer flow).
 * - SAP: an external SAP warehouse with no internal locations; stock is
 *   transferred straight into it.
 */
export type WarehouseType = 'OWN' | 'SAP';

/**
 * A rectangular section of the grid with its own numbering. Its top-left cell is
 * the area's origin (labelled A-01), and `prefix` distinguishes its codes from
 * other areas (e.g. a side strip prefixed `S` → `S-A-01`). Cells that fall in no
 * area are "outside": they carry no code and are excluded from occupancy, moves,
 * and putaway. Grid coordinates are 0-based and inclusive of both corners.
 */
export interface WarehouseArea {
  id: WmsId;
  name: string;
  /** Code prefix that identifies this area; empty for the primary area. */
  prefix: string;
  /** Hex colour used to tint the area on the grid. */
  color: string;
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
}

export interface Warehouse extends WmsRecordBase {
  code: string;
  name: string;
  description: string;
  /** The whole warehouse can be turned off without deleting it. */
  enabled: boolean;
  /**
   * OWN (default) = has internal locations; SAP = external, no locations.
   * Optional so legacy records (created before this field) read as OWN.
   */
  type?: WarehouseType;
  /** The SAP OWHS warehouse code this warehouse maps to (for stock transfers). */
  sapWarehouseCode?: string | null;
  columns: number;
  rows: number;
  /** Vertical levels; `1` means a single-level warehouse. */
  levels: number;
  namingScheme: WarehouseNamingScheme;
  /**
   * Named rectangular areas that define where numbering starts/stops. Absent or
   * empty means the whole grid is numbered from its origin (legacy behaviour).
   */
  areas?: WarehouseArea[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Zone (a grouped range of locations inside a warehouse)
// ============================================================================

export interface Zone extends WmsRecordBase {
  warehouseId: WmsId;
  code: string;
  name: string;
  /** Free-form classification, e.g. `BULK`, `PICK`, `RECEIVING`. */
  type: string;
  temperatureClass: TemperatureClass | null;
  /** Hex colour used to tint the zone on the map. */
  color: string;
  enabled: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Cell purpose (what a grid cell IS — storage, walkable path, damaged goods…)
// ============================================================================

/**
 * A user-defined classification of what a grid cell is used for. Orthogonal to
 * zones (a cell can belong to a zone AND have a purpose) and to the derived
 * occupancy status. `holdsStock` is the behavioural flag: cells whose purpose
 * does not hold stock (walkable paths, obstacles, offices…) are excluded from
 * occupancy statistics and rejected as move/putaway destinations.
 *
 * A location with `purposeId === null` behaves as ordinary storage, so existing
 * layouts keep working with no migration.
 */
export interface CellPurpose extends WmsRecordBase {
  warehouseId: WmsId;
  code: string;
  name: string;
  /** Hex colour used to paint cells of this purpose on the map. */
  color: string;
  /** Whether cells of this purpose hold pallets/stock (true for storage-like). */
  holdsStock: boolean;
  enabled: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Location / Block
// ============================================================================

export interface LocationCapacity {
  maxPallets: number | null;
  maxUnits: number | null;
  /** Kilograms. */
  maxWeight: number | null;
  /** Cubic metres. */
  maxVolume: number | null;
}

export interface LocationDimensions {
  /** Metres. */
  length: number | null;
  width: number | null;
  height: number | null;
}

export interface LocationMaterialRules {
  allowedMaterialTypes: string[];
  restrictedMaterialTypes: string[];
  allowMixedItems: boolean;
  singleLotOnly: boolean;
  hazmatAllowed: boolean;
  hazmatClasses: string[];
  temperatureClass: TemperatureClass | null;
}

export interface LocationReplenishment {
  minStock: number | null;
  maxStock: number | null;
}

export interface LocationReservation {
  isReserved: boolean;
  /** Reference (order, customer, etc.) the reservation is held for. */
  reference: string;
}

/**
 * A single storage location ("block"). Named `WarehouseLocation` to avoid
 * shadowing the DOM `Location` type.
 */
export interface WarehouseLocation extends WmsRecordBase {
  warehouseId: WmsId;
  zoneId: WmsId | null;
  /** User-assigned cell purpose; null means ordinary storage. */
  purposeId: WmsId | null;
  code: string;
  barcode: string;
  /** Grid coordinates (0-based) within the warehouse layout. */
  column: number;
  row: number;
  level: number;
  /** Free-form location type, e.g. `RACK`, `FLOOR`, `BIN`. */
  type: string;
  capacity: LocationCapacity;
  dimensions: LocationDimensions;
  materialRules: LocationMaterialRules;
  replenishment: LocationReplenishment;
  reservation: LocationReservation;
  status: LocationStatus;
  enabled: boolean;
  notes: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Material warehouse profile (warehouse-relevant extension to an item record)
// ============================================================================

export interface MaterialWarehouseProfile extends WmsRecordBase {
  /** Links to the existing item/material record in the host app. */
  itemCode: string;
  itemName: string;
  materialType: string;
  temperatureClass: TemperatureClass | null;
  hazmatClass: string;
  defaultUom: string;
  unitsPerBox: number | null;
  /** Kilograms per unit. */
  weightPerUnit: number | null;
  /** Cubic metres per unit. */
  volumePerUnit: number | null;
  trackLot: boolean;
  trackExpiry: boolean;
  trackSerial: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Pallet / License Plate
// ============================================================================

export interface Pallet extends WmsRecordBase {
  licensePlate: string;
  currentLocationId: WmsId | null;
  itemCode: string;
  itemName: string;
  boxCount: number;
  unitsPerBox: number | null;
  totalUnits: number | null;
  lotNumber: string;
  /** Date-only ISO string when applicable. */
  expiryDate: IsoDateTime | null;
  status: PalletStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Inventory record (stock of an item at a location, optionally on a pallet)
// ============================================================================

export interface InventoryRecord extends WmsRecordBase {
  locationId: WmsId;
  itemCode: string;
  itemName: string;
  palletId: WmsId | null;
  lotNumber: string;
  serialNumber: string;
  quantity: number;
  uom: string;
  boxCount: number | null;
  /** Kilograms. */
  weight: number | null;
  /** Cubic metres. */
  volume: number | null;
  expiryDate: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// Movement / audit log entry
// ============================================================================

export interface MovementLogEntry extends WmsRecordBase {
  type: MovementType;
  itemCode: string;
  itemName: string;
  palletId: WmsId | null;
  fromLocationId: WmsId | null;
  toLocationId: WmsId | null;
  quantity: number | null;
  boxCount: number | null;
  lotNumber: string;
  userId: string;
  userName: string;
  note: string;
  /** For outbound/audit entries: whether the mandatory audit was confirmed. */
  auditConfirmed: boolean | null;
  /** For audit entries: whether a discrepancy was reported. */
  discrepancy: boolean | null;
  createdAt: IsoDateTime;
}

// ============================================================================
// Layout template (a reusable warehouse blueprint)
// ============================================================================

/** A zone within a template, described by the grid cells it covers. */
export interface ZoneTemplate {
  name: string;
  type: string;
  temperatureClass: TemperatureClass | null;
  color: string;
  cells: { column: number; row: number; level: number }[];
}

/**
 * A saved, reusable layout (grid + naming + zones) that can spawn new
 * warehouses without re-designing them from scratch.
 */
export interface LayoutTemplate extends WmsRecordBase {
  name: string;
  columns: number;
  rows: number;
  levels: number;
  namingScheme: WarehouseNamingScheme;
  zones: ZoneTemplate[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ============================================================================
// WMS settings (singleton record)
// ============================================================================

/** Fixed id of the single settings record. */
export const WMS_SETTINGS_ID: WmsId = 'wms-settings';

export interface WmsSettings extends WmsRecordBase {
  /** Master switch: when off, the host app behaves exactly as it does today. */
  masterEnabled: boolean;
  forceLocationOnTransfer: boolean;
  putawayMode: PutawayMode;
  pickStrategy: PickStrategy;
  mandatoryOutboundAudit: boolean;
  capacityViolation: ViolationMode;
  materialRuleViolation: ViolationMode;
  allowNegativeStock: boolean;
  /** Active module role (gates the designer, settings, and approvals). */
  role: WmsRole;
  updatedAt: IsoDateTime;
}

/** Default settings used to seed the singleton on first run (see Step 2). */
export const DEFAULT_WMS_SETTINGS: Omit<WmsSettings, 'updatedAt'> = {
  id: WMS_SETTINGS_ID,
  masterEnabled: false,
  forceLocationOnTransfer: true,
  putawayMode: 'HYBRID',
  pickStrategy: 'FEFO',
  mandatoryOutboundAudit: true,
  capacityViolation: 'WARN',
  materialRuleViolation: 'WARN',
  allowNegativeStock: false,
  role: 'ADMIN',
};
