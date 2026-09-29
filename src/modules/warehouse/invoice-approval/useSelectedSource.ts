import { useSyncExternalStore } from 'react';

import { DEFAULT_INVOICE_SOURCE, type ToggleSource } from './types';

/**
 * Which backend the approver is looking at — OMS (the default) or SAP. The
 * factory app's own held bills are not part of the toggle; they show under
 * either. Lives beside the selected warehouse and for the same reason: the
 * approval page and the sidebar pending-count badge must agree on it
 * reactively (same tab) and remember it across reloads, so the badge always
 * counts what the page shows.
 */
const STORAGE_KEY = 'invoice-approval:source';

const listeners = new Set<() => void>();

function read(): ToggleSource {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'SAP' ? 'SAP' : DEFAULT_INVOICE_SOURCE;
  } catch {
    return DEFAULT_INVOICE_SOURCE;
  }
}

export function setSelectedSource(source: ToggleSource): void {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive accessor: `[source, setSource]`. */
export function useSelectedSource(): [ToggleSource, (source: ToggleSource) => void] {
  const source = useSyncExternalStore(subscribe, read, () => DEFAULT_INVOICE_SOURCE);
  return [source, setSelectedSource];
}
