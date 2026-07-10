/**
 * Receiving & putaway flow (Step 7).
 *
 * The operator scans an item (or new pallet plate) to identify the material,
 * records box count / units-per-box / lot / expiry, then puts it away. In
 * directed or hybrid mode the system suggests the best legal block (via the
 * putaway engine, which reuses Step 6 validation); in manual mode the operator
 * scans a destination. On confirm the store creates the pallet + inventory,
 * writes a PUTAWAY movement, and the map updates.
 */
import { PackagePlus, ScanLine, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import type { WmsLabelData } from '../components/WmsPrintLabel';
import { WmsPrintLabelButton } from '../components/WmsPrintLabelButton';
import { WmsScanButton } from '../components/WmsScanButton';
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
import { useWarehouses, useWmsCollection, useWmsEnabled, useWmsSettings, wmsStore } from '../store';
import type { MaterialWarehouseProfile } from '../types';
import { notifyFail, notifyOk } from '../utils';

export default function WmsReceivePage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { warehouses } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
  const { data: purposes } = useWmsCollection('cellPurposes');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: materials } = useWmsCollection('materials');

  const [warehouseId, setWarehouseId] = useState<string>('');
  const [scanQuery, setScanQuery] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [boxCount, setBoxCount] = useState(1);
  const [unitsPerBox, setUnitsPerBox] = useState<number | ''>('');
  const [uom, setUom] = useState('EA');
  const [spaceQuery, setSpaceQuery] = useState('');
  const [destLocationId, setDestLocationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The label for the most recently received pallet, so it can be printed.
  const [lastPalletLabel, setLastPalletLabel] = useState<WmsLabelData | null>(null);

  const activeWarehouseId = warehouseId || warehouses[0]?.id || '';

  const warehouseLocations = useMemo(
    () => locations.filter((location) => location.warehouseId === activeWarehouseId),
    [locations, activeWarehouseId],
  );
  const activeWarehouse = useMemo(
    () => warehouses.find((wh) => wh.id === activeWarehouseId) ?? null,
    [warehouses, activeWarehouseId],
  );
  const outsideIds = useMemo(
    () => (activeWarehouse ? outsideLocationIds(activeWarehouse, warehouseLocations) : new Set<string>()),
    [activeWarehouse, warehouseLocations],
  );
  const purposeById = useMemo(
    () => new Map(purposes.map((purpose) => [purpose.id, purpose])),
    [purposes],
  );
  const materialByItem = useMemo(() => {
    const map = new Map<string, MaterialWarehouseProfile>();
    for (const material of materials) map.set(material.itemCode, material);
    return map;
  }, [materials]);

  const quantity = boxCount * (typeof unitsPerBox === 'number' && unitsPerBox > 0 ? unitsPerBox : 1);
  const profile = materialByItem.get(itemCode);

  // A scanned item resolved against the catalog needs no manual identity entry —
  // the master already holds its name, UoM, units/box and what it tracks. Only
  // ask for the per-receipt fields the item is actually configured to track.
  const recognized = Boolean(profile);
  const showLot = recognized ? Boolean(profile?.trackLot) : true;
  const showExpiry = recognized ? Boolean(profile?.trackExpiry) : true;

  const item: MoveItem = useMemo(
    () => ({
      itemCode,
      materialType: profile?.materialType ?? '',
      temperatureClass: profile?.temperatureClass ?? null,
      hazmatClass: profile?.hazmatClass ?? '',
      lotNumber,
      serialNumber: '',
      expiryDate: expiry || null,
    }),
    [itemCode, profile, lotNumber, expiry],
  );
  const added = useMemo(
    () => ({
      pallets: licensePlate.trim() ? 1 : 0,
      units: quantity,
      weight: profile?.weightPerUnit ? profile.weightPerUnit * quantity : 0,
      volume: profile?.volumePerUnit ? profile.volumePerUnit * quantity : 0,
    }),
    [licensePlate, quantity, profile],
  );

  const ready = itemCode.trim().length > 0 && quantity > 0;

  // Every legal destination for this item, ranked best-first. This is the pool of
  // "available spaces" the operator picks from — the putaway engine already vets
  // capacity, material rules, temperature, hazmat and area membership.
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

  // The engine's top picks, highlighted with a ★ in the list.
  const recommendedIds = useMemo(
    () => new Set(availableSpaces.slice(0, 3).map((s) => s.location.id)),
    [availableSpaces],
  );

  const occupancy = useMemo(
    () => buildOccupancyIndex(warehouseLocations, inventory, pallets, purposeById),
    [warehouseLocations, inventory, pallets, purposeById],
  );

  // Empty spaces only, grouped by section — the dropdown the operator picks from.
  // Restricted to spaces the putaway engine already deemed legal for this item.
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

  const SPACE_LIMIT = 90;
  const filteredSpaces = useMemo(() => {
    const query = spaceQuery.trim().toLowerCase();
    if (!query) return availableSpaces;
    return availableSpaces.filter((s) => s.location.code.toLowerCase().includes(query));
  }, [availableSpaces, spaceQuery]);
  const shownSpaces = filteredSpaces.slice(0, SPACE_LIMIT);

  const destLocation = destLocationId
    ? warehouseLocations.find((location) => location.id === destLocationId) ?? null
    : null;

  const validation: ValidationResult | null = useMemo(() => {
    if (!destLocation || !settings || !ready) return null;
    return validateMove({
      settings,
      destination: destLocation,
      destinationInventory: inventory.filter((r) => r.locationId === destLocation.id),
      destinationPalletCount: pallets.filter((p) => p.currentLocationId === destLocation.id).length,
      item,
      quantity,
      added,
      destinationHoldsStock: locationHoldsStock(destLocation, purposeById),
      destinationCounted: !outsideIds.has(destLocation.id),
    });
  }, [destLocation, settings, ready, inventory, pallets, item, quantity, added, purposeById, outsideIds]);

  function applyScan(override?: string) {
    const query = (override ?? scanQuery).trim();
    if (!query) return;
    const existingPallet = pallets.find((p) => p.licensePlate.toLowerCase() === query.toLowerCase());
    if (existingPallet) {
      setLicensePlate(existingPallet.licensePlate);
      setItemCode(existingPallet.itemCode);
      setItemName(existingPallet.itemName);
      return;
    }
    setItemCode(query);
    const found = materialByItem.get(query);
    if (found) {
      setItemName(found.itemName);
      if (found.unitsPerBox) setUnitsPerBox(found.unitsPerBox);
      if (found.defaultUom) setUom(found.defaultUom);
    }
  }

  /** Scanning a bin code jumps straight to it (selecting even if it's invalid,
   * so the validation panel can explain why). */
  function selectSpaceByCode(code: string) {
    const key = code.trim().toLowerCase();
    if (!key) return;
    const location = warehouseLocations.find((l) => l.code.toLowerCase() === key);
    if (location) {
      setDestLocationId(location.id);
      setSpaceQuery('');
    } else {
      toast.error('No space matched that code.');
    }
  }

  function reset() {
    setScanQuery('');
    setItemCode('');
    setItemName('');
    setLotNumber('');
    setExpiry('');
    setLicensePlate('');
    setBoxCount(1);
    setUnitsPerBox('');
    setSpaceQuery('');
    setDestLocationId(null);
  }

  async function confirm() {
    if (!destLocationId || !validation?.ok) return;
    setBusy(true);
    try {
      await wmsStore.receiveStock({
        destLocationId,
        itemCode: itemCode.trim(),
        itemName: itemName.trim(),
        lotNumber: lotNumber.trim(),
        expiryDate: expiry || null,
        uom,
        quantity,
        boxCount,
        unitsPerBox: typeof unitsPerBox === 'number' ? unitsPerBox : null,
        weight: added.weight || null,
        volume: added.volume || null,
        licensePlate: licensePlate.trim() || undefined,
      });
      notifyOk(`Received ${quantity} ${uom} into ${destLocation?.code}.`);
      const plate = licensePlate.trim();
      setLastPalletLabel(
        plate
          ? { code: plate, title: plate, heading: 'PALLET', subtitle: itemName.trim() || itemCode.trim() }
          : null,
      );
      reset();
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Receive failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6 text-sm text-muted-foreground">
        Design a warehouse first, then receive stock into it.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receive &amp; Put Away</h1>
          <p className="text-sm text-muted-foreground">
            Scan stock onto a pallet, then put it in the right block.
          </p>
        </div>
        {warehouses.length > 1 ? (
          <NativeSelect
            className="w-full sm:w-52"
            value={activeWarehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setDestLocationId(null);
              setSpaceQuery('');
            }}
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
      </div>

      {/* 1. Item / pallet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · What are you receiving?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={scanQuery}
              placeholder="Scan item code or pallet plate"
              onChange={(event) => setScanQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && applyScan()}
            />
            <WmsScanButton
              label="Scan"
              onScan={(code) => {
                setScanQuery(code);
                applyScan(code);
              }}
            />
            <Button variant="outline" onClick={() => applyScan()}>
              <ScanLine className="mr-2 h-4 w-4" /> Identify
            </Button>
          </div>

          {itemCode.trim() ? (
            recognized ? (
              /* Scan matched the catalog — show what we know, don't re-ask for it. */
              <div className="flex items-baseline justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{itemName || itemCode}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{itemCode}</span> · {uom}
                    {typeof unitsPerBox === 'number' && unitsPerBox > 0 ? ` · ${unitsPerBox}/box` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Code isn't in the catalog — fall back to manual identity entry. */
              <div className="space-y-3">
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Not in the item catalog — confirm the details below.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Item code">
                    <Input value={itemCode} onChange={(event) => setItemCode(event.target.value)} />
                  </Field>
                  <Field label="Item name">
                    <Input value={itemName} onChange={(event) => setItemName(event.target.value)} />
                  </Field>
                  <Field label="UoM">
                    <Input value={uom} onChange={(event) => setUom(event.target.value)} />
                  </Field>
                  <Field label="Units per box">
                    <Input
                      type="number"
                      min={1}
                      value={unitsPerBox}
                      placeholder="1"
                      onChange={(event) =>
                        setUnitsPerBox(event.target.value === '' ? '' : Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  </Field>
                </div>
              </div>
            )
          ) : null}

          {itemCode.trim() ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Boxes">
                <Input
                  type="number"
                  min={1}
                  value={boxCount}
                  onChange={(event) => setBoxCount(Math.max(1, Number(event.target.value) || 1))}
                />
              </Field>
              <Field label="Pallet plate (optional)">
                <div className="flex gap-2">
                  <Input
                    value={licensePlate}
                    placeholder="Leave blank for loose stock"
                    onChange={(event) => setLicensePlate(event.target.value)}
                  />
                  <WmsScanButton label="Scan" onScan={setLicensePlate} />
                </div>
              </Field>
              {showLot ? (
                <Field label="Lot">
                  <Input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
                </Field>
              ) : null}
              {showExpiry ? (
                <Field label="Expiry">
                  <Input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
                </Field>
              ) : null}
            </div>
          ) : null}

          {ready ? (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{quantity} {uom}</span>
              {licensePlate.trim() ? ' · 1 pallet' : ''}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. Putaway */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Choose a space</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              Identify the item above to see the spaces it can go into.
            </p>
          ) : (
            <>
              {/* Pick an empty space by section — no scanning needed. */}
              <div className="space-y-1.5">
                <Label htmlFor="empty-space-select">
                  Pick an empty location
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({totalEmpty} empty)
                  </span>
                </Label>
                <NativeSelect
                  id="empty-space-select"
                  value={destLocationId ?? ''}
                  onChange={(event) => setDestLocationId(event.target.value || null)}
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
                  No available spaces — every block is full, restricted for this item, or outside a
                  numbered area.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    {filteredSpaces.length} available space{filteredSpaces.length === 1 ? '' : 's'} ·
                    ★ = recommended
                  </p>
                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto rounded-md border p-2 sm:grid-cols-3">
                    {shownSpaces.map((space) => {
                      const selected = destLocationId === space.location.id;
                      const recommended = recommendedIds.has(space.location.id);
                      return (
                        <button
                          key={space.location.id}
                          type="button"
                          onClick={() => setDestLocationId(space.location.id)}
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
                      Showing the top {shownSpaces.length} of {filteredSpaces.length} — search to
                      narrow down.
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}

          {validation ? (
            <div className="space-y-2">
              {validation.errors.map((issue) => (
                <p key={issue.code} className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {issue.message}
                </p>
              ))}
              {validation.warnings.map((issue) => (
                <p key={issue.code} className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  {issue.message}
                </p>
              ))}
            </div>
          ) : null}

          <Button className="w-full" disabled={busy || !ready || !validation?.ok} onClick={() => void confirm()}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Receive into {destLocation?.code ?? 'location'}
          </Button>
        </CardContent>
      </Card>

      {/* Print the just-received pallet's QR label (TSC DA310, 100x40mm). */}
      {lastPalletLabel ? (
        <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm">
              Pallet <span className="font-mono font-semibold">{lastPalletLabel.title}</span> received.
              Print its QR label to put on the pallet.
            </div>
            <div className="flex items-center gap-2">
              <WmsPrintLabelButton labels={[lastPalletLabel]} label="Print pallet label" />
              <Button variant="ghost" size="sm" onClick={() => setLastPalletLabel(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
