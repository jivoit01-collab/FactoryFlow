/**
 * THE single place that decides which storage implementation is active.
 *
 * Warehouse Ops persists exclusively through the backend REST API — there is no
 * longer a browser-local (IndexedDB / localStorage) option. Everything that
 * needs the active store calls `getActiveWmsAdapter()`; it always returns the
 * one shared `ApiAdapter`.
 */
import type { WmsStorageAdapter } from './adapter.types';
import { ApiAdapter } from './apiAdapter';

let activeAdapter: WmsStorageAdapter | null = null;

/** The active adapter (the backend API), created once and reused. */
export function getActiveWmsAdapter(): WmsStorageAdapter {
  if (!activeAdapter) activeAdapter = new ApiAdapter();
  return activeAdapter;
}
