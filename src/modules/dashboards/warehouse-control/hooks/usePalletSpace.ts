/**
 * Warehouse pallet space, read straight off the WMS layout — every company's.
 *
 * The WMS module owns the grid (`locations`, each with a pallet capacity) and
 * the pallets standing on it, so the board reads those collections and folds
 * them rather than adding a parallel source of truth.
 *
 * Where the WMS screens read one company's layout, this board reads them all:
 * the racking is one physical structure, and a pallet standing in it takes the
 * slot whichever company's books it belongs to — so a board that measures the
 * building must not change answer with the company selector. The rows are keyed
 * on client-generated UUIDs, so merging companies cannot collide; the arithmetic
 * in `summarisePalletSpace` is unchanged.
 *
 * Deliberately read through this board's own queries rather than the shared
 * `wmsStore`: that store is the cache the per-company WMS screens read *and
 * write* through, and seeding it with a sibling company's warehouses would offer
 * an operator a grid they cannot save to.
 *
 * `enabled` reflects the module's master switch, which is itself per company —
 * so the board takes it as on when any company has switched it on. With it off
 * everywhere there is no layout to measure.
 */
import { useMemo } from 'react';

import { useControlWmsCollection } from '../api';
import type { PalletSpaceSummary } from '../types';
import { isWmsEnabledForAnyCompany, summarisePalletSpace } from '../utils/palletSpace';

export interface UsePalletSpaceResult {
  summary: PalletSpaceSummary;
  loading: boolean;
  /** False when the caller may not read it, or the WMS module is switched off. */
  enabled: boolean;
  /** True when the module itself is off, as opposed to simply having no layout. */
  moduleOff: boolean;
}

const EMPTY_SUMMARY: PalletSpaceSummary = {
  totalSpace: 0,
  usedSpace: 0,
  unavailableSpace: 0,
  freeSpace: 0,
  utilisationPct: 0,
  unplacedPallets: 0,
  locationsWithoutCapacity: 0,
  warehouses: [],
  goods: [],
  totalBoxes: 0,
};

const NO_RECORDS: never[] = [];

export function usePalletSpace(allowed = true): UsePalletSpaceResult {
  const settingsQuery = useControlWmsCollection('settings', allowed);
  const moduleOn = isWmsEnabledForAnyCompany(settingsQuery.data);
  const enabled = allowed && moduleOn;

  // The layout is only worth pulling once the switch says there is one.
  const warehouses = useControlWmsCollection('warehouses', enabled);
  const locations = useControlWmsCollection('locations', enabled);
  const pallets = useControlWmsCollection('pallets', enabled);
  const purposes = useControlWmsCollection('cellPurposes', enabled);

  const summary = useMemo(() => {
    if (!enabled) return EMPTY_SUMMARY;
    return summarisePalletSpace({
      warehouses: warehouses.data ?? NO_RECORDS,
      locations: locations.data ?? NO_RECORDS,
      pallets: pallets.data ?? NO_RECORDS,
      purposes: purposes.data ?? NO_RECORDS,
    });
  }, [enabled, warehouses.data, locations.data, pallets.data, purposes.data]);

  return {
    summary,
    loading:
      allowed &&
      (settingsQuery.isLoading ||
        (enabled &&
          (warehouses.isLoading ||
            locations.isLoading ||
            pallets.isLoading ||
            purposes.isLoading))),
    enabled,
    // Only once the switch has actually answered — while it is still loading the
    // module is not "off", it is unknown, and saying otherwise flashes the
    // "switched off" notice on every open.
    moduleOff: allowed && !settingsQuery.isLoading && !moduleOn,
  };
}
