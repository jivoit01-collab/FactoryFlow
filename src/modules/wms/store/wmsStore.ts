/**
 * Central WMS state store.
 *
 * The one object every screen reads/writes through. It keeps an in-memory,
 * reactive cache of each collection and delegates ALL persistence to the active
 * storage adapter — screens never touch IndexedDB / localStorage directly. A
 * mutation reloads its collection from the adapter so the cache can never drift
 * from what is persisted (simple and correct; later steps can optimise).
 */
import type { Warehouse, WmsId, WmsSettings } from '../types';
import { DEFAULT_WMS_SETTINGS, WMS_SETTINGS_ID } from '../types';
import { getActiveWmsAdapter } from '../storage';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from '../storage';
import type { WarehouseBundle } from '../services/warehouseIO';
import { makeInventoryRecord, makeMovement, makePallet } from '../services/factories';
import { nowIso } from '../utils';

export interface MoveActor {
  id?: string;
  name?: string;
}

type Listener = () => void;

/** Stable empty reference so `getSnapshot` never returns a fresh array. */
const EMPTY: readonly never[] = Object.freeze([]);

class WmsStore {
  private cache = new Map<WmsCollection, unknown[]>();
  private loaded = new Set<WmsCollection>();
  private inFlight = new Map<WmsCollection, Promise<unknown[]>>();
  private listeners = new Set<Listener>();

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

  // -- CRUD (delegates to the adapter, then refreshes the cache) -------------

  get<K extends WmsCollection>(
    collection: K,
    id: WmsId,
  ): Promise<WmsCollectionMap[K] | null> {
    return this.adapter().get(collection, id);
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
    if (bundle.locations.length) await this.bulkCreate('locations', bundle.locations);
    return warehouse;
  }

  /** Delete a warehouse and every zone + location that belongs to it. */
  async deleteWarehouseCascade(warehouseId: WmsId): Promise<void> {
    const adapter = this.adapter();
    const [locations, zones] = await Promise.all([
      adapter.list('locations'),
      adapter.list('zones'),
    ]);
    await Promise.all([
      ...locations
        .filter((location) => location.warehouseId === warehouseId)
        .map((location) => adapter.remove('locations', location.id)),
      ...zones
        .filter((zone) => zone.warehouseId === warehouseId)
        .map((zone) => adapter.remove('zones', zone.id)),
    ]);
    await adapter.remove('warehouses', warehouseId);
    await Promise.all([this.load('warehouses'), this.load('zones'), this.load('locations')]);
  }

  /**
   * Overwrite a warehouse's stored state with a new bundle: replace its zones
   * and locations wholesale and update the warehouse record. This is the single
   * persistence primitive behind structural edits and undo/redo, where each
   * step is simply "make the stored bundle equal this one".
   */
  async replaceWarehouseBundle(bundle: WarehouseBundle): Promise<void> {
    const adapter = this.adapter();
    const id = bundle.warehouse.id;
    const [locations, zones] = await Promise.all([
      adapter.list('locations'),
      adapter.list('zones'),
    ]);
    await Promise.all([
      ...locations
        .filter((location) => location.warehouseId === id)
        .map((location) => adapter.remove('locations', location.id)),
      ...zones
        .filter((zone) => zone.warehouseId === id)
        .map((zone) => adapter.remove('zones', zone.id)),
    ]);
    await adapter.update('warehouses', id, {
      ...bundle.warehouse,
      updatedAt: nowIso(),
    });
    if (bundle.zones.length) await adapter.bulkCreate('zones', bundle.zones);
    if (bundle.locations.length) await adapter.bulkCreate('locations', bundle.locations);
    await Promise.all([this.load('warehouses'), this.load('zones'), this.load('locations')]);
  }

  /** Read a warehouse and all of its zones + locations as a portable bundle. */
  async getWarehouseBundle(warehouseId: WmsId): Promise<WarehouseBundle | null> {
    const adapter = this.adapter();
    const warehouse = await adapter.get('warehouses', warehouseId);
    if (!warehouse) return null;
    const [allZones, allLocations] = await Promise.all([
      adapter.list('zones'),
      adapter.list('locations'),
    ]);
    return {
      warehouse,
      zones: allZones.filter((zone) => zone.warehouseId === warehouseId),
      locations: allLocations.filter((location) => location.warehouseId === warehouseId),
    };
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

    // Destination: merge into a matching line (same item/lot/serial) or create one.
    const destinationStock = (await adapter.list('inventory')).filter(
      (record) => record.locationId === params.toLocationId,
    );
    const target = destinationStock.find(
      (record) =>
        record.itemCode === source.itemCode &&
        record.lotNumber === source.lotNumber &&
        record.serialNumber === source.serialNumber,
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

    await adapter.create(
      'movements',
      makeMovement({
        type: 'TRANSFER',
        itemCode: source.itemCode,
        itemName: source.itemName,
        lotNumber: source.lotNumber,
        fromLocationId: source.locationId,
        toLocationId: params.toLocationId,
        quantity: moveQty,
        userId: params.actor?.id,
        userName: params.actor?.name,
        note: params.note,
      }),
    );

    await Promise.all([this.load('inventory'), this.load('movements')]);
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
