/**
 * Reusable directed-putaway bin picker.
 *
 * The "choose a space" half of the WMS Receive flow, extracted so other screens
 * (e.g. the BST receive page) can offer the same smart destination picker: the
 * putaway engine ranks every legal bin (★ = recommended), an empty-by-section
 * dropdown, and search / scan-a-bin. Controlled — the parent owns the selected
 * location id and is told the resolved location + its validation on every change,
 * so it can gate its own confirm button.
 */
import { Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Input, Label, NativeSelect } from '@/shared/components/ui';

import type { MoveItem, PutawaySuggestion, ValidationResult } from '../services';
import {
  buildOccupancyIndex,
  countEmptyLocations,
  groupEmptyLocationsBySection,
  locationHoldsStock,
  outsideLocationIds,
  suggestPutaway,
  validateMove,
} from '../services';
import { useWarehouses, useWmsCollection, useWmsSettings } from '../store';
import type { WarehouseLocation } from '../types';
import { WmsScanButton } from './WmsScanButton';

export interface PutawaySelection {
  location: WarehouseLocation | null;
  validation: ValidationResult | null;
}

interface PutawayBinPickerProps {
  /** The warehouse whose bins are offered. */
  warehouseId: string;
  item: MoveItem;
  /** Total units being put away (drives capacity ranking/validation). */
  quantity: number;
  added: { pallets: number; units: number; weight: number; volume: number };
  selectedLocationId: string | null;
  onChange: (selection: PutawaySelection) => void;
}

const SPACE_LIMIT = 90;

export function PutawayBinPicker({
  warehouseId,
  item,
  quantity,
  added,
  selectedLocationId,
  onChange,
}: PutawayBinPickerProps) {
  const { settings } = useWmsSettings();
  const { warehouses } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
  const { data: purposes } = useWmsCollection('cellPurposes');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');

  const [spaceQuery, setSpaceQuery] = useState('');

  const warehouseLocations = useMemo(
    () => locations.filter((location) => location.warehouseId === warehouseId),
    [locations, warehouseId],
  );
  const activeWarehouse = useMemo(
    () => warehouses.find((wh) => wh.id === warehouseId) ?? null,
    [warehouses, warehouseId],
  );
  const outsideIds = useMemo(
    () =>
      activeWarehouse
        ? outsideLocationIds(activeWarehouse, warehouseLocations)
        : new Set<string>(),
    [activeWarehouse, warehouseLocations],
  );
  const purposeById = useMemo(
    () => new Map(purposes.map((purpose) => [purpose.id, purpose])),
    [purposes],
  );

  const ready = item.itemCode.trim().length > 0 && quantity > 0;

  // Every legal destination for this item, ranked best-first.
  const availableSpaces: PutawaySuggestion[] = useMemo(() => {
    if (!ready || !settings) return [];
    return suggestPutaway({
      settings,
      item,
      quantity,
      added,
      locations: warehouseLocations.filter((l) => !outsideIds.has(l.id)),
      inventory,
      pallets,
      purposesById: purposeById,
      limit: warehouseLocations.length,
    });
  }, [ready, settings, item, quantity, added, warehouseLocations, inventory, pallets, purposeById, outsideIds]);

  const recommendedIds = useMemo(
    () => new Set(availableSpaces.slice(0, 3).map((s) => s.location.id)),
    [availableSpaces],
  );

  const occupancy = useMemo(
    () => buildOccupancyIndex(warehouseLocations, inventory, pallets, purposeById),
    [warehouseLocations, inventory, pallets, purposeById],
  );

  const emptyBySection = useMemo(() => {
    const legalIds = new Set(availableSpaces.map((space) => space.location.id));
    return groupEmptyLocationsBySection({
      locations: warehouseLocations.filter((location) => legalIds.has(location.id)),
      warehouses,
      occupancy,
      purposesById: purposeById,
    });
  }, [availableSpaces, warehouseLocations, warehouses, occupancy, purposeById]);

  const totalEmpty = useMemo(() => countEmptyLocations(emptyBySection), [emptyBySection]);

  const filteredSpaces = useMemo(() => {
    const query = spaceQuery.trim().toLowerCase();
    if (!query) return availableSpaces;
    return availableSpaces.filter((s) => s.location.code.toLowerCase().includes(query));
  }, [availableSpaces, spaceQuery]);
  const shownSpaces = filteredSpaces.slice(0, SPACE_LIMIT);

  const computeValidation = useCallback(
    (location: WarehouseLocation | null): ValidationResult | null => {
      if (!location || !settings || !ready) return null;
      return validateMove({
        settings,
        destination: location,
        destinationInventory: inventory.filter((r) => r.locationId === location.id),
        destinationPalletCount: pallets.filter((p) => p.currentLocationId === location.id).length,
        item,
        quantity,
        added,
        destinationHoldsStock: locationHoldsStock(location, purposeById),
        destinationCounted: !outsideIds.has(location.id),
      });
    },
    [settings, ready, inventory, pallets, item, quantity, added, purposeById, outsideIds],
  );

  const selectLocation = useCallback(
    (locationId: string | null) => {
      const location = locationId
        ? warehouseLocations.find((l) => l.id === locationId) ?? null
        : null;
      onChange({ location, validation: computeValidation(location) });
    },
    [warehouseLocations, computeValidation, onChange],
  );

  /** Scanning/typing a bin code jumps straight to it (even if invalid, so the
   * validation panel can explain why). */
  const selectSpaceByCode = useCallback(
    (code: string) => {
      const key = code.trim().toLowerCase();
      if (!key) return;
      const location = warehouseLocations.find((l) => l.code.toLowerCase() === key);
      if (location) {
        selectLocation(location.id);
        setSpaceQuery('');
      } else {
        toast.error('No space matched that code.');
      }
    },
    [warehouseLocations, selectLocation],
  );

  const selectedLocation = selectedLocationId
    ? warehouseLocations.find((l) => l.id === selectedLocationId) ?? null
    : null;
  const validation = useMemo(
    () => computeValidation(selectedLocation),
    [computeValidation, selectedLocation],
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Nothing to put away.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Pick an empty space by section — no scanning needed. */}
      <div className="space-y-1.5">
        <Label htmlFor="bst-putaway-empty">
          Pick an empty location
          <span className="ml-1 text-xs font-normal text-muted-foreground">({totalEmpty} empty)</span>
        </Label>
        <NativeSelect
          id="bst-putaway-empty"
          value={selectedLocationId ?? ''}
          onChange={(event) => selectLocation(event.target.value || null)}
        >
          <option value="">Select an empty location…</option>
          {emptyBySection.map((section) => (
            <optgroup key={section.key} label={section.label}>
              {section.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                  {recommendedIds.has(location.id) ? ' ★' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
        {totalEmpty === 0 ? (
          <p className="text-xs text-muted-foreground">
            No empty locations for this item — the spaces below are partly filled.
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={spaceQuery}
          placeholder="Search spaces, or scan a bin"
          onChange={(event) => setSpaceQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && spaceQuery.trim()) selectSpaceByCode(spaceQuery);
          }}
        />
        <WmsScanButton label="Scan" onScan={selectSpaceByCode} />
      </div>

      {availableSpaces.length === 0 ? (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          No available spaces — every block is full, restricted for this item, or outside a numbered
          area.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {filteredSpaces.length} available space{filteredSpaces.length === 1 ? '' : 's'} · ★ =
            recommended
          </p>
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-auto rounded-md border p-2 sm:grid-cols-3">
            {shownSpaces.map((space) => {
              const selected = selectedLocationId === space.location.id;
              const recommended = recommendedIds.has(space.location.id);
              return (
                <button
                  key={space.location.id}
                  type="button"
                  onClick={() => selectLocation(space.location.id)}
                  className={`flex flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition ${
                    selected ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center gap-1 font-mono text-sm">
                    {recommended ? <span className="text-emerald-600">★</span> : null}
                    {space.location.code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(space.occupancyPct)}% full
                  </span>
                </button>
              );
            })}
          </div>
          {filteredSpaces.length > shownSpaces.length ? (
            <p className="text-xs text-muted-foreground">
              Showing the top {shownSpaces.length} of {filteredSpaces.length} — search to narrow down.
            </p>
          ) : null}
        </div>
      )}

      {validation ? (
        <div className="space-y-2">
          {validation.errors.map((issue) => (
            <p
              key={issue.code}
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {issue.message}
            </p>
          ))}
          {validation.warnings.map((issue) => (
            <p
              key={issue.code}
              className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
            >
              {issue.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
