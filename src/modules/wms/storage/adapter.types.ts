/**
 * Storage adapter contract for the WMS module.
 *
 * Every screen and the central store talk to a `WmsStorageAdapter` — never to
 * the network directly. The module persists exclusively through the backend
 * REST API (`ApiAdapter`); this interface is the single seam they share.
 */
import type {
  InventoryRecord,
  LayoutTemplate,
  MaterialWarehouseProfile,
  MovementLogEntry,
  Pallet,
  Warehouse,
  WarehouseLocation,
  WmsId,
  WmsSettings,
  Zone,
} from '../types';

/**
 * Maps each collection name to the record type it stores. This is what gives
 * the generic CRUD methods below their per-collection type safety.
 */
export interface WmsCollectionMap {
  warehouses: Warehouse;
  zones: Zone;
  locations: WarehouseLocation;
  materials: MaterialWarehouseProfile;
  pallets: Pallet;
  inventory: InventoryRecord;
  movements: MovementLogEntry;
  templates: LayoutTemplate;
  settings: WmsSettings;
}

export type WmsCollection = keyof WmsCollectionMap;

/** All collection names, in a stable order (used to create object stores). */
export const WMS_COLLECTIONS: readonly WmsCollection[] = [
  'warehouses',
  'zones',
  'locations',
  'materials',
  'pallets',
  'inventory',
  'movements',
  'templates',
  'settings',
];

/**
 * The single CRUD surface every implementation provides. All methods are async
 * so the IndexedDB and (future) API adapters fit the same shape as the
 * synchronous localStorage one.
 */
export interface WmsStorageAdapter {
  /** Which implementation this instance is (always the backend API). */
  readonly kind: 'api';

  list<K extends WmsCollection>(collection: K): Promise<WmsCollectionMap[K][]>;

  get<K extends WmsCollection>(
    collection: K,
    id: WmsId,
  ): Promise<WmsCollectionMap[K] | null>;

  create<K extends WmsCollection>(
    collection: K,
    record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]>;

  /** Insert many records efficiently (one transaction / one write). */
  bulkCreate<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]>;

  update<K extends WmsCollection>(
    collection: K,
    id: WmsId,
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]>;

  remove<K extends WmsCollection>(collection: K, id: WmsId): Promise<void>;

  /** Delete every record in one collection. */
  clear(collection: WmsCollection): Promise<void>;

  /** Delete every record in every collection (full reset). */
  clearAll(): Promise<void>;
}
