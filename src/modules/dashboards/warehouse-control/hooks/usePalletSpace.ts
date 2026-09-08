/**
 * Warehouse pallet space, read straight off the WMS layout.
 *
 * The WMS module owns the grid (`locations`, each with a pallet capacity) and
 * the pallets standing on it, so the board reads those collections and folds
 * them rather than adding a parallel source of truth. `enabled` reflects the
 * module's master switch — with WMS off there is no layout to measure.
 */
import { useMemo } from 'react';

import { useWmsCollection, useWmsEnabled } from '@/modules/wms';

import type { PalletSpaceSummary } from '../types';
import { summarisePalletSpace } from '../utils/palletSpace';

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
};

export function usePalletSpace(allowed = true): UsePalletSpaceResult {
  const moduleOn = useWmsEnabled();
  const enabled = allowed && moduleOn;

  const warehouses = useWmsCollection('warehouses');
  const locations = useWmsCollection('locations');
  const pallets = useWmsCollection('pallets');
  const purposes = useWmsCollection('cellPurposes');

  const summary = useMemo(() => {
    if (!enabled) return EMPTY_SUMMARY;
    return summarisePalletSpace({
      warehouses: warehouses.data,
      locations: locations.data,
      pallets: pallets.data,
      purposes: purposes.data,
    });
  }, [enabled, warehouses.data, locations.data, pallets.data, purposes.data]);

  return {
    summary,
    loading:
      enabled && (warehouses.loading || locations.loading || pallets.loading || purposes.loading),
    enabled,
    moduleOff: allowed && !moduleOn,
  };
}
