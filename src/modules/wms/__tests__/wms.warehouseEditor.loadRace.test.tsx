/**
 * Regression test for the "a freshly-designed warehouse deletes its own layout
 * after a moment" bug.
 *
 * The editor's `bundle` is assembled from four independently-loaded collections
 * (warehouses, zones, cellPurposes, locations) and becomes non-null as soon as
 * only the warehouse has loaded. If a mutation runs while a slower collection is
 * still mid-fetch (empty), `replaceWarehouseBundle` diffs that empty array
 * against the loaded cache and DELETES every record it thinks was removed —
 * silently wiping the zones/purposes/locations that had not loaded yet.
 *
 * The fix gates `useWarehouseEditor.mutate` (and the editor page's self-heal
 * effect) on a fully-loaded layout. This test drives the hook with one
 * collection held pending and asserts a mutation issued during that window is a
 * no-op — nothing is deleted — and that mutations resume once loading finishes.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A backend mock whose `locations` list can be held pending to reproduce the
// load-order race deterministically.
const tables = new Map<string, Map<string, Record<string, unknown> & { id: string }>>();
let gateLocationsList: (() => void) | null = null;
const deleteSpy = vi.fn();

function tableFor(name: string) {
  let table = tables.get(name);
  if (!table) {
    table = new Map();
    tables.set(name, table);
  }
  return table;
}
function parse(url: string) {
  // Route by path only; a query string (e.g. ?warehouseId=) is a filter, not a
  // record id — same as the real backend.
  const path = url.split('?')[0]!;
  const parts = path.split('/').filter(Boolean); // ['wms', collection, tail?]
  return { collection: parts[1], tail: parts[2] as string | undefined };
}

const apiClient = {
  async get(url: string) {
    const { collection, tail } = parse(url);
    const table = tableFor(collection);
    if (!tail) {
      // Hold the very first `locations` list open until the test releases it,
      // so `layout.loading` stays true while the other collections finish.
      if (collection === 'locations' && gateLocationsList) {
        await new Promise<void>((resolve) => {
          gateLocationsList = resolve;
        });
        gateLocationsList = null;
      }
      return { data: Array.from(table.values()) };
    }
    const doc = table.get(tail);
    if (!doc) throw { response: { status: 404 } };
    return { data: doc };
  },
  async post(url: string, body: unknown) {
    const { collection, tail } = parse(url);
    const table = tableFor(collection);
    if (tail === 'bulk') {
      const saved = (body as (Record<string, unknown> & { id: string })[]).map((r) => {
        table.set(r.id, { ...r });
        return { ...r };
      });
      return { data: saved };
    }
    const doc = body as Record<string, unknown> & { id: string };
    table.set(doc.id, { ...doc });
    return { data: { ...doc } };
  },
  async patch(url: string, body: unknown) {
    const { collection, tail } = parse(url);
    const table = tableFor(collection);
    const existing = tail ? table.get(tail) : undefined;
    if (!existing) throw { response: { status: 404 } };
    const merged = { ...existing, ...(body as Record<string, unknown>), id: existing.id };
    table.set(existing.id, merged);
    return { data: merged };
  },
  async delete(url: string) {
    const { collection, tail } = parse(url);
    deleteSpy(collection, tail);
    if (tail) tableFor(collection).delete(tail);
    return { data: undefined };
  },
};

vi.mock('@/core/api', () => ({ apiClient }));

// Imported after the mock is registered.
const { wmsStore } = await import('../store/wmsStore');
const { useWarehouseEditor } = await import('../store/useWarehouseEditor');
const { generateLayout, makeWarehouseLocation, makeCellPurpose, DEFAULT_NAMING_SCHEME } =
  await import('../services');
const { createWmsId, nowIso } = await import('../utils');

async function seedDesign() {
  const timestamp = nowIso();
  const warehouse = {
    id: createWmsId(),
    code: 'MAIN',
    name: 'Main',
    description: '',
    enabled: true,
    columns: 3,
    rows: 2,
    levels: 1,
    namingScheme: DEFAULT_NAMING_SCHEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const purpose = makeCellPurpose(warehouse.id, {
    name: 'Storage',
    color: '#16a34a',
    holdsStock: true,
  });
  const generated = generateLayout({ columns: 3, rows: 2, levels: 1, naming: DEFAULT_NAMING_SCHEME });
  const locations = generated.map((cell) => makeWarehouseLocation(warehouse.id, cell));
  await wmsStore.saveWarehouseBundle({ warehouse, zones: [], purposes: [purpose], locations });
  return { warehouse, purpose, locations };
}

beforeEach(() => {
  tables.clear();
  deleteSpy.mockClear();
  gateLocationsList = null;
  wmsStore.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('warehouse editor — load-order race (regression)', () => {
  it('does not delete the layout when a mutation is issued before all collections load', async () => {
    const { warehouse, purpose } = await seedDesign();

    // Simulate a fresh page open: empty cache, and hold the `locations` list
    // pending so the editor stays in its loading state.
    wmsStore.reset();
    gateLocationsList = () => {}; // arm the gate (replaced with the real resolver on first call)

    const { result } = renderHook(() => useWarehouseEditor(warehouse.id));

    // Warehouse + zones + purposes resolve; locations is still pending → loading.
    await waitFor(() => expect(result.current.bundle).not.toBeNull());
    expect(result.current.loading).toBe(true);

    // A mutation that (because locations hasn't loaded) carries an empty layout —
    // exactly what the self-heal effect used to hand `replaceWarehouseBundle`.
    await act(async () => {
      await result.current.mutate((current) => ({ ...current, purposes: [], locations: [] }));
    });

    // The guard makes it a no-op: nothing was deleted from the backend.
    expect(deleteSpy).not.toHaveBeenCalled();

    // Release locations and let loading settle.
    await act(async () => {
      gateLocationsList?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The design survived intact.
    const persisted = await wmsStore.getWarehouseBundle(warehouse.id);
    expect(persisted?.locations).toHaveLength(6);
    expect(persisted?.purposes.map((p) => p.id)).toContain(purpose.id);
  });

  it('applies a legitimate deletion once the layout is fully loaded', async () => {
    const { warehouse, purpose } = await seedDesign();
    wmsStore.reset();

    const { result } = renderHook(() => useWarehouseEditor(warehouse.id));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // With everything loaded, removing the purpose really removes it.
    await act(async () => {
      await result.current.mutate((current) => ({ ...current, purposes: [] }));
    });

    expect(deleteSpy).toHaveBeenCalledWith('cellPurposes', purpose.id);
    const persisted = await wmsStore.getWarehouseBundle(warehouse.id);
    expect(persisted?.purposes).toHaveLength(0);
    expect(persisted?.locations).toHaveLength(6);
  });
});
