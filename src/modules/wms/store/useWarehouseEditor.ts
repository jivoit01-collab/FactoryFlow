/**
 * Editor controller for one warehouse, with undo/redo (Step 3).
 *
 * Every edit is expressed as a pure transform of the current `WarehouseBundle`
 * and routed through `mutate`, which snapshots the prior bundle onto the undo
 * stack and persists the next one via `wmsStore.replaceWarehouseBundle`. Undo /
 * redo simply restore a snapshot. This gives uniform history across zone, bulk,
 * structural, and rename edits without per-action bookkeeping.
 */
import { useCallback, useMemo, useState } from 'react';

import type { WarehouseBundle } from '../services';
import type { WmsId } from '../types';
import { useWarehouseLayout } from './useWarehouses';
import { wmsStore } from './wmsStore';

const HISTORY_LIMIT = 50;

export interface WarehouseEditor {
  bundle: WarehouseBundle | null;
  loading: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Apply a pure transform of the current bundle (undoable). */
  mutate: (transform: (bundle: WarehouseBundle) => WarehouseBundle) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export function useWarehouseEditor(warehouseId: WmsId | null): WarehouseEditor {
  const layout = useWarehouseLayout(warehouseId);
  const [undoStack, setUndoStack] = useState<WarehouseBundle[]>([]);
  const [redoStack, setRedoStack] = useState<WarehouseBundle[]>([]);
  const [busy, setBusy] = useState(false);

  const bundle: WarehouseBundle | null = useMemo(
    () =>
      layout.warehouse
        ? {
            warehouse: layout.warehouse,
            zones: layout.zones,
            purposes: layout.purposes,
            locations: layout.locations,
          }
        : null,
    [layout.warehouse, layout.zones, layout.purposes, layout.locations],
  );

  const persist = useCallback(async (next: WarehouseBundle) => {
    setBusy(true);
    try {
      await wmsStore.replaceWarehouseBundle(next);
    } finally {
      setBusy(false);
    }
  }, []);

  const mutate = useCallback(
    async (transform: (current: WarehouseBundle) => WarehouseBundle) => {
      if (!bundle) return;
      const next = transform(bundle);
      setUndoStack((stack) => [...stack, bundle].slice(-HISTORY_LIMIT));
      setRedoStack([]);
      await persist(next);
    },
    [bundle, persist],
  );

  const undo = useCallback(async () => {
    if (!bundle || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1]!;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, bundle].slice(-HISTORY_LIMIT));
    await persist(previous);
  }, [bundle, undoStack, persist]);

  const redo = useCallback(async () => {
    if (!bundle || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, bundle].slice(-HISTORY_LIMIT));
    await persist(next);
  }, [bundle, redoStack, persist]);

  return {
    bundle,
    loading: layout.loading,
    busy,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    mutate,
    undo,
    redo,
  };
}
