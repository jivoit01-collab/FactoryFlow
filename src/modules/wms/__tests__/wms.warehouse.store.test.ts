import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wmsStore } from '../store';
import {
  DEFAULT_NAMING_SCHEME,
  generateLayout,
  makeWarehouseLocation,
  makeZone,
} from '../services';
import type { Warehouse } from '../types';
import { createWmsId, nowIso } from '../utils';
import { apiClient, resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

function buildBundle(name = 'Main') {
  const timestamp = nowIso();
  const warehouse: Warehouse = {
    id: createWmsId(),
    code: name.toUpperCase(),
    name,
    description: '',
    enabled: true,
    columns: 3,
    rows: 2,
    levels: 1,
    namingScheme: DEFAULT_NAMING_SCHEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const generated = generateLayout({ columns: 3, rows: 2, levels: 1, naming: DEFAULT_NAMING_SCHEME });
  const locations = generated.map((cell) => makeWarehouseLocation(warehouse.id, cell));
  return { warehouse, zones: [], purposes: [], locations };
}

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

describe('warehouse store operations (Step 3)', () => {
  it('saves a bundle and persists it across a simulated reload', async () => {
    const bundle = buildBundle();
    await wmsStore.saveWarehouseBundle(bundle);

    // Reload: drop the cache, keep storage.
    wmsStore.reset();
    const persisted = await wmsStore.getWarehouseBundle(bundle.warehouse.id);
    expect(persisted?.warehouse.name).toBe('Main');
    expect(persisted?.locations).toHaveLength(6);
  });

  it('cascades delete to zones and locations', async () => {
    const bundle = buildBundle();
    const zone = makeZone(bundle.warehouse.id, {
      name: 'Z1',
      type: 'BULK',
      temperatureClass: null,
      color: '#000',
    });
    bundle.locations[0]!.zoneId = zone.id;
    await wmsStore.saveWarehouseBundle({ ...bundle, zones: [zone] });

    await wmsStore.deleteWarehouseCascade(bundle.warehouse.id);

    expect(await wmsStore.getWarehouseBundle(bundle.warehouse.id)).toBeNull();
    expect(wmsStore.getSnapshot('locations')).toHaveLength(0);
    expect(wmsStore.getSnapshot('zones')).toHaveLength(0);
  });

  it('bulk-updates and removes locations', async () => {
    const bundle = buildBundle();
    await wmsStore.saveWarehouseBundle(bundle);
    const ids = bundle.locations.map((location) => location.id);

    await wmsStore.updateMany('locations', ids.slice(0, 3), { enabled: false });
    const disabled = wmsStore.getSnapshot('locations').filter((location) => !location.enabled);
    expect(disabled).toHaveLength(3);

    await wmsStore.removeMany('locations', ids.slice(0, 2));
    expect(wmsStore.getSnapshot('locations')).toHaveLength(4);
  });

  it('replaceWarehouseBundle swaps stored state (the undo/redo primitive)', async () => {
    const bundle = buildBundle();
    await wmsStore.saveWarehouseBundle(bundle);

    // Replace with a structurally different bundle (fewer locations, new dims).
    const trimmed = {
      warehouse: { ...bundle.warehouse, columns: 1, rows: 1 },
      zones: [],
      purposes: [],
      locations: [bundle.locations[0]!],
    };
    await wmsStore.replaceWarehouseBundle(trimmed);

    const after = await wmsStore.getWarehouseBundle(bundle.warehouse.id);
    expect(after?.locations).toHaveLength(1);
    expect(after?.warehouse.columns).toBe(1);

    // Restore the original (an "undo") — full set comes back.
    await wmsStore.replaceWarehouseBundle(bundle);
    const restored = await wmsStore.getWarehouseBundle(bundle.warehouse.id);
    expect(restored?.locations).toHaveLength(6);
  });

  it('replaceWarehouseBundle writes only what changed (no full wipe-and-rewrite)', async () => {
    const bundle = buildBundle();
    await wmsStore.saveWarehouseBundle(bundle);

    // Edit a single location (as the editor does when assigning a purpose etc.).
    const next = {
      ...bundle,
      locations: bundle.locations.map((location, index) =>
        index === 0 ? { ...location, notes: 'edited', updatedAt: nowIso() } : location,
      ),
    };

    const del = vi.spyOn(apiClient, 'delete');
    const post = vi.spyOn(apiClient, 'post');
    await wmsStore.replaceWarehouseBundle(next);

    // Nothing is deleted, and only the one changed location is upserted — not all six.
    expect(del).not.toHaveBeenCalled();
    const bulkLocationCalls = post.mock.calls.filter(([url]) => url === '/wms/locations/bulk/');
    expect(bulkLocationCalls).toHaveLength(1);
    expect((bulkLocationCalls[0]![1] as unknown[])).toHaveLength(1);
    del.mockRestore();
    post.mockRestore();

    const after = await wmsStore.getWarehouseBundle(bundle.warehouse.id);
    expect(after?.locations).toHaveLength(6);
    expect(after?.locations.find((l) => l.id === bundle.locations[0]!.id)?.notes).toBe('edited');
  });

  it('keeps two warehouses isolated', async () => {
    const a = buildBundle('A');
    const b = buildBundle('B');
    await wmsStore.saveWarehouseBundle(a);
    await wmsStore.saveWarehouseBundle(b);

    const bundleB = await wmsStore.getWarehouseBundle(b.warehouse.id);
    expect(bundleB?.locations.every((location) => location.warehouseId === b.warehouse.id)).toBe(true);
    expect(wmsStore.getSnapshot('warehouses')).toHaveLength(2);
  });
});
