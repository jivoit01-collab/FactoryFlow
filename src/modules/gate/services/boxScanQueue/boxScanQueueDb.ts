import type { SalesDispatchBoxScanFailureReason } from '@/modules/gate/api';

/**
 * Durable, offline-first local queue for dock box scans.
 *
 * Every accepted box scan is persisted here **immediately** (fire-and-forget on
 * the hot path) so that nothing is ever lost across a page reload, app restart,
 * or network outage. A background sync loop drains `pending` rows to the server
 * and only deletes a row once the server has confirmed it.
 *
 * This uses its own IndexedDB database (separate from the auth DB) so the scan
 * queue never collides with auth-store versioning, and the connection is opened
 * once and reused for the lifetime of the tab.
 */

const DB_NAME = 'factoryScanQueueDB';
const DB_VERSION = 1;
const STORE = 'boxScanQueue';
const INDEX_DISPATCH = 'by_dispatch';

// 'pending' retries automatically; 'rejected' (server validation) and 'failed'
// (sync gave up after N attempts) both need the operator to retry or remove.
export type BoxScanQueueStatus = 'pending' | 'rejected' | 'failed';

export interface BoxScanQueueRecord {
  /** `${dispatchId}:${lowercased barcode}` — primary key, enforces local dedupe. */
  key: string;
  dispatchId: number;
  /** Trimmed barcode, original case (what we POST to the server). */
  barcode: string;
  /** Epoch ms when the box was scanned locally. */
  ts: number;
  status: BoxScanQueueStatus;
  /** Set only when the server rejected this barcode. */
  reason?: SalesDispatchBoxScanFailureReason;
  detail?: string;
}

export function boxScanQueueKey(dispatchId: number, barcode: string): string {
  return `${dispatchId}:${barcode.trim().toLowerCase()}`;
}

class BoxScanQueueDb {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /** iOS Safari can silently close IndexedDB connections; detect a stale ref. */
  private isAlive(): boolean {
    if (!this.db) return false;
    try {
      // Accessing a property on a closed DB throws in Safari.
      return this.db.objectStoreNames !== undefined;
    } catch {
      return false;
    }
  }

  /** Open (or reuse) the connection. Call once at startup to warm it. */
  open(): Promise<IDBDatabase> {
    if (this.db && this.isAlive()) return Promise.resolve(this.db);

    if (this.db) {
      this.db = null;
      this.dbPromise = null;
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
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
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex(INDEX_DISPATCH, 'dispatchId', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /** Persist (insert or overwrite) one queue row. */
  async put(record: BoxScanQueueRecord): Promise<void> {
    const db = await this.open();
    await this.tx(db, 'readwrite', (store) => store.put(record));
  }

  /** All rows for one dispatch (used to rehydrate state after a reload). */
  async getByDispatch(dispatchId: number): Promise<BoxScanQueueRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const request = store.index(INDEX_DISPATCH).getAll(dispatchId);
      request.onsuccess = () => resolve((request.result as BoxScanQueueRecord[]) ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();
    await this.tx(db, 'readwrite', (store) => store.delete(key));
  }

  async bulkDelete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      keys.forEach((key) => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private tx(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = db.transaction(STORE, mode).objectStore(STORE);
      const request = run(store);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const boxScanQueueDb = new BoxScanQueueDb();
