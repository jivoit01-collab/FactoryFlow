import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wmsStore } from '../store';
import { DEFAULT_WMS_SETTINGS } from '../types';
import { resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

describe('WMS settings', () => {
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

    // Simulate a reload: drop the in-memory cache; the backend keeps the data.
    wmsStore.reset();
    expect((await wmsStore.getSettings()).masterEnabled).toBe(true);
  });
});
