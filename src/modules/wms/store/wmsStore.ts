/**
 * Central WMS state store.
 *
 * The one object every screen reads/writes through. It keeps an in-memory,
 * reactive cache of each collection and delegates ALL persistence to the active
 * storage adapter — screens never touch IndexedDB / localStorage directly. A
 * mutation reloads its collection from the adapter so the cache can never drift
 * from what is persisted (simple and correct; later steps can optimise).
 */
import { makeInventoryRecord, makeMovement, makePallet } from '../services/factories';
import type { WarehouseBundle } from '../services/warehouseIO';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from '../storage';
import { getActiveWmsAdapter } from '../storage';
import type { Warehouse, WmsId, WmsSettings } from '../types';
import { DEFAULT_WMS_SETTINGS, WMS_SETTINGS_ID } from '../types';
import { nowIso } from '../utils';

export interface MoveActor {
  id?: string;
  name?: string;
}

type Listener = () => void;

/** Stable empty reference so `getSnapshot` never returns a fresh array. */
const EMPTY: readonly never[] = Object.freeze([]);

interface RecordDiff<T> {
  /** New or changed records to upsert (unchanged ones are skipped). */
  upserts: T[];
  /** Ids present before but absent now — to delete. */
  removedIds: WmsId[];
}

/**
 * Minimal write-set to turn `prev` into `next`: only records that are new or
 * whose document changed are upserted, and only truly-removed ids are deleted.
 * Equality is a JSON compare (records are small, plain documents).
 */
function diffById<T extends { id: WmsId }>(prev: T[], next: T[]): RecordDiff<T> {
  const prevById = new Map(prev.map((record) => [record.id, record]));
  const nextIds = new Set(next.map((record) => record.id));
  const upserts = next.filter((record) => {
    const existing = prevById.get(record.id);
    return !existing || JSON.stringify(existing) !== JSON.stringify(record);
  });
  const removedIds = prev.filter((record) => !nextIds.has(record.id)).map((record) => record.id);
  return { upserts, removedIds };
}

class WmsStore {
  private cache = new Map<WmsCollection, unknown[]>();
  private loaded = new Set<WmsCollection>();
  private inFlight = new Map<WmsCollection, Promise<unknown[]>>();
  private listeners = new Set<Listener>();

  // Warehouse-scoped caches (keyed by ``collection::warehouseId``). A warehouse
  // screen only needs its own warehouse's rows, so it loads a scoped slice instead
  // of the whole company's collection (Jivo Oil had 5,197 locations across 3
  // warehouses). Parallel to the global cache above; the same subscribe/emit drives
  // both, so ``useSyncExternalStore`` consumers of either re-render on any change.
  private scopedCache = new Map<string, unknown[]>();
  private scopedLoaded = new Set<string>();
  private scopedInFlight = new Map<string, Promise<unknown[]>>();

  private adapter(): WmsStorageAdapter {
    return getActiveWmsAdapter();
  }

  // -- reactivity -----------------------------------------------------------

  /** Subscribe to any cache change. Returns an unsubscribe function. */
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Cached records for a collection (stable reference between changes). */
  getSnapshot<K extends WmsCollection>(collection: K): WmsCollectionMap[K][] {
    return (
      (this.cache.get(collection) as WmsCollectionMap[K][] | undefined) ??
      (EMPTY as unknown as WmsCollectionMap[K][])
    );
  }

  isLoaded(collection: WmsCollection): boolean {
    return this.loaded.has(collection);
  }

  // -- loading --------------------------------------------------------------

  /** Force a reload of a collection from the adapter into the cache. */
  async load<K extends WmsCollection>(collection: K): Promise<WmsCollectionMap[K][]> {
    const records = await this.adapter().list(collection);
    this.cache.set(collection, records);
    this.loaded.add(collection);
    this.emit();
    return records;
  }

  /** Load a collection once; concurrent callers share the same in-flight load. */
  ensureLoaded<K extends WmsCollection>(collection: K): Promise<WmsCollectionMap[K][]> {
    if (this.loaded.has(collection)) {
      return Promise.resolve(this.getSnapshot(collection));
    }
    const existing = this.inFlight.get(collection);
    if (existing) return existing as Promise<WmsCollectionMap[K][]>;

    const promise = this.load(collection).finally(() => {
      this.inFlight.delete(collection);
    });
    this.inFlight.set(collection, promise as Promise<unknown[]>);
    return promise;
  }

  // -- warehouse-scoped loading ---------------------------------------------

  private scopedKey(collection: WmsCollection, warehouseId: WmsId): string {
    return `${collection}::${warehouseId}`;
  }

  isLoadedScoped(collection: WmsCollection, warehouseId: WmsId): boolean {
    return this.scopedLoaded.has(this.scopedKey(collection, warehouseId));
  }

  /** Cached rows for a collection scoped to one warehouse (stable reference). */
  getScopedSnapshot<K extends WmsCollection>(
    collection: K,
    warehouseId: WmsId,
  ): WmsCollectionMap[K][] {
    return (
      (this.scopedCache.get(this.scopedKey(collection, warehouseId)) as
        | WmsCollectionMap[K][]
        | undefined) ?? (EMPTY as unknown as WmsCollectionMap[K][])
    );
  }

  /** Force a warehouse-scoped reload from the adapter (the backend filters by id). */
  async loadScoped<K extends WmsCollection>(
    collection: K,
    warehouseId: WmsId,
  ): Promise<WmsCollectionMap[K][]> {
    const records = await this.adapter().list(collection, { warehouseId });
    const key = this.scopedKey(collection, warehouseId);
    this.scopedCache.set(key, records);
    this.scopedLoaded.add(key);
    this.emit();
    return records;
  }

  /** Load a warehouse-scoped collection once; concurrent callers share the load. */
  ensureLoadedScoped<K extends WmsCollection>(
    collection: K,
    warehouseId: WmsId,
  ): Promise<WmsCollectionMap[K][]> {
    const key = this.scopedKey(collection, warehouseId);
    if (this.scopedLoaded.has(key)) {
      return Promise.resolve(this.getScopedSnapshot(collection, warehouseId));
    }
    const existing = this.scopedInFlight.get(key);
    if (existing) return existing as Promise<WmsCollectionMap[K][]>;
    const promise = this.loadScoped(collection, warehouseId).finally(() => {
      this.scopedInFlight.delete(key);
    });
    this.scopedInFlight.set(key, promise as Promise<unknown[]>);
    return promise;
  }

  /** Mark a global collection stale so its next consumer refetches (no eager load). */
  private invalidateGlobal(collection: WmsCollection): void {
    this.loaded.delete(collection);
  }

  // -- CRUD (delegates to the adapter, then refreshes the cache) -------------

  get<K extends WmsCollection>(
    collection: K,
    id: WmsId,
  ): Promise<WmsCollectionMap[K] | null> {
    return this.adapter().get(collection, id);
  }

  /**
   * One server-paginated page of a location's movement audit trail, newest
   * first. Movements are unbounded (FMCG), so this is fetched on demand rather
   * than pulled into the cached `movements` collection.
   */
  listLocationMovements(locationId: WmsId, limit: number, offset: number) {
    return this.adapter().listPage('movements', {
      locationId,
      limit,
      offset,
      order: '-created_at',
    });
  }

  async create<K extends WmsCollection>(
    collection: K,
    record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]> {
    const saved = await this.adapter().create(collection, record);
    await this.load(collection);
    return saved;
  }

  async update<K extends WmsCollection>(
    collection: K,
    id: WmsId,
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]> {
    const saved = await this.adapter().update(collection, id, patch);
    await this.load(collection);
    return saved;
  }

  async bulkCreate<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]> {
    const saved = await this.adapter().bulkCreate(collection, records);
    await this.load(collection);
    return saved;
  }

  async remove<K extends WmsCollection>(collection: K, id: WmsId): Promise<void> {
    await this.adapter().remove(collection, id);
    await this.load(collection);
  }

  /** Apply the same patch to many records, reloading the collection once. */
  async updateMany<K extends WmsCollection>(
    collection: K,
    ids: WmsId[],
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<void> {
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => this.adapter().update(collection, id, patch)));
    await this.load(collection);
  }

  /** Delete many records, reloading the collection once. */
  async removeMany<K extends WmsCollection>(collection: K, ids: WmsId[]): Promise<void> {
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => this.adapter().remove(collection, id)));
    await this.load(collection);
  }

  // -- warehouse-level operations (Step 3) ----------------------------------

  /** Persist a full warehouse bundle (warehouse + zones + locations) at once. */
  async saveWarehouseBundle(bundle: WarehouseBundle): Promise<Warehouse> {
    const warehouse = await this.create('warehouses', bundle.warehouse);
    if (bundle.zones.length) await this.bulkCreate('zones', bundle.zones);
    if (bundle.purposes.length) await this.bulkCreate('cellPurposes', bundle.purposes);
    if (bundle.locations.length) await this.bulkCreate('locations', bundle.locations);
    return warehouse;
  }

  /** Delete a warehouse and every zone + location that belongs to it. */
  async deleteWarehouseCascade(warehouseId: WmsId): Promise<void> {
    const adapter = this.adapter();
    const [locations, zones, purposes] = await Promise.all([
      adapter.list('locations'),
      adapter.list('zones'),
      adapter.list('cellPurposes'),
    ]);
    await Promise.all([
      ...locations
        .filter((location) => location.warehouseId === warehouseId)
        .map((location) => adapter.remove('locations', location.id)),
      ...zones
        .filter((zone) => zone.warehouseId === warehouseId)
        .map((zone) => adapter.remove('zones', zone.id)),
      ...purposes
        .filter((purpose) => purpose.warehouseId === warehouseId)
        .map((purpose) => adapter.remove('cellPurposes', purpose.id)),
    ]);
    await adapter.remove('warehouses', warehouseId);
    await Promise.all([
      this.load('warehouses'),
      this.load('zones'),
      this.load('cellPurposes'),
      this.load('locations'),
    ]);
  }

  /**
   * Make a warehouse's stored state equal `bundle`. This is the single
   * persistence primitive behind structural edits and undo/redo.
   *
   * Rather than wipe and rewrite the whole warehouse on every edit (which turned
   * a "set purpose on 4 cells" click into dozens of deletes + full re-creates),
   * it diffs the new bundle against the in-memory cache (kept in sync by the
   * store) and issues only the minimal writes: upsert new/changed records — the
   * backend keys on `record_id`, so a bulk create is an idempotent upsert — and
   * delete only records that were actually removed. Only the collections that
   * changed are reloaded afterwards.
   */
  async replaceWarehouseBundle(bundle: WarehouseBundle): Promise<void> {
    const adapter = this.adapter();
    const id = bundle.warehouse.id;

    // Current persisted state for THIS warehouse only — scoped fetches, so the diff
    // never pulls the whole company's zones/purposes/locations.
    await Promise.all([
      this.ensureLoaded('warehouses'),
      this.ensureLoadedScoped('zones', id),
      this.ensureLoadedScoped('cellPurposes', id),
      this.ensureLoadedScoped('locations', id),
    ]);
    const prevWarehouse = this.getSnapshot('warehouses').find((w) => w.id === id) ?? null;
    const zoneDiff = diffById(this.getScopedSnapshot('zones', id), bundle.zones);
    const purposeDiff = diffById(this.getScopedSnapshot('cellPurposes', id), bundle.purposes);
    const locationDiff = diffById(this.getScopedSnapshot('locations', id), bundle.locations);
    const warehouseChanged =
      !prevWarehouse || JSON.stringify(prevWarehouse) !== JSON.stringify(bundle.warehouse);

    // Apply only the writes that are actually needed.
    const writes: Promise<unknown>[] = [];
    if (warehouseChanged) {
      writes.push(adapter.update('warehouses', id, { ...bundle.warehouse, updatedAt: nowIso() }));
    }
    if (zoneDiff.upserts.length) writes.push(adapter.bulkCreate('zones', zoneDiff.upserts));
    if (purposeDiff.upserts.length) writes.push(adapter.bulkCreate('cellPurposes', purposeDiff.upserts));
    if (locationDiff.upserts.length) writes.push(adapter.bulkCreate('locations', locationDiff.upserts));
    for (const removedId of zoneDiff.removedIds) writes.push(adapter.remove('zones', removedId));
    for (const removedId of purposeDiff.removedIds) writes.push(adapter.remove('cellPurposes', removedId));
    for (const removedId of locationDiff.removedIds) writes.push(adapter.remove('locations', removedId));
    await Promise.all(writes);

    // Refresh only what changed: the warehouse-scoped caches (so the editor/map
    // re-render), and mark the matching global caches stale so other screens
    // refetch fresh on their next mount instead of paying a full reload here.
    const reloads: Promise<unknown>[] = [];
    if (warehouseChanged) reloads.push(this.load('warehouses'));
    if (zoneDiff.upserts.length || zoneDiff.removedIds.length) {
      reloads.push(this.loadScoped('zones', id));
      this.invalidateGlobal('zones');
    }
    if (purposeDiff.upserts.length || purposeDiff.removedIds.length) {
      reloads.push(this.loadScoped('cellPurposes', id));
      this.invalidateGlobal('cellPurposes');
    }
    if (locationDiff.upserts.length || locationDiff.removedIds.length) {
      reloads.push(this.loadScoped('locations', id));
      this.invalidateGlobal('locations');
    }
    await Promise.all(reloads);
  }

  /** Read a warehouse and all of its zones + locations as a portable bundle. */
  async getWarehouseBundle(warehouseId: WmsId): Promise<WarehouseBundle | null> {
    const adapter = this.adapter();
    const warehouse = await adapter.get('warehouses', warehouseId);
    if (!warehouse) return null;
    // Scoped fetches: the backend returns only this warehouse's rows.
    const [zones, purposes, locations] = await Promise.all([
      adapter.list('zones', { warehouseId }),
      adapter.list('cellPurposes', { warehouseId }),
      adapter.list('locations', { warehouseId }),
    ]);
    return { warehouse, zones, purposes, locations };
  }

  // -- stock movement (Step 6) ----------------------------------------------

  /**
   * Move `quantity` of an item-level inventory line to another location:
   * decrement (or clear) the source, increment/create the destination line, and
   * write a TRANSFER movement entry. Validation is the caller's responsibility
   * (see `validateMove`); this just applies the already-approved move.
   */
  async moveInventory(params: {
    sourceId: WmsId;
    toLocationId: WmsId;
    quantity: number;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const source = await adapter.get('inventory', params.sourceId);
    if (!source) throw new Error('Source stock not found.');
    if (!(params.quantity > 0)) throw new Error('Quantity must be greater than zero.');

    const moveQty = params.quantity;
    const proportion = source.quantity > 0 ? moveQty / source.quantity : 1;
    const movedWeight = source.weight != null ? source.weight * proportion : null;
    const movedVolume = source.volume != null ? source.volume * proportion : null;
    const timestamp = nowIso();

    // Destination: merge into a matching line (same item/lot/serial AND same
    // pallet) or create one. Matching on palletId keeps pallet-backed stock from
    // merging into loose stock (and vice-versa), so a moved pallet's stock stays
    // linked to its pallet at the destination.
    const destinationStock = (await adapter.list('inventory')).filter(
      (record) => record.locationId === params.toLocationId,
    );
    const target = destinationStock.find(
      (record) =>
        record.itemCode === source.itemCode &&
        record.lotNumber === source.lotNumber &&
        record.serialNumber === source.serialNumber &&
        record.palletId === source.palletId,
    );
    if (target) {
      await adapter.update('inventory', target.id, {
        quantity: target.quantity + moveQty,
        weight: target.weight != null || movedWeight != null ? (target.weight ?? 0) + (movedWeight ?? 0) : null,
        volume: target.volume != null || movedVolume != null ? (target.volume ?? 0) + (movedVolume ?? 0) : null,
        updatedAt: timestamp,
      });
    } else {
      await adapter.create(
        'inventory',
        makeInventoryRecord({
          locationId: params.toLocationId,
          itemCode: source.itemCode,
          itemName: source.itemName,
          // Carry the pallet link so the stock stays attached to its pallet.
          palletId: source.palletId,
          lotNumber: source.lotNumber,
          serialNumber: source.serialNumber,
          quantity: moveQty,
          uom: source.uom,
          weight: movedWeight,
          volume: movedVolume,
          expiryDate: source.expiryDate,
        }),
      );
    }

    // Source: clear when fully moved, otherwise reduce.
    const remaining = source.quantity - moveQty;
    if (remaining === 0) {
      await adapter.remove('inventory', source.id);
    } else {
      await adapter.update('inventory', source.id, {
        quantity: remaining,
        weight: source.weight != null ? source.weight - (movedWeight ?? 0) : null,
        volume: source.volume != null ? source.volume - (movedVolume ?? 0) : null,
        updatedAt: timestamp,
      });
    }

    // If this stock belonged to a pallet and none of that pallet's stock remains
    // at the source, follow the pallet to the destination — otherwise the pallet
    // record is orphaned at its old location (shows stock here but "no pallet").
    if (source.palletId) {
      const palletStillAtSource = (await adapter.list('inventory')).some(
        (record) => record.palletId === source.palletId && record.locationId === source.locationId,
      );
      if (!palletStillAtSource) {
        await adapter.update('pallets', source.palletId, {
          currentLocationId: params.toLocationId,
          updatedAt: timestamp,
        });
      }
    }

    await adapter.create(
      'movements',
      makeMovement({
        type: 'TRANSFER',
        itemCode: source.itemCode,
        itemName: source.itemName,
        palletId: source.palletId,
        lotNumber: source.lotNumber,
        fromLocationId: source.locationId,
        toLocationId: params.toLocationId,
        quantity: moveQty,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('inventory'), this.load('pallets'), this.load('movements')]);
  }

  /**
   * Receive stock and put it away in one action (Step 7): optionally create a
   * pallet, create/merge the inventory at the destination, and write a PUTAWAY
   * movement. Loose (no-pallet) receipts merge into a matching destination line;
   * pallet receipts always create their own line.
   */
  async receiveStock(params: {
    destLocationId: WmsId;
    itemCode: string;
    itemName?: string;
    lotNumber?: string;
    expiryDate?: string | null;
    uom?: string;
    quantity: number;
    boxCount: number;
    unitsPerBox?: number | null;
    weight?: number | null;
    volume?: number | null;
    licensePlate?: string;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    if (!(params.quantity > 0)) throw new Error('Quantity must be greater than zero.');

    let palletId: WmsId | null = null;
    if (params.licensePlate?.trim()) {
      const pallet = makePallet({
        licensePlate: params.licensePlate.trim(),
        currentLocationId: params.destLocationId,
        itemCode: params.itemCode,
        itemName: params.itemName,
        boxCount: params.boxCount,
        unitsPerBox: params.unitsPerBox ?? null,
        totalUnits: params.quantity,
        lotNumber: params.lotNumber,
        expiryDate: params.expiryDate ?? null,
      });
      await adapter.create('pallets', pallet);
      palletId = pallet.id;
    }

    // Loose receipts merge into a matching line; pallet receipts get their own.
    const existing = palletId
      ? null
      : (await adapter.list('inventory')).find(
          (record) =>
            record.locationId === params.destLocationId &&
            record.itemCode === params.itemCode &&
            record.lotNumber === (params.lotNumber ?? '') &&
            record.palletId == null,
        );

    if (existing) {
      await adapter.update('inventory', existing.id, {
        quantity: existing.quantity + params.quantity,
        boxCount: (existing.boxCount ?? 0) + params.boxCount,
        weight: existing.weight != null || params.weight != null ? (existing.weight ?? 0) + (params.weight ?? 0) : null,
        volume: existing.volume != null || params.volume != null ? (existing.volume ?? 0) + (params.volume ?? 0) : null,
        updatedAt: nowIso(),
      });
    } else {
      await adapter.create(
        'inventory',
        makeInventoryRecord({
          locationId: params.destLocationId,
          itemCode: params.itemCode,
          itemName: params.itemName,
          palletId,
          lotNumber: params.lotNumber,
          quantity: params.quantity,
          uom: params.uom,
          boxCount: params.boxCount,
          weight: params.weight ?? null,
          volume: params.volume ?? null,
          expiryDate: params.expiryDate ?? null,
        }),
      );
    }

    await adapter.create(
      'movements',
      makeMovement({
        type: 'PUTAWAY',
        itemCode: params.itemCode,
        itemName: params.itemName,
        palletId,
        toLocationId: params.destLocationId,
        quantity: params.quantity,
        boxCount: params.boxCount,
        lotNumber: params.lotNumber,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /** Move an entire pallet (and its inventory) to another location. */
  async movePallet(params: {
    palletId: WmsId;
    toLocationId: WmsId;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const pallet = await adapter.get('pallets', params.palletId);
    if (!pallet) throw new Error('Pallet not found.');
    const fromLocationId = pallet.currentLocationId;
    const timestamp = nowIso();

    await adapter.update('pallets', pallet.id, {
      currentLocationId: params.toLocationId,
      updatedAt: timestamp,
    });

    const palletStock = (await adapter.list('inventory')).filter(
      (record) => record.palletId === pallet.id,
    );
    await Promise.all(
      palletStock.map((record) =>
        adapter.update('inventory', record.id, { locationId: params.toLocationId, updatedAt: timestamp }),
      ),
    );

    await adapter.create(
      'movements',
      makeMovement({
        type: 'TRANSFER',
        itemCode: pallet.itemCode,
        itemName: pallet.itemName,
        palletId: pallet.id,
        licensePlate: pallet.licensePlate,
        fromLocationId,
        toLocationId: params.toLocationId,
        boxCount: pallet.boxCount,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Mirror an external (barcode-module) pallet move into the WMS dataset.
   *
   * The barcode module persists pallet moves to its own backend. When the chosen
   * destination is a WMS-managed ("own") warehouse + bin, the move would
   * otherwise be invisible in Warehouse Ops (different backend). This brings the
   * pallet into the WMS so it shows on the map, reports, transfer, and outbound.
   *
   * Idempotent by license plate: a pallet already known to the WMS is relocated
   * (its stock follows, like `movePallet`); an unknown plate is created with a
   * single inventory line. Already at the destination → no-op.
   */
  async syncExternalPalletPlacement(params: {
    licensePlate: string;
    toLocationId: WmsId;
    itemCode: string;
    itemName?: string;
    lotNumber?: string;
    boxCount?: number;
    totalUnits?: number | null;
    uom?: string;
    expiryDate?: string | null;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const plate = params.licensePlate.trim();
    if (!plate) throw new Error('A pallet license plate is required.');
    const timestamp = nowIso();
    const note = params.note ?? 'Synced from barcode move';

    const existing = (await adapter.list('pallets')).find(
      (p) => p.licensePlate.toLowerCase() === plate.toLowerCase(),
    );

    if (existing) {
      const fromLocationId = existing.currentLocationId;
      if (fromLocationId === params.toLocationId) return; // already here
      await adapter.update('pallets', existing.id, {
        currentLocationId: params.toLocationId,
        status: existing.status === 'SHIPPED' ? 'ACTIVE' : existing.status,
        updatedAt: timestamp,
      });
      const palletStock = (await adapter.list('inventory')).filter(
        (record) => record.palletId === existing.id,
      );
      await Promise.all(
        palletStock.map((record) =>
          adapter.update('inventory', record.id, { locationId: params.toLocationId, updatedAt: timestamp }),
        ),
      );
      await adapter.create(
        'movements',
        makeMovement({
          type: 'TRANSFER',
          itemCode: existing.itemCode,
          itemName: existing.itemName,
          palletId: existing.id,
          licensePlate: existing.licensePlate,
          fromLocationId,
          toLocationId: params.toLocationId,
          boxCount: existing.boxCount,
          userId: params.actor?.id,
          userName: params.actor?.name,
          note,
        }),
      );
    } else {
      const pallet = makePallet({
        licensePlate: plate,
        currentLocationId: params.toLocationId,
        itemCode: params.itemCode,
        itemName: params.itemName,
        boxCount: params.boxCount ?? 0,
        totalUnits: params.totalUnits ?? null,
        lotNumber: params.lotNumber,
        expiryDate: params.expiryDate ?? null,
      });
      await adapter.create('pallets', pallet);
      if ((params.totalUnits ?? 0) > 0) {
        await adapter.create(
          'inventory',
          makeInventoryRecord({
            locationId: params.toLocationId,
            itemCode: params.itemCode,
            itemName: params.itemName,
            palletId: pallet.id,
            lotNumber: params.lotNumber,
            quantity: params.totalUnits ?? 0,
            uom: params.uom,
            boxCount: params.boxCount ?? null,
            expiryDate: params.expiryDate ?? null,
          }),
        );
      }
      await adapter.create(
        'movements',
        makeMovement({
          type: 'PUTAWAY',
          itemCode: params.itemCode,
          itemName: params.itemName,
          palletId: pallet.id,
          licensePlate: plate,
          toLocationId: params.toLocationId,
          quantity: params.totalUnits ?? null,
          boxCount: params.boxCount ?? null,
          lotNumber: params.lotNumber,
          userId: params.actor?.id,
          userName: params.actor?.name,
          note,
        }),
      );
    }

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Reconcile a WMS pallet to an absolute snapshot from the barcode module.
   *
   * Unlike `syncExternalPalletPlacement` (which only relocates), this also brings
   * the pallet's box count and quantity into line — needed for box transfers,
   * splits, and add/remove-box flows where the location may not change but the
   * contents do. For an unknown plate it falls back to the create path. For a
   * WMS-rich pallet (multiple inventory lines, e.g. received via WMS with lots),
   * it relocates but does NOT overwrite the line quantities, to avoid clobbering
   * detail the barcode side doesn't track.
   */
  async reconcileExternalPallet(params: {
    licensePlate: string;
    toLocationId: WmsId;
    itemCode: string;
    itemName?: string;
    lotNumber?: string;
    boxCount?: number;
    totalUnits?: number | null;
    uom?: string;
    expiryDate?: string | null;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const plate = params.licensePlate.trim();
    if (!plate) throw new Error('A pallet license plate is required.');

    const existing = (await adapter.list('pallets')).find(
      (p) => p.licensePlate.toLowerCase() === plate.toLowerCase(),
    );
    if (!existing) {
      await this.syncExternalPalletPlacement(params);
      return;
    }

    const timestamp = nowIso();
    const note = params.note ?? 'Synced from barcode transfer';
    const fromLocationId = existing.currentLocationId;
    const relocating = fromLocationId !== params.toLocationId;
    const stock = (await adapter.list('inventory')).filter((r) => r.palletId === existing.id);
    const target = params.totalUnits ?? null;

    if (relocating) {
      await Promise.all(
        stock.map((r) => adapter.update('inventory', r.id, { locationId: params.toLocationId, updatedAt: timestamp })),
      );
    }

    // Reconcile quantity only for the simple mirrored case (0 or 1 lines).
    if (stock.length <= 1) {
      const line = stock[0];
      if (line) {
        if ((target ?? 0) <= 0) {
          await adapter.remove('inventory', line.id);
        } else {
          await adapter.update('inventory', line.id, {
            quantity: target ?? line.quantity,
            boxCount: params.boxCount ?? line.boxCount,
            locationId: params.toLocationId,
            updatedAt: timestamp,
          });
        }
      } else if ((target ?? 0) > 0) {
        await adapter.create(
          'inventory',
          makeInventoryRecord({
            locationId: params.toLocationId,
            itemCode: params.itemCode,
            itemName: params.itemName,
            palletId: existing.id,
            lotNumber: params.lotNumber,
            quantity: target ?? 0,
            uom: params.uom,
            boxCount: params.boxCount ?? null,
            expiryDate: params.expiryDate ?? null,
          }),
        );
      }
    }

    await adapter.update('pallets', existing.id, {
      currentLocationId: params.toLocationId,
      boxCount: params.boxCount ?? existing.boxCount,
      totalUnits: target ?? existing.totalUnits,
      status: existing.status === 'SHIPPED' ? 'ACTIVE' : existing.status,
      updatedAt: timestamp,
    });

    await adapter.create(
      'movements',
      makeMovement({
        type: relocating ? 'TRANSFER' : 'ADJUSTMENT',
        itemCode: existing.itemCode,
        itemName: existing.itemName,
        palletId: existing.id,
        licensePlate: existing.licensePlate,
        fromLocationId: relocating ? fromLocationId : null,
        toLocationId: params.toLocationId,
        quantity: target,
        boxCount: params.boxCount ?? null,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note,
      }),
    );

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Remove a pallet from WMS-managed space — used when an external (barcode)
   * move sends a pallet to a warehouse the WMS does not manage. Clears its stock,
   * unplaces it, and logs the departure. No-op for plates the WMS never held.
   */
  async removeExternalPallet(params: {
    licensePlate: string;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const plate = params.licensePlate.trim().toLowerCase();
    if (!plate) return;
    const existing = (await adapter.list('pallets')).find(
      (p) => p.licensePlate.toLowerCase() === plate,
    );
    if (!existing || existing.currentLocationId == null) return;

    const fromLocationId = existing.currentLocationId;
    const timestamp = nowIso();
    const stock = (await adapter.list('inventory')).filter((r) => r.palletId === existing.id);
    await Promise.all(stock.map((r) => adapter.remove('inventory', r.id)));
    await adapter.update('pallets', existing.id, {
      currentLocationId: null,
      status: 'SHIPPED',
      updatedAt: timestamp,
    });
    await adapter.create(
      'movements',
      makeMovement({
        type: 'TRANSFER',
        itemCode: existing.itemCode,
        itemName: existing.itemName,
        palletId: existing.id,
        licensePlate: existing.licensePlate,
        fromLocationId,
        toLocationId: null,
        boxCount: existing.boxCount,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note ?? 'Left WMS-managed warehouse (barcode move)',
      }),
    );

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Delete a pallet and its stock from the map — the manual "this bin is
   * actually empty" cleanup for a phantom pallet that never physically arrived
   * or already left. Removes the pallet + its inventory and logs an ADJUSTMENT
   * so the location's audit trail records the correction.
   */
  async removePalletFromLocation(
    palletId: WmsId,
    actor?: MoveActor,
    note?: string,
  ): Promise<void> {
    const adapter = this.adapter();
    const pallet = (await adapter.list('pallets')).find((p) => p.id === palletId);
    if (!pallet) return;
    const stock = (await adapter.list('inventory')).filter((r) => r.palletId === palletId);
    await Promise.all(stock.map((r) => adapter.remove('inventory', r.id)));
    await adapter.remove('pallets', palletId);
    if (pallet.currentLocationId) {
      await adapter.create(
        'movements',
        makeMovement({
          type: 'ADJUSTMENT',
          itemCode: pallet.itemCode,
          itemName: pallet.itemName,
          palletId,
          licensePlate: pallet.licensePlate,
          fromLocationId: pallet.currentLocationId,
          toLocationId: null,
          boxCount: pallet.boxCount,
          userId: actor?.id,
          userName: actor?.name,
          note: note ?? 'Removed from map — bin was empty',
        }),
      );
    }
    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Repair pallet ↔ inventory ↔ location consistency for existing data.
   *
   * Heals records orphaned by older bugs (e.g. an item-level move that left a
   * pallet behind or dropped the pallet link), in two passes:
   *   1. Follow stock — a pallet whose linked inventory all sits at one location
   *      is moved to that location (deterministic).
   *   2. Re-link stranded pallets — a pallet with NO inventory anywhere is matched
   *      to a single loose (palletId-less) line of the same item/lot (and, when
   *      known, the same total quantity); the line is linked and the pallet moved.
   *      Ambiguous matches are skipped, so this never guesses.
   */
  async reconcilePalletLinks(): Promise<{ relocated: number; relinked: number }> {
    const adapter = this.adapter();
    const [pallets, inventory] = await Promise.all([
      adapter.list('pallets'),
      adapter.list('inventory'),
    ]);
    const timestamp = nowIso();
    let relocated = 0;
    let relinked = 0;

    const linesByPallet = new Map<WmsId, typeof inventory>();
    for (const record of inventory) {
      if (!record.palletId) continue;
      const list = linesByPallet.get(record.palletId) ?? [];
      list.push(record);
      linesByPallet.set(record.palletId, list);
    }

    for (const pallet of pallets) {
      if (pallet.status === 'SHIPPED') continue;
      const lines = linesByPallet.get(pallet.id) ?? [];

      if (lines.length > 0) {
        // Pass 1: follow the stock when it all sits in one place.
        const locationIds = new Set(lines.map((line) => line.locationId));
        if (locationIds.size === 1) {
          const locationId = lines[0]!.locationId;
          if (pallet.currentLocationId !== locationId) {
            await adapter.update('pallets', pallet.id, { currentLocationId: locationId, updatedAt: timestamp });
            relocated += 1;
          }
        }
        continue;
      }

      // Pass 2: stranded pallet — try one unambiguous loose line.
      const candidates = inventory.filter(
        (record) =>
          record.palletId == null &&
          record.itemCode === pallet.itemCode &&
          (!pallet.lotNumber || record.lotNumber === pallet.lotNumber) &&
          (pallet.totalUnits == null || record.quantity === pallet.totalUnits),
      );
      if (candidates.length === 1) {
        const line = candidates[0]!;
        await adapter.update('inventory', line.id, { palletId: pallet.id, updatedAt: timestamp });
        await adapter.update('pallets', pallet.id, { currentLocationId: line.locationId, updatedAt: timestamp });
        line.palletId = pallet.id; // claim it so another pallet can't match the same line
        relinked += 1;
      }
    }

    await Promise.all([this.load('pallets'), this.load('inventory')]);
    return { relocated, relinked };
  }

  // -- outbound audit + picking (Step 8) ------------------------------------

  /**
   * Take a pallet out after its mandatory audit. Removes the pallet's inventory,
   * marks the pallet SHIPPED, and writes an OUTBOUND movement (auditConfirmed).
   * A corrected box count that differs from the pallet's also posts an
   * ADJUSTMENT entry flagged as a discrepancy.
   */
  async shipPallet(params: {
    palletId: WmsId;
    correctedBoxCount?: number;
    actor?: MoveActor;
    note?: string;
    supervisorApproved?: boolean;
  }): Promise<void> {
    const adapter = this.adapter();
    const pallet = await adapter.get('pallets', params.palletId);
    if (!pallet) throw new Error('Pallet not found.');

    const fromLocationId = pallet.currentLocationId;
    const originalBoxCount = pallet.boxCount;
    const finalBoxCount = params.correctedBoxCount ?? originalBoxCount;
    const isDiscrepancy = params.correctedBoxCount != null && params.correctedBoxCount !== originalBoxCount;
    const timestamp = nowIso();

    const palletStock = (await adapter.list('inventory')).filter((record) => record.palletId === pallet.id);
    const totalUnits = palletStock.reduce((sum, record) => sum + (record.quantity || 0), 0);

    if (isDiscrepancy) {
      await adapter.create(
        'movements',
        makeMovement({
          type: 'ADJUSTMENT',
          itemCode: pallet.itemCode,
          itemName: pallet.itemName,
          palletId: pallet.id,
          licensePlate: pallet.licensePlate,
          fromLocationId,
          boxCount: finalBoxCount,
          lotNumber: pallet.lotNumber,
          discrepancy: true,
          auditConfirmed: true,
          userId: params.actor?.id,
          userName: params.actor?.name,
          note: `Audit correction: box count ${originalBoxCount} → ${finalBoxCount}${params.supervisorApproved ? ' (supervisor approved)' : ''}`,
        }),
      );
    }

    await Promise.all(palletStock.map((record) => adapter.remove('inventory', record.id)));
    await adapter.update('pallets', pallet.id, {
      status: 'SHIPPED',
      currentLocationId: null,
      boxCount: finalBoxCount,
      updatedAt: timestamp,
    });
    await adapter.create(
      'movements',
      makeMovement({
        type: 'OUTBOUND',
        itemCode: pallet.itemCode,
        itemName: pallet.itemName,
        palletId: pallet.id,
        licensePlate: pallet.licensePlate,
        fromLocationId,
        quantity: totalUnits,
        boxCount: finalBoxCount,
        lotNumber: pallet.lotNumber,
        auditConfirmed: true,
        discrepancy: isDiscrepancy ? true : null,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
  }

  /**
   * Pick `quantity` off an inventory line: decrement (or clear) it and write a
   * PICK movement. Emptying a pallet-backed line marks that pallet PICKED.
   */
  async pickInventory(params: {
    sourceId: WmsId;
    quantity: number;
    actor?: MoveActor;
    note?: string;
  }): Promise<void> {
    const adapter = this.adapter();
    const source = await adapter.get('inventory', params.sourceId);
    if (!source) throw new Error('Stock line not found.');
    if (!(params.quantity > 0)) throw new Error('Quantity must be greater than zero.');
    if (params.quantity > source.quantity) throw new Error('Cannot pick more than is available.');

    const timestamp = nowIso();
    const remaining = source.quantity - params.quantity;
    const proportion = source.quantity > 0 ? params.quantity / source.quantity : 1;

    if (remaining === 0) {
      await adapter.remove('inventory', source.id);
      if (source.palletId) {
        await adapter.update('pallets', source.palletId, { status: 'PICKED', updatedAt: timestamp });
      }
    } else {
      await adapter.update('inventory', source.id, {
        quantity: remaining,
        weight: source.weight != null ? source.weight * (1 - proportion) : null,
        volume: source.volume != null ? source.volume * (1 - proportion) : null,
        updatedAt: timestamp,
      });
    }

    await adapter.create(
      'movements',
      makeMovement({
        type: 'PICK',
        itemCode: source.itemCode,
        itemName: source.itemName,
        palletId: source.palletId,
        fromLocationId: source.locationId,
        quantity: params.quantity,
        lotNumber: source.lotNumber,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('inventory'), this.load('pallets'), this.load('movements')]);
  }

  // -- cycle count (Step 9) -------------------------------------------------

  /**
   * Post a cycle count for a location: set each counted line to its counted
   * quantity (removing emptied lines), create any newly-found items, and log a
   * CYCLE_COUNT movement (flagged as a discrepancy) for every line that changed.
   */
  async postCycleCount(params: {
    locationId: WmsId;
    counts: { inventoryId: WmsId; countedQuantity: number; countedBoxCount?: number | null }[];
    additions?: { itemCode: string; itemName?: string; quantity: number; uom?: string; lotNumber?: string }[];
    actor?: MoveActor;
  }): Promise<{ adjustments: number }> {
    const adapter = this.adapter();
    let adjustments = 0;

    for (const count of params.counts) {
      const record = await adapter.get('inventory', count.inventoryId);
      if (!record) continue;
      if (count.countedQuantity === record.quantity) continue;
      adjustments += 1;
      const recordedQuantity = record.quantity;

      if (count.countedQuantity <= 0) {
        await adapter.remove('inventory', record.id);
      } else {
        await adapter.update('inventory', record.id, {
          quantity: count.countedQuantity,
          boxCount: count.countedBoxCount ?? record.boxCount,
          updatedAt: nowIso(),
        });
      }
      await adapter.create(
        'movements',
        makeMovement({
          type: 'CYCLE_COUNT',
          itemCode: record.itemCode,
          itemName: record.itemName,
          fromLocationId: record.locationId,
          quantity: count.countedQuantity,
          boxCount: count.countedBoxCount ?? null,
          lotNumber: record.lotNumber,
          discrepancy: true,
          note: `Counted ${count.countedQuantity}, was ${recordedQuantity}`,
          userId: params.actor?.id,
          userName: params.actor?.name,
        }),
      );
    }

    for (const addition of params.additions ?? []) {
      if (!(addition.quantity > 0)) continue;
      adjustments += 1;
      await adapter.create(
        'inventory',
        makeInventoryRecord({
          locationId: params.locationId,
          itemCode: addition.itemCode,
          itemName: addition.itemName,
          quantity: addition.quantity,
          uom: addition.uom,
          lotNumber: addition.lotNumber,
        }),
      );
      await adapter.create(
        'movements',
        makeMovement({
          type: 'CYCLE_COUNT',
          itemCode: addition.itemCode,
          itemName: addition.itemName,
          toLocationId: params.locationId,
          quantity: addition.quantity,
          lotNumber: addition.lotNumber,
          discrepancy: true,
          note: `Found ${addition.quantity} not on record`,
          userId: params.actor?.id,
          userName: params.actor?.name,
        }),
      );
    }

    await Promise.all([this.load('inventory'), this.load('movements')]);
    return { adjustments };
  }

  // -- settings singleton ---------------------------------------------------

  /** Read the settings record, seeding it with defaults on first run. */
  async getSettings(): Promise<WmsSettings> {
    // Load the collection into the reactive cache (de-duped across the concurrent
    // callers — useWmsSettings/useWmsRole/useWmsEnabled). A bare adapter.get()
    // would return the record WITHOUT populating the cache, so React subscribers
    // reading getSnapshot('settings') would never see it and the settings page
    // would stay stuck on its loading spinner after a reload.
    const rows = await this.ensureLoaded('settings');
    const existing = rows.find((record) => record.id === WMS_SETTINGS_ID);
    if (existing) return existing;
    const seeded: WmsSettings = { ...DEFAULT_WMS_SETTINGS, updatedAt: nowIso() };
    await this.create('settings', seeded);
    return seeded;
  }

  /** Patch and persist the settings singleton. */
  async saveSettings(patch: Partial<Omit<WmsSettings, 'id'>>): Promise<WmsSettings> {
    await this.getSettings(); // ensure it exists
    return this.update('settings', WMS_SETTINGS_ID, { ...patch, updatedAt: nowIso() });
  }

  // -- maintenance ----------------------------------------------------------

  /**
   * Delete all transactional stock data — every pallet, inventory line, and
   * movement-log entry. The warehouse layout (warehouses / zones / locations),
   * material profiles, templates, and settings are left intact. Irreversible:
   * intended as an admin "reset the stock" action. Returns how many records of
   * each kind were removed.
   */
  async clearStockData(): Promise<{ pallets: number; inventory: number; movements: number }> {
    const adapter = this.adapter();
    const [pallets, inventory, movements] = await Promise.all([
      adapter.list('pallets'),
      adapter.list('inventory'),
      adapter.list('movements'),
    ]);
    const counts = {
      pallets: pallets.length,
      inventory: inventory.length,
      movements: movements.length,
    };

    await Promise.all([
      ...pallets.map((record) => adapter.remove('pallets', record.id)),
      ...inventory.map((record) => adapter.remove('inventory', record.id)),
      ...movements.map((record) => adapter.remove('movements', record.id)),
    ]);

    await Promise.all([this.load('pallets'), this.load('inventory'), this.load('movements')]);
    return counts;
  }

  // -- lifecycle ------------------------------------------------------------

  /**
   * Drop all cached state (e.g. after the active adapter is swapped) so the next
   * read re-loads from the newly selected backend.
   */
  reset(): void {
    this.cache.clear();
    this.loaded.clear();
    this.inFlight.clear();
    this.emit();
  }
}

export const wmsStore = new WmsStore();

// Dev-only handle so the persistence "survives a page reload" criterion can be
// verified from the console without any UI (removed in production builds).
if (import.meta.env.DEV) {
  (globalThis as unknown as { __wmsStore?: WmsStore }).__wmsStore = wmsStore;
}
