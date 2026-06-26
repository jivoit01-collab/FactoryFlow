/**
 * React bindings for the central WMS store.
 *
 * Screens use these hooks to read collections reactively; they never import a
 * storage adapter directly. Built on `useSyncExternalStore` so components
 * re-render whenever the store's cache changes.
 */
import { useEffect, useSyncExternalStore } from 'react';

import type { WmsCollection, WmsCollectionMap } from '../storage';
import { wmsStore } from './wmsStore';

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
