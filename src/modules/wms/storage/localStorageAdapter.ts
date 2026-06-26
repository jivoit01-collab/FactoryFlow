/**
 * Fallback WMS storage adapter — localStorage.
 *
 * Used automatically when IndexedDB is unavailable, or explicitly via settings.
 * Each collection is stored as a single JSON array under `wms:<collection>`.
 * Methods are async to match the shared `WmsStorageAdapter` contract even
 * though the underlying calls are synchronous.
 */
import type { WmsId } from '../types';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from './adapter.types';
import { WMS_COLLECTIONS } from './adapter.types';

const KEY_PREFIX = 'wms:';

function storageKey(collection: WmsCollection): string {
  return `${KEY_PREFIX}${collection}`;
}

export class LocalStorageAdapter implements WmsStorageAdapter {
  readonly kind = 'localstorage' as const;

  private readCollection<K extends WmsCollection>(collection: K): WmsCollectionMap[K][] {
    try {
      const raw = window.localStorage.getItem(storageKey(collection));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as WmsCollectionMap[K][]) : [];
    } catch {
      return [];
    }
  }

  private writeCollection<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): void {
    window.localStorage.setItem(storageKey(collection), JSON.stringify(records));
  }

  list<K extends WmsCollection>(collection: K): Promise<WmsCollectionMap[K][]> {
    return Promise.resolve(this.readCollection(collection));
  }

  get<K extends WmsCollection>(
    collection: K,
    id: WmsId,
  ): Promise<WmsCollectionMap[K] | null> {
    const found = this.readCollection(collection).find((record) => record.id === id);
    return Promise.resolve(found ?? null);
  }

  create<K extends WmsCollection>(
    collection: K,
    record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]> {
    const records = this.readCollection(collection).filter((r) => r.id !== record.id);
    records.push(record);
    this.writeCollection(collection, records);
    return Promise.resolve(record);
  }

  bulkCreate<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]> {
    if (records.length === 0) return Promise.resolve(records);
    const incomingIds = new Set(records.map((record) => record.id));
    const kept = this.readCollection(collection).filter((record) => !incomingIds.has(record.id));
    this.writeCollection(collection, [...kept, ...records]);
    return Promise.resolve(records);
  }

  update<K extends WmsCollection>(
    collection: K,
    id: WmsId,
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]> {
    const records = this.readCollection(collection);
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) {
      return Promise.reject(
        new Error(`WMS: cannot update missing ${collection} record "${id}".`),
      );
    }
    const next = { ...records[index], ...patch, id } as WmsCollectionMap[K];
    records[index] = next;
    this.writeCollection(collection, records);
    return Promise.resolve(next);
  }

  remove<K extends WmsCollection>(collection: K, id: WmsId): Promise<void> {
    const records = this.readCollection(collection).filter((record) => record.id !== id);
    this.writeCollection(collection, records);
    return Promise.resolve();
  }

  clear(collection: WmsCollection): Promise<void> {
    window.localStorage.removeItem(storageKey(collection));
    return Promise.resolve();
  }

  clearAll(): Promise<void> {
    for (const collection of WMS_COLLECTIONS) {
      window.localStorage.removeItem(storageKey(collection));
    }
    return Promise.resolve();
  }
}
