/**
 * React bindings for the central WMS store.
 *
 * Screens use these hooks to read collections reactively; they never import a
 * storage adapter directly. Built on `useSyncExternalStore` so components
 * re-render whenever the store's cache changes.
 */
import { useEffect, useSyncExternalStore } from 'react';

import type { WmsCollection, WmsCollectionMap } from '../storage';
import type { WmsId } from '../types';
import { wmsStore } from './wmsStore';

/** Stable empty reference for the "no warehouse selected" case. */
const EMPTY_SCOPED: readonly never[] = Object.freeze([]);

export interface UseWmsCollectionResult<K extends WmsCollection> {
  data: WmsCollectionMap[K][];
  /** True until the collection has been loaded from the adapter at least once. */
  loading: boolean;
}

/**
 * Subscribe to a WMS collection. Lazily loads it from the active adapter on
 * first use and re-renders on any change.
 */
export function useWmsCollection<K extends WmsCollection>(
  collection: K,
): UseWmsCollectionResult<K> {
  const data = useSyncExternalStore(
    wmsStore.subscribe,
    () => wmsStore.getSnapshot(collection),
  );

  useEffect(() => {
    void wmsStore.ensureLoaded(collection);
  }, [collection]);

  return { data, loading: !wmsStore.isLoaded(collection) };
}

/**
 * Subscribe to a WMS collection scoped to one warehouse. Loads only that
 * warehouse's rows from the backend (not the whole company's collection) and
 * re-renders on change. Returns an empty list while ``warehouseId`` is null.
 */
export function useWmsWarehouseCollection<K extends WmsCollection>(
  collection: K,
  warehouseId: WmsId | null,
): UseWmsCollectionResult<K> {
  const data = useSyncExternalStore(wmsStore.subscribe, () =>
    warehouseId
      ? wmsStore.getScopedSnapshot(collection, warehouseId)
      : (EMPTY_SCOPED as unknown as WmsCollectionMap[K][]),
  );

  useEffect(() => {
    if (warehouseId) void wmsStore.ensureLoadedScoped(collection, warehouseId);
  }, [collection, warehouseId]);

  return {
    data,
    loading: warehouseId ? !wmsStore.isLoadedScoped(collection, warehouseId) : false,
  };
}
