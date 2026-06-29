/**
 * Directed picking (Step 8).
 *
 * Load a pick line (item + quantity), and the system allocates it across stock
 * in the configured strategy order (FIFO / LIFO / FEFO) and directs the operator
 * location-by-location. Each stop is confirmed by scanning the location and the
 * item, then entering the quantity. When a stop consumes a whole pallet, the
 * mandatory outbound audit is applied before it leaves.
 */
import { useMemo, useState } from 'react';
import { CheckCircle2, MapPin, ScanLine } from 'lucide-react';
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
import { PalletAuditDialog, type AuditResult } from '../components/PalletAuditDialog';
import { useWmsCollection, useWmsEnabled, useWmsRole, useWmsSettings, wmsStore } from '../store';
import { planPicks } from '../services';
import type { PickAllocation, PickPlan } from '../services';
import { notifyFail, notifyOk } from '../utils';

export default function WmsPickPage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { isAdmin } = useWmsRole();
  const { data: locations } = useWmsCollection('locations');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');

  const [orderRef, setOrderRef] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [plan, setPlan] = useState<PickPlan | null>(null);
  const [index, setIndex] = useState(0);

  const [locScan, setLocScan] = useState('');
  const [itemScan, setItemScan] = useState('');
  const [pickQty, setPickQty] = useState(1);
  const [auditOpen, setAuditOpen] = useState(false);

  const strategy = settings?.pickStrategy ?? 'FEFO';
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  function startPlan() {
    if (!itemCode.trim() || quantity <= 0) return;
    const next = planPicks({ itemCode: itemCode.trim(), quantity, inventory, strategy });
    if (next.allocations.length === 0) {
      toast.error('No stock found for that item.');
      return;
    }
    setPlan(next);
    setIndex(0);
    resetStop(next.allocations[0]!);
    if (next.shortBy > 0) toast.warning(`Only ${quantity - next.shortBy} available; short by ${next.shortBy}.`);
  }

  function resetStop(allocation: PickAllocation) {
    setLocScan('');
    setItemScan('');
    setPickQty(allocation.quantity);
  }

  const current = plan?.allocations[index] ?? null;
  const currentLocation = current ? locationById.get(current.locationId) ?? null : null;
  const isFullPallet = Boolean(current && current.palletId && current.quantity >= current.available);

  const locOk = Boolean(current && currentLocation && locScan.trim().toLowerCase() === currentLocation.code.toLowerCase());
  const itemOk = Boolean(current && itemScan.trim().toLowerCase() === current.itemCode.toLowerCase());
  const qtyOk = current ? pickQty > 0 && pickQty <= current.available : false;
  const canConfirm = locOk && itemOk && qtyOk;

  function advance() {
    if (!plan) return;
    const nextIndex = index + 1;
    if (nextIndex >= plan.allocations.length) {
      notifyOk('Pick complete.');
      setPlan(null);
      setIndex(0);
      setItemCode('');
      setQuantity(1);
      return;
    }
    setIndex(nextIndex);
    resetStop(plan.allocations[nextIndex]!);
  }

  async function confirmPick() {
    if (!current || !canConfirm) return;
    if (isFullPallet && current.palletId) {
      setAuditOpen(true);
      return;
    }
    try {
      await wmsStore.pickInventory({ sourceId: current.inventoryId, quantity: pickQty, note: orderRef ? `Order ${orderRef}` : undefined });
      advance();
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Pick failed.');
    }
  }

  async function confirmPalletAudit(result: AuditResult) {
    if (!current?.palletId) return;
    try {
      await wmsStore.shipPallet({
        palletId: current.palletId,
        correctedBoxCount: result.correctedBoxCount,
        supervisorApproved: result.supervisorApproved,
        note: orderRef ? `Picked for order ${orderRef}` : 'Picked (full pallet)',
      });
      setAuditOpen(false);
      advance();
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Pick failed.');
    }
  }

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
        <h1 className="text-2xl font-semibold tracking-tight">Pick</h1>
        <p className="text-sm text-muted-foreground">
          Directed by {strategy}. Scan each location and item to confirm.
        </p>
      </div>

      {!plan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="order-ref">Order (optional)</Label>
                <Input id="order-ref" value={orderRef} onChange={(event) => setOrderRef(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pick-item">Item code</Label>
                <Input id="pick-item" value={itemCode} onChange={(event) => setItemCode(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pick-qty">Quantity</Label>
                <Input
                  id="pick-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
            </div>
            <Button onClick={startPlan} disabled={!itemCode.trim()}>
              Plan picks
            </Button>
          </CardContent>
        </Card>
      ) : current ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Stop {index + 1} of {plan.allocations.length}
            </CardTitle>
            <Badge variant="outline">{strategy}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                {currentLocation?.code ?? '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick <span className="font-medium text-foreground">{current.quantity}</span> of{' '}
                {current.itemName || current.itemCode}
                {current.lotNumber ? ` · lot ${current.lotNumber}` : ''}
                {current.expiryDate ? ` · exp ${current.expiryDate.slice(0, 10)}` : ''}
                {isFullPallet ? ' · whole pallet (audit required)' : ''}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-loc">Scan location</Label>
              <div className="flex gap-2">
                <Input
                  id="confirm-loc"
                  value={locScan}
                  placeholder={currentLocation?.code}
                  onChange={(event) => setLocScan(event.target.value)}
                />
                <WmsScanButton label="Scan" onScan={setLocScan} />
              </div>
              {locScan && !locOk ? <p className="text-xs text-destructive">Doesn’t match {currentLocation?.code}.</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-item">Scan item</Label>
              <div className="flex gap-2">
                <Input
                  id="confirm-item"
                  value={itemScan}
                  placeholder={current.itemCode}
                  onChange={(event) => setItemScan(event.target.value)}
                />
                <WmsScanButton label="Scan" onScan={setItemScan} />
              </div>
              {itemScan && !itemOk ? <p className="text-xs text-destructive">Doesn’t match {current.itemCode}.</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-qty">Quantity</Label>
              <Input
                id="confirm-qty"
                type="number"
                min={1}
                value={pickQty}
                onChange={(event) => setPickQty(Math.max(1, Number(event.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">Available here: {current.available}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPlan(null)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!canConfirm} onClick={() => void confirmPick()}>
                <ScanLine className="mr-2 h-4 w-4" />
                {isFullPallet ? 'Audit & pick pallet' : 'Confirm pick'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-emerald-600">
            <CheckCircle2 className="h-5 w-5" /> Pick complete.
          </CardContent>
        </Card>
      )}

      <PalletAuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        pallet={current?.palletId ? pallets.find((p) => p.id === current.palletId) ?? null : null}
        location={currentLocation}
        totalUnits={current?.available ?? 0}
        mandatory={settings?.mandatoryOutboundAudit ?? true}
        canApprove={isAdmin}
        onConfirm={confirmPalletAudit}
      />
    </div>
  );
}
