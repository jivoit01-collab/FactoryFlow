import { beforeEach, describe, expect, it } from 'vitest';

import { getActiveWmsAdapterKind, setActiveWmsAdapter } from '../storage';
import { wmsStore } from '../store';
import { DEFAULT_WMS_SETTINGS } from '../types';

beforeEach(() => {
  localStorage.clear();
  setActiveWmsAdapter('localstorage');
  wmsStore.reset();
});

describe('WMS settings (Step 2)', () => {
  it('loads defaults on first read, then saves and re-loads changes', async () => {
    const initial = await wmsStore.getSettings();
    expect(initial.masterEnabled).toBe(DEFAULT_WMS_SETTINGS.masterEnabled);
    expect(initial.putawayMode).toBe(DEFAULT_WMS_SETTINGS.putawayMode);

    await wmsStore.saveSettings({
      masterEnabled: true,
      putawayMode: 'MANUAL',
      capacityViolation: 'BLOCK',
    });

    const reloaded = await wmsStore.getSettings();
    expect(reloaded.masterEnabled).toBe(true);
    expect(reloaded.putawayMode).toBe('MANUAL');
    expect(reloaded.capacityViolation).toBe('BLOCK');
  });

  it('master flag survives a simulated reload (fresh store, same backend)', async () => {
    await wmsStore.saveSettings({ masterEnabled: true });

    // Simulate a reload: drop the in-memory cache, keep localStorage.
    wmsStore.reset();
    expect((await wmsStore.getSettings()).masterEnabled).toBe(true);
  });

  it('switches the storage adapter and remembers the choice', async () => {
    await wmsStore.switchStorageAdapter('localstorage');
    expect(getActiveWmsAdapterKind()).toBe('localstorage');
    expect((await wmsStore.getSettings()).storageAdapter).toBe('localstorage');

    // The choice is persisted in a fixed key for the next page load.
    expect(localStorage.getItem('wms:active-adapter')).toBe('localstorage');
  });
});
