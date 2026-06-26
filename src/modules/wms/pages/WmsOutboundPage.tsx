/**
 * Take a pallet out (Step 8).
 *
 * Scan a pallet plate, or scan a location and pick a pallet from it. The
 * mandatory audit screen then appears (item name + box count prominent) and the
 * pallet can only leave once the operator confirms a match or logs a corrected
 * box count. On confirm the store removes the stock, marks the pallet SHIPPED,
 * and writes the OUTBOUND (and any ADJUSTMENT) movement; the map refreshes.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, ScanLine, Truck } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { PalletAuditDialog, type AuditResult } from '../components/PalletAuditDialog';
import { useWmsCollection, useWmsEnabled, useWmsSettings, wmsStore } from '../store';
import type { Pallet } from '../types';

export default function WmsOutboundPage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { data: locations } = useWmsCollection('locations');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: movements } = useWmsCollection('movements');

  const [scanQuery, setScanQuery] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const palletsAtLocation = useMemo(
    () => pallets.filter((p) => p.currentLocationId === locationId && p.status !== 'SHIPPED'),
    [pallets, locationId],
  );

  function unitsOf(pallet: Pallet) {
    return inventory.filter((r) => r.palletId === pallet.id).reduce((s, r) => s + (r.quantity || 0), 0);
  }

  function resolveScan() {
    const query = scanQuery.trim().toLowerCase();
    if (!query) return;
    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === query && p.status !== 'SHIPPED');
    if (pallet) {
      openAudit(pallet);
      return;
    }
    const location = locations.find((l) => l.code.toLowerCase() === query);
    if (location) {
      setLocationId(location.id);
      return;
    }
    toast.error('No active pallet or location matched that code.');
  }

  function openAudit(pallet: Pallet) {
    setSelectedPallet(pallet);
    setAuditOpen(true);
  }

  async function handleConfirm(result: AuditResult) {
    if (!selectedPallet) return;
    try {
      await wmsStore.shipPallet({
        palletId: selectedPallet.id,
        correctedBoxCount: result.correctedBoxCount,
        supervisorApproved: result.supervisorApproved,
      });
      toast.success(`Pallet ${selectedPallet.licensePlate} shipped.`);
      setAuditOpen(false);
      setSelectedPallet(null);
      setScanQuery('');
      setLocationId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ship failed.');
    }
  }

  const recentOutbound = useMemo(
    () =>
      [...movements]
        .filter((entry) => entry.type === 'OUTBOUND')
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
        <h1 className="text-2xl font-semibold tracking-tight">Take Pallet Out</h1>
        <p className="text-sm text-muted-foreground">
          Scan a pallet or location. Every pallet is audited before it leaves.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find pallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={scanQuery}
              placeholder="Scan pallet plate or location"
              onChange={(event) => setScanQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && resolveScan()}
            />
            <Button variant="outline" onClick={resolveScan}>
              <ScanLine className="mr-2 h-4 w-4" /> Find
            </Button>
          </div>

          {locationId ? (
            palletsAtLocation.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No pallets at this location.
              </p>
            ) : (
              <div className="space-y-2">
                {palletsAtLocation.map((pallet) => (
                  <button
                    key={pallet.id}
                    type="button"
                    onClick={() => openAudit(pallet)}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{pallet.itemName || pallet.itemCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {pallet.licensePlate} · {pallet.boxCount} boxes
                      </p>
                    </div>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      {recentOutbound.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent shipments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentOutbound.map((entry) => {
              const from = locations.find((l) => l.id === entry.fromLocationId)?.code ?? '—';
              return (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <span>{entry.itemName || entry.itemCode || 'Pallet'}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-mono">{from}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>out</span>
                    {entry.discrepancy ? <span className="text-amber-600">· adjusted</span> : null}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <PalletAuditDialog
        open={auditOpen}
        onOpenChange={(open) => {
          setAuditOpen(open);
          if (!open) setSelectedPallet(null);
        }}
        pallet={selectedPallet}
        location={selectedPallet ? locations.find((l) => l.id === selectedPallet.currentLocationId) ?? null : null}
        totalUnits={selectedPallet ? unitsOf(selectedPallet) : 0}
        mandatory={settings?.mandatoryOutboundAudit ?? true}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
