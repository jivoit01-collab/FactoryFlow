/**
 * Take a pallet out (Step 8).
 *
 * Scan a pallet plate, or scan a location and pick a pallet from it. The
 * mandatory audit screen then appears (item name + box count prominent) and the
 * pallet can only leave once the operator confirms a match or logs a corrected
 * box count. On confirm the store removes the stock, marks the pallet SHIPPED,
 * and writes the OUTBOUND (and any ADJUSTMENT) movement; the map refreshes.
 */
import { ArrowRight, ScanLine, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import { type AuditResult,PalletAuditDialog } from '../components/PalletAuditDialog';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import type { WmsLabelData } from '../components/WmsPrintLabel';
import { WmsPrintLabelButton } from '../components/WmsPrintLabelButton';
import { WmsScanButton } from '../components/WmsScanButton';
import { palletsLocatedAt } from '../services';
import { useWmsCollection, useWmsEnabled, useWmsRole, useWmsSettings, wmsStore } from '../store';
import type { Pallet } from '../types';
import { notifyFail, notifyOk } from '../utils';

function palletLabel(pallet: Pallet, heading: string): WmsLabelData {
  return {
    code: pallet.licensePlate,
    title: pallet.licensePlate,
    heading,
    subtitle: pallet.itemName || pallet.itemCode,
  };
}

export default function WmsOutboundPage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { isAdmin } = useWmsRole();
  const { data: locations } = useWmsCollection('locations');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: movements } = useWmsCollection('movements');

  const [scanQuery, setScanQuery] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [lastShippedLabel, setLastShippedLabel] = useState<WmsLabelData | null>(null);

  const palletsAtLocation = useMemo(
    () =>
      locationId
        ? palletsLocatedAt(locationId, pallets, inventory).filter((p) => p.status !== 'SHIPPED')
        : [],
    [pallets, inventory, locationId],
  );

  function unitsOf(pallet: Pallet) {
    return inventory.filter((r) => r.palletId === pallet.id).reduce((s, r) => s + (r.quantity || 0), 0);
  }

  function resolveScan(override?: string) {
    const query = (override ?? scanQuery).trim().toLowerCase();
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
      notifyOk(`Pallet ${selectedPallet.licensePlate} shipped.`);
      setLastShippedLabel(palletLabel(selectedPallet, 'SHIPPED'));
      setAuditOpen(false);
      setSelectedPallet(null);
      setScanQuery('');
      setLocationId(null);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Ship failed.');
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
            <WmsScanButton
              label="Scan"
              onScan={(code) => {
                setScanQuery(code);
                resolveScan(code);
              }}
            />
            <Button variant="outline" onClick={() => resolveScan()}>
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
                <div className="flex justify-end">
                  <WmsPrintLabelButton
                    label={`Print ${palletsAtLocation.length} label${palletsAtLocation.length > 1 ? 's' : ''}`}
                    labels={palletsAtLocation.map((pallet) => palletLabel(pallet, 'PALLET'))}
                  />
                </div>
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

      {lastShippedLabel ? (
        <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm">
              Pallet <span className="font-mono font-semibold">{lastShippedLabel.title}</span> shipped.
              Print a SHIPPED label for the gate/manifest.
            </div>
            <div className="flex items-center gap-2">
              <WmsPrintLabelButton labels={[lastShippedLabel]} label="Print shipped label" />
              <Button variant="ghost" size="sm" onClick={() => setLastShippedLabel(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
        canApprove={isAdmin}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
