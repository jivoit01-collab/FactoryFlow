/**
 * Default WMS storage adapter — IndexedDB.
 *
 * Uses a dedicated database (`factoryWmsDB`) separate from the auth DB so the
 * WMS module owns its own schema/versioning and stays self-contained. One
 * object store per collection, keyed on `id`.
 */
import type { WmsId } from '../types';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from './adapter.types';
import { WMS_COLLECTIONS } from './adapter.types';

const DB_NAME = 'factoryWmsDB';
// v2 added the `templates` object store. `onupgradeneeded` creates any store in
// WMS_COLLECTIONS that doesn't exist yet, so future collections just bump this.
const DB_VERSION = 2;

/** Feature-detect IndexedDB (it is absent in some private-mode / SSR contexts). */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export class IndexedDbAdapter implements WmsStorageAdapter {
  readonly kind = 'indexeddb' as const;

  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * iOS Safari closes IndexedDB connections under memory pressure / navigation,
   * leaving a stale reference. Mirror the auth service's liveness check.
   */
  private isConnectionAlive(): boolean {
    if (!this.db) return false;
    try {
      this.db.objectStoreNames;
      return true;
    } catch {
      return false;
    }
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.db && this.isConnectionAlive()) return Promise.resolve(this.db);

    if (this.db) {
      this.db = null;
      this.dbPromise = null;
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onclose = () => {
          this.db = null;
          this.dbPromise = null;
        };
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const collection of WMS_COLLECTIONS) {
          if (!db.objectStoreNames.contains(collection)) {
            db.createObjectStore(collection, { keyPath: 'id' });
          }
        }
      };
    });

    return this.dbPromise;
  }

  private async run<T>(
    collection: WmsCollection,
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.getDb();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(collection, mode);
      const request = work(transaction.objectStore(collection));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  list<K extends WmsCollection>(collection: K): Promise<WmsCollectionMap[K][]> {
    return this.run(collection, 'readonly', (store) =>
      store.getAll(),
    ) as Promise<WmsCollectionMap[K][]>;
  }

  async get<K extends WmsCollection>(
    collection: K,
    id: WmsId,
  ): Promise<WmsCollectionMap[K] | null> {
    const result = await this.run(collection, 'readonly', (store) => store.get(id));
    return (result as WmsCollectionMap[K] | undefined) ?? null;
  }

  async create<K extends WmsCollection>(
    collection: K,
    record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]> {
    await this.run(collection, 'readwrite', (store) => store.put(record));
    return record;
  }

  async bulkCreate<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]> {
    if (records.length === 0) return records;
    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(collection, 'readwrite');
      const store = transaction.objectStore(collection);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      for (const record of records) store.put(record);
    });
    return records;
  }

  async update<K extends WmsCollection>(
    collection: K,
    id: WmsId,
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]> {
    const existing = await this.get(collection, id);
    if (!existing) {
      throw new Error(`WMS: cannot update missing ${collection} record "${id}".`);
    }
    const next = { ...existing, ...patch, id } as WmsCollectionMap[K];
    await this.run(collection, 'readwrite', (store) => store.put(next));
    return next;
  }

  async remove<K extends WmsCollection>(collection: K, id: WmsId): Promise<void> {
    await this.run(collection, 'readwrite', (store) => store.delete(id));
  }

  async clear(collection: WmsCollection): Promise<void> {
    await this.run(collection, 'readwrite', (store) => store.clear());
  }

  async clearAll(): Promise<void> {
    for (const collection of WMS_COLLECTIONS) {
      await this.clear(collection);
    }
  }
}
