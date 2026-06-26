/**
 * React bindings for the WMS settings singleton + the master enable gate.
 *
 * `useWmsSettings` reads the settings record reactively (seeding defaults on
 * first run) and exposes a `save` helper. `useWmsEnabled` is the single source
 * of truth the rest of the app uses to decide whether any WMS UI/steps appear —
 * when it returns false the host app must behave exactly as it does today.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { StorageAdapterKind, WmsSettings } from '../types';
import { WMS_SETTINGS_ID } from '../types';
import { wmsStore } from './wmsStore';

export interface UseWmsSettingsResult {
  settings: WmsSettings | null;
  loading: boolean;
  save: (patch: Partial<Omit<WmsSettings, 'id'>>) => Promise<WmsSettings>;
  switchStorageAdapter: (kind: StorageAdapterKind) => Promise<WmsSettings>;
}

export function useWmsSettings(): UseWmsSettingsResult {
  const records = useSyncExternalStore(wmsStore.subscribe, () =>
    wmsStore.getSnapshot('settings'),
  );
  const [loading, setLoading] = useState(!wmsStore.isLoaded('settings'));

  useEffect(() => {
    let active = true;
    void wmsStore.getSettings().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const settings = records.find((record) => record.id === WMS_SETTINGS_ID) ?? null;

  const save = useCallback(
    (patch: Partial<Omit<WmsSettings, 'id'>>) => wmsStore.saveSettings(patch),
    [],
  );

  const switchStorageAdapter = useCallback(
    (kind: StorageAdapterKind) => wmsStore.switchStorageAdapter(kind),
    [],
  );

  return { settings, loading, save, switchStorageAdapter };
}

/** Master switch. When false, the WMS feature must be invisible across the app. */
export function useWmsEnabled(): boolean {
  const { settings } = useWmsSettings();
  return settings?.masterEnabled ?? false;
}
