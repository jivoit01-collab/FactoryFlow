import { useSyncExternalStore } from 'react';

/**
 * The warehouse the approver is currently working in. The backend scopes the
 * invoice list/count by warehouse (`whs`), so both the approval page and the
 * sidebar pending-count badge need to share this selection reactively (same tab)
 * and remember it across reloads.
 */
const STORAGE_KEY = 'invoice-approval:whs';

const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setSelectedWarehouse(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive accessor: `[warehouse, setWarehouse]`. */
export function useSelectedWarehouse(): [string, (code: string) => void] {
  const warehouse = useSyncExternalStore(subscribe, read, () => '');
  return [warehouse, setSelectedWarehouse];
}
