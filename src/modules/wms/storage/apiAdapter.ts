/**
 * Backend API WMS storage adapter (Step 10).
 *
 * A real REST implementation of the `WmsStorageAdapter` contract against the
 * app's shared `apiClient`. Selecting it swaps the whole module onto a backend
 * with NO changes to any screen or to the business logic — that is the point of
 * the adapter abstraction. Endpoints follow the convention
 * `/{base}/{collection}/` (+ `/{id}/`), with a `/{collection}/bulk/` for batch
 * inserts. The default backing store remains IndexedDB; this is opt-in.
 */
import { apiClient } from '@/core/api';

import type { WmsId } from '../types';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from './adapter.types';
import { WMS_COLLECTIONS } from './adapter.types';

const BASE = '/wms';

function collectionUrl(collection: WmsCollection, id?: WmsId): string {
  return id ? `${BASE}/${collection}/${id}/` : `${BASE}/${collection}/`;
}

/** Accept either a bare array or a DRF-style `{ results: [] }` page. */
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as { response?: { status?: number } }).response?.status === 404,
  );
}

/**
 * How many write requests may be in flight at once. Deleting a warehouse can
 * touch thousands of records; firing them all at once starves the browser's
 * connection pool and overloads the server, so a single timeout would fail the
 * whole cascade.
 */
export const WRITE_CONCURRENCY = 8;

/**
 * Run async tasks with a bounded number in flight. Rejects with the first error
 * (like `Promise.all`) but never floods the network.
 */
export async function runWithConcurrency<T>(
  tasks: readonly (() => Promise<T>)[],
  limit = WRITE_CONCURRENCY,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]!();
    }
  });
  await Promise.all(workers);
  return results;
}

export class ApiAdapter implements WmsStorageAdapter {
  readonly kind = 'api' as const;

  async list<K extends WmsCollection>(
    collection: K,
    params?: { warehouseId?: WmsId },
  ): Promise<WmsCollectionMap[K][]> {
    const query = params?.warehouseId
      ? `?warehouseId=${encodeURIComponent(params.warehouseId)}`
      : '';
    const response = await apiClient.get(`${collectionUrl(collection)}${query}`);
    return unwrapList<WmsCollectionMap[K]>(response.data);
  }

  async listPage<K extends WmsCollection>(
    collection: K,
    params: {
      limit: number;
      offset?: number;
      warehouseId?: WmsId;
      locationId?: WmsId;
      order?: '-created_at';
    },
  ): Promise<{ results: WmsCollectionMap[K][]; count: number }> {
    const query = new URLSearchParams();
    query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.locationId) query.set('locationId', params.locationId);
    if (params.order) query.set('order', params.order);
    const response = await apiClient.get(`${collectionUrl(collection)}?${query.toString()}`);
    const data = response.data as { count?: number } | unknown;
    const count =
      data && typeof data === 'object' && typeof (data as { count?: number }).count === 'number'
        ? (data as { count: number }).count
        : 0;
    return { results: unwrapList<WmsCollectionMap[K]>(response.data), count };
  }

  async get<K extends WmsCollection>(collection: K, id: WmsId): Promise<WmsCollectionMap[K] | null> {
    try {
      const response = await apiClient.get<WmsCollectionMap[K]>(collectionUrl(collection, id));
      return response.data ?? null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async create<K extends WmsCollection>(
    collection: K,
    record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]> {
    const response = await apiClient.post<WmsCollectionMap[K]>(collectionUrl(collection), record);
    return response.data ?? record;
  }

  async bulkCreate<K extends WmsCollection>(
    collection: K,
    records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]> {
    if (records.length === 0) return records;
    const response = await apiClient.post(`${collectionUrl(collection)}bulk/`, records);
    const created = unwrapList<WmsCollectionMap[K]>(response.data);
    return created.length ? created : records;
  }

  async update<K extends WmsCollection>(
    collection: K,
    id: WmsId,
    patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]> {
    const response = await apiClient.patch<WmsCollectionMap[K]>(collectionUrl(collection, id), patch);
    return response.data;
  }

  /**
   * Delete a record. A 404 means it is already gone, which satisfies the intent —
   * DELETE is idempotent. Without this a cascade that partly failed could never
   * be retried: the next attempt 404s on the records it already removed, so the
   * parent (e.g. a warehouse) stays undeletable forever.
   */
  async remove<K extends WmsCollection>(collection: K, id: WmsId): Promise<void> {
    try {
      await apiClient.delete(collectionUrl(collection, id));
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
  }

  async clear(collection: WmsCollection): Promise<void> {
    const all = await this.list(collection);
    await runWithConcurrency(all.map((record) => () => this.remove(collection, record.id)));
  }

  async clearAll(): Promise<void> {
    for (const collection of WMS_COLLECTIONS) {
      await this.clear(collection);
    }
  }
}
