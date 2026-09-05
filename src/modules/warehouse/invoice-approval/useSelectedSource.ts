import { useSyncExternalStore } from 'react';

import { DEFAULT_INVOICE_SOURCE, type InvoiceSource } from './types';

/**
 * Which backend the approver is looking at — OMS (the default) or SAP. Lives
 * beside the selected warehouse and for the same reason: the approval page and
 * the sidebar pending-count badge must agree on it reactively (same tab) and
 * remember it across reloads, so the badge always counts what the page shows.
 */
const STORAGE_KEY = 'invoice-approval:source';

const listeners = new Set<() => void>();

function read(): InvoiceSource {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'SAP' ? 'SAP' : DEFAULT_INVOICE_SOURCE;
  } catch {
    return DEFAULT_INVOICE_SOURCE;
  }
}

export function setSelectedSource(source: InvoiceSource): void {
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
export function useSelectedSource(): [InvoiceSource, (source: InvoiceSource) => void] {
  const source = useSyncExternalStore(subscribe, read, () => DEFAULT_INVOICE_SOURCE);
  return [source, setSelectedSource];
}
