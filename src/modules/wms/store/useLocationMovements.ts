/**
 * Fetch one page of a location's movement audit trail (newest first).
 *
 * Movements are unbounded in an FMCG warehouse, so they are fetched on demand,
 * server-paginated — never pulled into the cached `movements` collection. Pass
 * `locationId = null` to fetch nothing (e.g. while the detail panel is closed).
 *
 * State is only ever set inside the async callbacks; `loading` is derived from
 * whether the last fetched page matches the current request key (so no
 * synchronous setState runs in the effect body).
 */
import { useEffect, useState } from 'react';

import type { MovementLogEntry, WmsId } from '../types';
import { wmsStore } from './wmsStore';

export interface UseLocationMovementsResult {
  movements: MovementLogEntry[];
  /** Total movements for this location across all pages. */
  count: number;
  loading: boolean;
  error: boolean;
}

interface Fetched {
  movements: MovementLogEntry[];
  count: number;
  /** The request key the fetched page belongs to. */
  key: string;
}

export function useLocationMovements(
  locationId: WmsId | null,
  limit: number,
  offset = 0,
): UseLocationMovementsResult {
  const key = locationId ? `${locationId}:${limit}:${offset}` : '';
  const [fetched, setFetched] = useState<Fetched>({ movements: [], count: 0, key: '__init__' });
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    wmsStore
      .listLocationMovements(locationId, limit, offset)
      .then((page) => {
        if (cancelled) return;
        setFetched({ movements: page.results, count: page.count, key });
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId, limit, offset, key]);

  if (!locationId) return { movements: [], count: 0, loading: false, error: false };
  const stale = fetched.key !== key;
  return {
    movements: stale ? [] : fetched.movements,
    count: stale ? 0 : fetched.count,
    loading: stale,
    error: stale ? false : error,
  };
}
