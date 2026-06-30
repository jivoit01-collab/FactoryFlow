import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wmsStore } from '../store';
import type { Warehouse } from '../types';
import { WMS_SETTINGS_ID } from '../types';
import { createWmsId, nowIso } from '../utils';
import { resetWmsBackend } from './helpers/wmsBackendMock';

// The module persists only through the REST ApiAdapter; drive it with an
// in-memory stand-in for the backend (the raw REST contract is covered in
// wms.apiAdapter.test.ts).
vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

function makeWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    code: 'WH1',
    name: 'Main',
    description: '',
    enabled: true,
    columns: 5,
    rows: 4,
    levels: 1,
    namingScheme: {
      columnStyle: 'LETTERS',
      rowStyle: 'NUMBERS',
      levelStyle: 'NUMBERS',
      prefix: '',
      separator: '-',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('wmsStore (central store over the backend adapter)', () => {
  beforeEach(() => {
    resetWmsBackend();
    wmsStore.reset();
  });

  it('caches a created record and exposes it via the snapshot', async () => {
    await wmsStore.create('warehouses', makeWarehouse({ code: 'WH-STORE' }));
    expect(wmsStore.getSnapshot('warehouses')).toHaveLength(1);
    expect(wmsStore.getSnapshot('warehouses')[0]?.code).toBe('WH-STORE');
  });

  it('persists to the backend so data survives a store reset (reload)', async () => {
    await wmsStore.create('warehouses', makeWarehouse({ code: 'WH-PERSIST' }));

    // Reload: drop the in-memory cache, then re-read from the backend.
    wmsStore.reset();
    const reloaded = await wmsStore.load('warehouses');
    expect(reloaded.some((warehouse) => warehouse.code === 'WH-PERSIST')).toBe(true);
  });

  it('seeds the settings singleton with defaults on first read', async () => {
    const settings = await wmsStore.getSettings();
    expect(settings.id).toBe(WMS_SETTINGS_ID);
    expect(settings.masterEnabled).toBe(false);

    const saved = await wmsStore.saveSettings({ masterEnabled: true });
    expect(saved.masterEnabled).toBe(true);
    expect((await wmsStore.getSettings()).masterEnabled).toBe(true);
  });

  it('notifies subscribers on change', async () => {
    let calls = 0;
    const unsubscribe = wmsStore.subscribe(() => {
      calls += 1;
    });
    await wmsStore.create('warehouses', makeWarehouse());
    unsubscribe();
    expect(calls).toBeGreaterThan(0);
  });
});
