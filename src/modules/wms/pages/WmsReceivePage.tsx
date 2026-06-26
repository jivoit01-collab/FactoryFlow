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
import { useMemo, useState } from 'react';
import { PackagePlus, ScanLine, Sparkles } from 'lucide-react';
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
import { useWarehouses, useWmsCollection, useWmsEnabled, useWmsSettings, wmsStore } from '../store';
import { suggestPutaway, validateMove } from '../services';
import type { MoveItem, PutawaySuggestion, ValidationResult } from '../services';
import { notifyFail, notifyOk } from '../utils';
import type { MaterialWarehouseProfile, WarehouseLocation } from '../types';

export default function WmsReceivePage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { warehouses } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
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
  const [destQuery, setDestQuery] = useState('');
  const [destLocationId, setDestLocationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeWarehouseId = warehouseId || warehouses[0]?.id || '';
  const putawayMode = settings?.putawayMode ?? 'HYBRID';

  const warehouseLocations = useMemo(
    () => locations.filter((location) => location.warehouseId === activeWarehouseId),
    [locations, activeWarehouseId],
  );
  const materialByItem = useMemo(() => {
    const map = new Map<string, MaterialWarehouseProfile>();
    for (const material of materials) map.set(material.itemCode, material);
    return map;
  }, [materials]);

  const quantity = boxCount * (typeof unitsPerBox === 'number' && unitsPerBox > 0 ? unitsPerBox : 1);
  const profile = materialByItem.get(itemCode);

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

  const suggestions: PutawaySuggestion[] = useMemo(() => {
    if (!ready || !settings || putawayMode === 'MANUAL') return [];
    return suggestPutaway({
      settings,
      item,
      quantity,
      added,
      locations: warehouseLocations,
      inventory,
      pallets,
      limit: 4,
    });
  }, [ready, settings, putawayMode, item, quantity, added, warehouseLocations, inventory, pallets]);

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
    });
  }, [destLocation, settings, ready, inventory, pallets, item, quantity, added]);

  function applyScan() {
    const query = scanQuery.trim();
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

  function pickSuggestion(location: WarehouseLocation) {
    setDestLocationId(location.id);
    setDestQuery(location.code);
  }

  function resolveDestination() {
    const location = warehouseLocations.find(
      (l) => l.code.toLowerCase() === destQuery.trim().toLowerCase(),
    );
    if (location) setDestLocationId(location.id);
    else toast.error('No destination location matched that code.');
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
    setDestQuery('');
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
            className="w-52"
            value={activeWarehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setDestLocationId(null);
              setDestQuery('');
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
            <Button variant="outline" onClick={applyScan}>
              <ScanLine className="mr-2 h-4 w-4" /> Identify
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Item code">
              <Input value={itemCode} onChange={(event) => setItemCode(event.target.value)} />
            </Field>
            <Field label="Item name">
              <Input value={itemName} onChange={(event) => setItemName(event.target.value)} />
            </Field>
            <Field label="Pallet plate (optional)">
              <Input
                value={licensePlate}
                placeholder="Leave blank for loose stock"
                onChange={(event) => setLicensePlate(event.target.value)}
              />
            </Field>
            <Field label="UoM">
              <Input value={uom} onChange={(event) => setUom(event.target.value)} />
            </Field>
            <Field label="Boxes">
              <Input
                type="number"
                min={1}
                value={boxCount}
                onChange={(event) => setBoxCount(Math.max(1, Number(event.target.value) || 1))}
              />
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
            <Field label="Lot (optional)">
              <Input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
            </Field>
            <Field label="Expiry (optional)">
              <Input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
            </Field>
          </div>

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
          <CardTitle className="text-base">2 · Put away</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {putawayMode !== 'MANUAL' && suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Suggested locations
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.location.id}
                    type="button"
                    onClick={() => pickSuggestion(suggestion.location)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition ${
                      destLocationId === suggestion.location.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-mono">{suggestion.location.code}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Math.round(suggestion.occupancyPct)}% full
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Input
              value={destQuery}
              placeholder="Scan destination location"
              onChange={(event) => setDestQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && resolveDestination()}
            />
            <Button variant="outline" onClick={resolveDestination}>
              <ScanLine className="mr-2 h-4 w-4" /> Find
            </Button>
          </div>

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
