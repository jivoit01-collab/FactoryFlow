import { beforeEach, describe, expect, it } from 'vitest';

import {
  ApiAdapter,
  IndexedDbAdapter,
  LocalStorageAdapter,
  createWmsAdapter,
  setActiveWmsAdapter,
} from '../storage';
import { wmsStore } from '../store';
import type { Warehouse } from '../types';
import { WMS_SETTINGS_ID } from '../types';
import { createWmsId, nowIso } from '../utils';

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

beforeEach(() => {
  localStorage.clear();
});

describe('LocalStorageAdapter', () => {
  it('creates, gets, lists, updates and removes records', async () => {
    const adapter = new LocalStorageAdapter();
    const warehouse = makeWarehouse();

    await adapter.create('warehouses', warehouse);
    expect(await adapter.get('warehouses', warehouse.id)).toEqual(warehouse);
    expect(await adapter.list('warehouses')).toHaveLength(1);

    const updated = await adapter.update('warehouses', warehouse.id, { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');
    expect((await adapter.get('warehouses', warehouse.id))?.name).toBe('Renamed');

    await adapter.remove('warehouses', warehouse.id);
    expect(await adapter.get('warehouses', warehouse.id)).toBeNull();
    expect(await adapter.list('warehouses')).toHaveLength(0);
  });

  it('persists across a simulated reload (a fresh adapter reads the same data)', async () => {
    const warehouse = makeWarehouse({ code: 'WH-PERSIST' });
    await new LocalStorageAdapter().create('warehouses', warehouse);

    // A brand-new adapter instance == a page reload: same localStorage, no cache.
    const afterReload = await new LocalStorageAdapter().list('warehouses');
    expect(afterReload).toHaveLength(1);
    expect(afterReload[0]?.code).toBe('WH-PERSIST');
  });

  it('rejects updates to a missing record', async () => {
    await expect(
      new LocalStorageAdapter().update('warehouses', 'nope', { name: 'x' }),
    ).rejects.toThrow();
  });

  it('clearAll empties every collection', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.create('warehouses', makeWarehouse());
    await adapter.clearAll();
    expect(await adapter.list('warehouses')).toHaveLength(0);
  });
});

describe('createWmsAdapter (single swap point)', () => {
  it('builds the requested implementation', () => {
    expect(createWmsAdapter('localstorage')).toBeInstanceOf(LocalStorageAdapter);
    expect(createWmsAdapter('api')).toBeInstanceOf(ApiAdapter);
    // indexeddb resolves to the IDB adapter when available, else falls back.
    const idb = createWmsAdapter('indexeddb');
    expect(
      idb instanceof IndexedDbAdapter || idb instanceof LocalStorageAdapter,
    ).toBe(true);
  });

  it('api stub rejects every operation until the backend is wired', async () => {
    await expect(new ApiAdapter().list('warehouses')).rejects.toThrow(/not implemented/i);
  });
});

describe('wmsStore (central store over the active adapter)', () => {
  beforeEach(() => {
    setActiveWmsAdapter('localstorage');
    wmsStore.reset();
  });

  it('caches a created record and exposes it via the snapshot', async () => {
    await wmsStore.create('warehouses', makeWarehouse({ code: 'WH-STORE' }));
    expect(wmsStore.getSnapshot('warehouses')).toHaveLength(1);
    expect(wmsStore.getSnapshot('warehouses')[0]?.code).toBe('WH-STORE');
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
