/**
 * Receiving & putaway flow — pallet-first.
 *
 * The operator scans a PALLET plate; the system resolves the pallet from the
 * barcode module (item, quantity, boxes, lot, warehouse) and shows it as
 * read-only text — nothing is typed. Then they scan or pick the destination bin
 * and place it. On confirm the pallet is put away via the external-pallet bridge
 * (`syncExternalPalletPlacement`): a WMS Pallet + Inventory + PUTAWAY movement,
 * keyed by the plate.
 */
import { AlertTriangle, ArrowRightLeft, Loader2, PackagePlus, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { barcodeApi } from '@/modules/barcode/api';
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

import { PutawayBinPicker, type PutawaySelection } from '../components/PutawayBinPicker';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import type { WmsLabelData } from '../components/WmsPrintLabel';
import { WmsPrintLabelButton } from '../components/WmsPrintLabelButton';
import { WmsScanButton } from '../components/WmsScanButton';
import type { MoveItem } from '../services';
import { useWarehouses, useWmsCollection, useWmsEnabled } from '../store';
import { wmsStore } from '../store';
import type { MaterialWarehouseProfile } from '../types';
import { notifyFail, notifyOk } from '../utils';

/** A pallet resolved from a scanned plate (barcode-module lookup). */
interface ResolvedPallet {
  palletId: string;
  itemCode: string;
  itemName: string;
  batchNumber: string;
  boxCount: number;
  totalQty: number;
  uom: string;
  warehouseCode: string;
}

/** Extract the fields we need from the untyped lookup `entity_data`. */
function toResolvedPallet(data: Record<string, unknown>): ResolvedPallet {
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
  return {
    palletId: str(data.pallet_id),
    itemCode: str(data.item_code),
    itemName: str(data.item_name),
    batchNumber: str(data.batch_number),
    boxCount: num(data.box_count),
    totalQty: num(data.total_qty),
    uom: str(data.uom) || 'EA',
    warehouseCode: str(data.current_warehouse),
  };
}

export default function WmsReceivePage() {
  const enabled = useWmsEnabled();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { warehouses } = useWarehouses();
  const { data: materials } = useWmsCollection('materials');
  const { data: allPallets } = useWmsCollection('pallets');
  const { data: locations } = useWmsCollection('locations');

  const moveActor = useMemo(
    () => (user ? { id: String(user.id), name: user.full_name || user.email } : undefined),
    [user],
  );

  const [plateInput, setPlateInput] = useState('');
  const [pallet, setPallet] = useState<ResolvedPallet | null>(null);
  const [itemGroup, setItemGroup] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  // The plate whose item group is currently being fetched — guards against a
  // slow lookup landing after the operator has scanned a different pallet.
  const requestedPlateRef = useRef('');
  const [warehouseOverride, setWarehouseOverride] = useState<string | null>(null);
  const [selection, setSelection] = useState<PutawaySelection>({ location: null, validation: null });
  const [busy, setBusy] = useState(false);
  const [lastPalletLabel, setLastPalletLabel] = useState<WmsLabelData | null>(null);

  const materialByItem = useMemo(() => {
    const map = new Map<string, MaterialWarehouseProfile>();
    for (const material of materials) map.set(material.itemCode, material);
    return map;
  }, [materials]);
  const profile = pallet ? materialByItem.get(pallet.itemCode) : undefined;
  // "Item type" = the item's SAP item group (looked up on scan); falls back to
  // the WMS material profile's type when the group isn't available.
  const itemType = itemGroup ?? profile?.materialType ?? '';

  // Total units to place — fall back to the box count when the pallet carries no
  // unit quantity, so the putaway engine still has a positive number to rank by.
  const quantity = pallet ? (pallet.totalQty > 0 ? pallet.totalQty : pallet.boxCount) : 0;

  // A pallet already placed in the WMS must not be "received" again -- receiving is
  // for pallets entering the warehouse. Relocating a placed pallet is a Transfer, so
  // we block the putaway and send the operator there instead (see below).
  const placedPallet = useMemo(() => {
    if (!pallet) return null;
    const plate = pallet.palletId.toLowerCase();
    const wp = allPallets.find((p) => p.licensePlate.toLowerCase() === plate);
    return wp?.currentLocationId ? wp : null;
  }, [pallet, allPallets]);
  const placedLocationCode = useMemo(
    () => (placedPallet ? locations.find((l) => l.id === placedPallet.currentLocationId)?.code ?? null : null),
    [placedPallet, locations],
  );

  function goToTransfer() {
    if (!pallet) return;
    // Pre-fills the Transfer source with this pallet (read from ?pallet= there).
    navigate(`/warehouse-ops/transfer?pallet=${encodeURIComponent(pallet.palletId)}`);
  }

  // The operator chooses which warehouse to receive INTO. We deliberately do NOT
  // infer it from the pallet's current (source) warehouse: a pallet finished on
  // the production floor is received into a separate storage warehouse, so the
  // source code is shown only as "From" info, never used to pick the destination.
  const warehouseId = warehouseOverride || warehouses[0]?.id || '';

  const item: MoveItem = useMemo(
    () => ({
      itemCode: pallet?.itemCode ?? '',
      materialType: profile?.materialType ?? '',
      temperatureClass: profile?.temperatureClass ?? null,
      hazmatClass: profile?.hazmatClass ?? '',
      lotNumber: pallet?.batchNumber ?? '',
      serialNumber: '',
      expiryDate: null,
    }),
    [pallet, profile],
  );
  const added = useMemo(
    () => ({
      pallets: 1,
      units: quantity,
      weight: profile?.weightPerUnit ? profile.weightPerUnit * quantity : 0,
      volume: profile?.volumePerUnit ? profile.volumePerUnit * quantity : 0,
    }),
    [quantity, profile],
  );

  const resolvePallet = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    setResolving(true);
    try {
      const result = await barcodeApi.lookupBarcode(query);
      if (result.entity_type !== 'PALLET' || !result.entity_data) {
        toast.error(
          result.entity_type === 'BOX'
            ? 'That is a box barcode — scan the pallet.'
            : 'No pallet found for that barcode.',
        );
        return;
      }
      const resolved = toResolvedPallet(result.entity_data);
      requestedPlateRef.current = resolved.palletId;
      setPallet(resolved);
      setItemGroup(null);
      setSelection({ location: null, validation: null });
      setWarehouseOverride(null);
      setPlateInput('');
      // Best-effort: show the item's SAP item group as its "type".
      if (resolved.itemCode) {
        void barcodeApi.getOitmItemGroup(resolved.itemCode).then((group) => {
          if (requestedPlateRef.current !== resolved.palletId || !group) return;
          setItemGroup(
            group.item_group_name ||
              (group.item_group_code != null ? `Group ${group.item_group_code}` : null),
          );
        });
      }
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Could not look up that pallet.');
    } finally {
      setResolving(false);
    }
  }, []);

  // Deep-link from Removed Pallets ("Restore"): ?plate=<plate> auto-resolves the
  // pallet so the operator lands ready to pick where to put it back. Runs once.
  const [searchParams] = useSearchParams();
  const prefillPlate = searchParams.get('plate');
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || !prefillPlate) return;
    prefilledRef.current = true;
    void resolvePallet(prefillPlate);
  }, [prefillPlate, resolvePallet]);

  function clearPallet() {
    requestedPlateRef.current = '';
    setPallet(null);
    setItemGroup(null);
    setSelection({ location: null, validation: null });
    setWarehouseOverride(null);
    setPlateInput('');
  }

  async function place() {
    if (!pallet || !selection.location || !selection.validation?.ok) return;
    setBusy(true);
    try {
      await wmsStore.syncExternalPalletPlacement({
        licensePlate: pallet.palletId,
        toLocationId: selection.location.id,
        itemCode: pallet.itemCode,
        itemName: pallet.itemName,
        lotNumber: pallet.batchNumber,
        boxCount: pallet.boxCount,
        totalUnits: quantity,
        uom: pallet.uom,
        actor: moveActor,
        note: 'Warehouse Ops receive',
      });
      notifyOk(`Pallet ${pallet.palletId} placed in ${selection.location.code}.`);
      setLastPalletLabel({
        code: pallet.palletId,
        title: pallet.palletId,
        heading: 'PALLET',
        subtitle: pallet.itemName || pallet.itemCode,
      });
      clearPallet();
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receive &amp; Put Away</h1>
        <p className="text-sm text-muted-foreground">
          Scan a pallet, then scan where it goes — the rest is filled in for you.
        </p>
      </div>

      {/* 1. Pallet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Scan the pallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pallet ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={plateInput}
                placeholder="Scan or type a pallet plate"
                disabled={resolving}
                onChange={(event) => setPlateInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void resolvePallet(plateInput)}
              />
              <WmsScanButton label="Scan" onScan={(code) => void resolvePallet(code)} />
              <Button
                variant="outline"
                disabled={resolving || !plateInput.trim()}
                onClick={() => void resolvePallet(plateInput)}
              >
                {resolving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="mr-2 h-4 w-4" />
                )}
                Find
              </Button>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{pallet.itemName || pallet.itemCode}</p>
                  <p className="font-mono text-xs text-muted-foreground">{pallet.palletId}</p>
                </div>
                <button
                  type="button"
                  onClick={clearPallet}
                  className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Scan another
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <Info label="Item code" value={pallet.itemCode} mono />
                <Info label="Item type" value={itemType || '—'} />
                <Info label="Boxes" value={String(pallet.boxCount)} />
                <Info label="Quantity" value={`${quantity} ${pallet.uom}`} />
                {pallet.batchNumber ? <Info label="Lot" value={pallet.batchNumber} /> : null}
                {pallet.warehouseCode ? <Info label="From" value={pallet.warehouseCode} /> : null}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Location — or, if the pallet is already placed, block and offer Transfer. */}
      {pallet && placedPallet ? (
        <Card className="border-amber-400">
          <CardHeader>
            <CardTitle className="text-base">Already in the warehouse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                This pallet is already placed at{' '}
                <span className="font-mono font-semibold">{placedLocationCode ?? 'a location'}</span>.
                Receiving is only for pallets entering the warehouse — to move it, do a Transfer.
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={goToTransfer}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer this pallet instead
            </Button>
          </CardContent>
        </Card>
      ) : pallet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 · Scan the location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Always ask which warehouse to receive INTO -- shown even when there
                is a single warehouse (pre-selected) so the destination is always
                explicit. The page returns early above when none exist. */}
            <div className="space-y-1.5">
              <Label htmlFor="receive-warehouse">Warehouse</Label>
              <NativeSelect
                id="receive-warehouse"
                value={warehouseId}
                onChange={(event) => {
                  setWarehouseOverride(event.target.value);
                  setSelection({ location: null, validation: null });
                }}
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {warehouseId ? (
              <PutawayBinPicker
                warehouseId={warehouseId}
                item={item}
                quantity={quantity}
                added={added}
                selectedLocationId={selection.location?.id ?? null}
                onChange={setSelection}
              />
            ) : null}

            <Button
              className="w-full"
              disabled={busy || !selection.validation?.ok}
              onClick={() => void place()}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-2 h-4 w-4" />
              )}
              Place in {selection.location?.code ?? 'location'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Print the just-placed pallet's QR label (TSC DA310, 100x40mm). */}
      {lastPalletLabel ? (
        <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm">
              Pallet <span className="font-mono font-semibold">{lastPalletLabel.title}</span> placed.
              Print its QR label if the pallet needs one.
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

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono' : ''}>{value}</dd>
    </div>
  );
}
