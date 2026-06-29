/**
 * Barcode transfer / move flow (Step 6).
 *
 * The operator scans (or types) a source — a location, item, or pallet — picks
 * what to move and the quantity, then scans the destination. The shared
 * validation engine checks the move and shows specific errors/warnings; on
 * confirm the store decrements the source, increments the destination, updates
 * any pallet's location, and writes a TRANSFER to the movement log. Handheld
 * scanners type into the focused field and submit on Enter.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, PackageSearch, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { WmsScanButton } from '../components/WmsScanButton';
import { useWmsCollection, useWmsEnabled, useWmsSettings, wmsStore } from '../store';
import { validateMove } from '../services';
import type { MoveItem, ValidationResult } from '../services';
import { notifyFail, notifyOk } from '../utils';
import type {
  InventoryRecord,
  MaterialWarehouseProfile,
  Pallet,
  WarehouseLocation,
} from '../types';

type Subject =
  | { kind: 'inventory'; record: InventoryRecord }
  | { kind: 'pallet'; pallet: Pallet };

export default function WmsTransferPage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { data: locations } = useWmsCollection('locations');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: materials } = useWmsCollection('materials');
  const { data: movements } = useWmsCollection('movements');

  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [destQuery, setDestQuery] = useState('');
  const [destLocationId, setDestLocationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const locationByCode = useMemo(() => {
    const map = new Map<string, WarehouseLocation>();
    for (const location of locations) map.set(location.code.toLowerCase(), location);
    return map;
  }, [locations]);
  const materialByItem = useMemo(() => {
    const map = new Map<string, MaterialWarehouseProfile>();
    for (const material of materials) map.set(material.itemCode, material);
    return map;
  }, [materials]);

  const sourceLocation = sourceLocationId ? locations.find((l) => l.id === sourceLocationId) ?? null : null;
  const destLocation = destLocationId ? locations.find((l) => l.id === destLocationId) ?? null : null;
  const sourceInventory = useMemo(
    () => inventory.filter((record) => record.locationId === sourceLocationId),
    [inventory, sourceLocationId],
  );
  const sourcePallets = useMemo(
    () => pallets.filter((pallet) => pallet.currentLocationId === sourceLocationId),
    [pallets, sourceLocationId],
  );

  function resolveSource(override?: string) {
    const query = (override ?? sourceQuery).trim().toLowerCase();
    if (!query) return;
    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === query);
    if (pallet?.currentLocationId) {
      setSourceLocationId(pallet.currentLocationId);
      setSubject({ kind: 'pallet', pallet });
      return;
    }
    const location = locationByCode.get(query);
    if (location) {
      setSourceLocationId(location.id);
      setSubject(null);
      return;
    }
    const record = inventory.find((r) => r.itemCode.toLowerCase() === query);
    if (record) {
      setSourceLocationId(record.locationId);
      setSubject(null);
      return;
    }
    toast.error('No location, pallet, or item matched that code.');
  }

  function resolveDestination(override?: string) {
    const location = locationByCode.get((override ?? destQuery).trim().toLowerCase());
    if (location) setDestLocationId(location.id);
    else toast.error('No destination location matched that code.');
  }

  function selectInventory(record: InventoryRecord) {
    setSubject({ kind: 'inventory', record });
    setQuantity(record.quantity);
  }

  // Build the validation input from the current selection.
  const validation: ValidationResult | null = useMemo(() => {
    if (!subject || !destLocation || !settings) return null;

    const profileFor = (itemCode: string) => materialByItem.get(itemCode);
    const destinationInventory = inventory.filter((r) => r.locationId === destLocation.id);
    const destinationPalletCount = pallets.filter((p) => p.currentLocationId === destLocation.id).length;

    let item: MoveItem;
    let added = { pallets: 0, units: 0, weight: 0, volume: 0 };
    let qty: number;
    let source;

    if (subject.kind === 'inventory') {
      const record = subject.record;
      const profile = profileFor(record.itemCode);
      qty = quantity;
      const proportion = record.quantity > 0 ? quantity / record.quantity : 1;
      item = {
        itemCode: record.itemCode,
        materialType: profile?.materialType ?? '',
        temperatureClass: profile?.temperatureClass ?? null,
        hazmatClass: profile?.hazmatClass ?? '',
        lotNumber: record.lotNumber,
        serialNumber: record.serialNumber,
        expiryDate: record.expiryDate,
      };
      added = {
        pallets: 0,
        units: quantity,
        weight: record.weight != null ? record.weight * proportion : 0,
        volume: record.volume != null ? record.volume * proportion : 0,
      };
      source = {
        location: sourceLocation!,
        availableQuantity: record.quantity,
        lotExists: true,
        serialExists: true,
      };
    } else {
      const pallet = subject.pallet;
      const profile = profileFor(pallet.itemCode);
      qty = pallet.totalUnits ?? 1;
      item = {
        itemCode: pallet.itemCode,
        materialType: profile?.materialType ?? '',
        temperatureClass: profile?.temperatureClass ?? null,
        hazmatClass: profile?.hazmatClass ?? '',
        lotNumber: pallet.lotNumber,
        serialNumber: '',
        expiryDate: pallet.expiryDate,
      };
      added = { pallets: 1, units: pallet.totalUnits ?? 0, weight: 0, volume: 0 };
      source = sourceLocation
        ? { location: sourceLocation, availableQuantity: qty, lotExists: true, serialExists: true }
        : undefined;
    }

    return validateMove({
      settings,
      destination: destLocation,
      destinationInventory,
      destinationPalletCount,
      item,
      quantity: qty,
      added,
      source,
    });
  }, [subject, destLocation, settings, quantity, inventory, pallets, materialByItem, sourceLocation]);

  async function confirm() {
    if (!subject || !destLocationId || !validation?.ok) return;
    setBusy(true);
    try {
      if (subject.kind === 'inventory') {
        await wmsStore.moveInventory({ sourceId: subject.record.id, toLocationId: destLocationId, quantity });
      } else {
        await wmsStore.movePallet({ palletId: subject.pallet.id, toLocationId: destLocationId });
      }
      notifyOk('Move completed.');
      setSubject(null);
      setDestQuery('');
      setDestLocationId(null);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Move failed.');
    } finally {
      setBusy(false);
    }
  }

  const recentTransfers = useMemo(
    () =>
      [...movements]
        .filter((entry) => entry.type === 'TRANSFER')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5),
    [movements],
  );

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfer / Move</h1>
        <p className="text-sm text-muted-foreground">
          Scan a source, choose what to move, then scan the destination.
        </p>
      </div>

      {/* 1. Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={sourceQuery}
              placeholder="Scan location, item, or pallet"
              onChange={(event) => setSourceQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && resolveSource()}
            />
            <WmsScanButton
              label="Scan"
              onScan={(code) => {
                setSourceQuery(code);
                resolveSource(code);
              }}
            />
            <Button variant="outline" onClick={() => resolveSource()}>
              <ScanLine className="mr-2 h-4 w-4" /> Find
            </Button>
          </div>

          {sourceLocation ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                At <span className="font-mono font-medium text-foreground">{sourceLocation.code}</span>
              </p>
              {sourceInventory.length === 0 && sourcePallets.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No stock here. Receiving &amp; putaway (Step 7) add inventory.
                </p>
              ) : (
                <div className="space-y-2">
                  {sourcePallets.map((pallet) => (
                    <SubjectRow
                      key={pallet.id}
                      title={`Pallet ${pallet.licensePlate}`}
                      subtitle={`${pallet.itemName || pallet.itemCode} · ${pallet.boxCount} boxes`}
                      selected={subject?.kind === 'pallet' && subject.pallet.id === pallet.id}
                      onSelect={() => setSubject({ kind: 'pallet', pallet })}
                    />
                  ))}
                  {sourceInventory.map((record) => (
                    <SubjectRow
                      key={record.id}
                      title={record.itemName || record.itemCode}
                      subtitle={`${record.quantity} ${record.uom}${record.lotNumber ? ` · lot ${record.lotNumber}` : ''}`}
                      selected={subject?.kind === 'inventory' && subject.record.id === record.id}
                      onSelect={() => selectInventory(record)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackageSearch className="h-4 w-4" /> Find a source to see its stock.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Move */}
      {subject ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Move</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subject.kind === 'inventory' ? (
              <div className="space-y-1.5">
                <Label htmlFor="move-qty">Quantity</Label>
                <Input
                  id="move-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {subject.record.quantity} {subject.record.uom}
                </p>
              </div>
            ) : (
              <p className="text-sm">
                Moving whole pallet <span className="font-mono">{subject.pallet.licensePlate}</span>.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                value={destQuery}
                placeholder="Scan destination location"
                onChange={(event) => setDestQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && resolveDestination()}
              />
              <WmsScanButton
                label="Scan"
                onScan={(code) => {
                  setDestQuery(code);
                  resolveDestination(code);
                }}
              />
              <Button variant="outline" onClick={() => resolveDestination()}>
                <ScanLine className="mr-2 h-4 w-4" /> Find
              </Button>
            </div>

            {destLocation ? (
              <p className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                Destination <span className="font-mono font-medium">{destLocation.code}</span>
              </p>
            ) : null}

            {/* Validation result */}
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
                {validation.ok && validation.warnings.length === 0 ? (
                  <p className="text-sm text-emerald-600">Move is valid.</p>
                ) : null}
              </div>
            ) : null}

            <Button className="w-full" disabled={busy || !validation?.ok || !destLocation} onClick={() => void confirm()}>
              Confirm move
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent transfers */}
      {recentTransfers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentTransfers.map((entry) => {
              const from = locations.find((l) => l.id === entry.fromLocationId)?.code ?? '—';
              const to = locations.find((l) => l.id === entry.toLocationId)?.code ?? '—';
              return (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <span>{entry.itemName || entry.itemCode || (entry.palletId ? 'Pallet' : 'Move')}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-mono">{from}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-mono">{to}</span>
                    {entry.quantity ? <Badge variant="outline">{entry.quantity}</Badge> : null}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SubjectRow({
  title,
  subtitle,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-muted/50'
      }`}
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {selected ? <Badge>Selected</Badge> : null}
    </button>
  );
}
