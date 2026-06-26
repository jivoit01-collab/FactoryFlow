/**
 * Backend API WMS storage adapter — STUB.
 *
 * Placeholder that satisfies the `WmsStorageAdapter` contract so the module can
 * be switched to a backend later by changing only `createAdapter.ts`. Every
 * method currently throws a clear "not implemented" error; Step 10 fills these
 * in against the real endpoints. Keeping the same interface means no screen or
 * store code changes when the swap happens.
 */
import type { WmsId } from '../types';
import type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from './adapter.types';

class WmsApiNotImplementedError extends Error {
  constructor(method: string) {
    super(
      `WMS API adapter not implemented yet (${method}). ` +
        `Switch the adapter to "indexeddb" or "localstorage" until Step 10 wires the backend.`,
    );
    this.name = 'WmsApiNotImplementedError';
  }
}

export class ApiAdapter implements WmsStorageAdapter {
  readonly kind = 'api' as const;

  list<K extends WmsCollection>(_collection: K): Promise<WmsCollectionMap[K][]> {
    return Promise.reject(new WmsApiNotImplementedError('list'));
  }

  get<K extends WmsCollection>(
    _collection: K,
    _id: WmsId,
  ): Promise<WmsCollectionMap[K] | null> {
    return Promise.reject(new WmsApiNotImplementedError('get'));
  }

  create<K extends WmsCollection>(
    _collection: K,
    _record: WmsCollectionMap[K],
  ): Promise<WmsCollectionMap[K]> {
    return Promise.reject(new WmsApiNotImplementedError('create'));
  }

  bulkCreate<K extends WmsCollection>(
    _collection: K,
    _records: WmsCollectionMap[K][],
  ): Promise<WmsCollectionMap[K][]> {
    return Promise.reject(new WmsApiNotImplementedError('bulkCreate'));
  }

  update<K extends WmsCollection>(
    _collection: K,
    _id: WmsId,
    _patch: Partial<WmsCollectionMap[K]>,
  ): Promise<WmsCollectionMap[K]> {
    return Promise.reject(new WmsApiNotImplementedError('update'));
  }

  remove<K extends WmsCollection>(_collection: K, _id: WmsId): Promise<void> {
    return Promise.reject(new WmsApiNotImplementedError('remove'));
  }

  clear(_collection: WmsCollection): Promise<void> {
    return Promise.reject(new WmsApiNotImplementedError('clear'));
  }

  clearAll(): Promise<void> {
    return Promise.reject(new WmsApiNotImplementedError('clearAll'));
  }
}
