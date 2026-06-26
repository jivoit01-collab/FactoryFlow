/**
 * THE single place that decides which storage implementation is active.
 *
 * "Done when … the active adapter can be changed in one place." This is that
 * place. Call `setActiveWmsAdapter('localstorage' | 'api' | 'indexeddb')` (Step 2
 * wires this to the settings panel) and every consumer that reads
 * `getActiveWmsAdapter()` picks up the change.
 */
import type { StorageAdapterKind } from '../types';
import type { WmsStorageAdapter } from './adapter.types';
import { ApiAdapter } from './apiAdapter';
import { IndexedDbAdapter, isIndexedDbAvailable } from './indexedDbAdapter';
import { LocalStorageAdapter } from './localStorageAdapter';

/** Default backing store when nothing has been selected yet. */
export const DEFAULT_ADAPTER_KIND: StorageAdapterKind = 'indexeddb';

/**
 * The active-adapter choice is remembered in a fixed localStorage key (not in a
 * collection), so it survives a reload independently of which backend holds the
 * data. This is what lets the settings storage-selector "stick".
 */
const ADAPTER_KIND_KEY = 'wms:active-adapter';

function isAdapterKind(value: unknown): value is StorageAdapterKind {
  return value === 'indexeddb' || value === 'localstorage' || value === 'api';
}

function readPersistedKind(): StorageAdapterKind | null {
  try {
    const value = window.localStorage.getItem(ADAPTER_KIND_KEY);
    return isAdapterKind(value) ? value : null;
  } catch {
    return null;
  }
}

function persistKind(kind: StorageAdapterKind): void {
  try {
    window.localStorage.setItem(ADAPTER_KIND_KEY, kind);
  } catch {
    // Best-effort: a private-mode storage failure shouldn't break the module.
  }
}

/**
 * Build a fresh adapter of the requested kind. Requesting `indexeddb` in an
 * environment without IndexedDB transparently falls back to localStorage so the
 * module never hard-fails on capability gaps.
 */
export function createWmsAdapter(kind: StorageAdapterKind): WmsStorageAdapter {
  switch (kind) {
    case 'indexeddb':
      return isIndexedDbAvailable() ? new IndexedDbAdapter() : new LocalStorageAdapter();
    case 'localstorage':
      return new LocalStorageAdapter();
    case 'api':
      return new ApiAdapter();
    default: {
      // Exhaustiveness guard — a new kind must be handled above.
      const exhaustive: never = kind;
      throw new Error(`Unknown WMS storage adapter kind: ${String(exhaustive)}`);
    }
  }
}

let activeAdapter: WmsStorageAdapter | null = null;
let activeKind: StorageAdapterKind | null = null;

/** The current adapter, lazily created from the persisted (or default) kind. */
export function getActiveWmsAdapter(): WmsStorageAdapter {
  if (!activeAdapter) {
    activeKind = readPersistedKind() ?? DEFAULT_ADAPTER_KIND;
    activeAdapter = createWmsAdapter(activeKind);
  }
  return activeAdapter;
}

/** The kind the active adapter was requested as (what the settings UI shows). */
export function getActiveWmsAdapterKind(): StorageAdapterKind {
  if (!activeKind) getActiveWmsAdapter();
  return activeKind ?? DEFAULT_ADAPTER_KIND;
}

/** Swap the active adapter (e.g. when the settings storage selector changes). */
export function setActiveWmsAdapter(kind: StorageAdapterKind): WmsStorageAdapter {
  activeKind = kind;
  activeAdapter = createWmsAdapter(kind);
  persistKind(kind);
  return activeAdapter;
}
