/**
 * Removed Pallets — the recovery view for pallets pulled off the map via the
 * "bin is physically empty" cleanup. They are kept (status `REMOVED`, unplaced)
 * rather than hard-deleted, so a mistaken removal is recoverable.
 *
 * Clearing reuses the barcode module as the source of truth (same ACTIVE /
 * DISPATCHED / VOID logic as pallets & boxes): a removed pallet that has since
 * been dispatched or voided in barcode is truly gone, so it is purged here and
 * drops off the list. The rest — removed from the map but still live in barcode —
 * remain, with a Restore action to put them back.
 */
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, PackageX, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { barcodeApi } from '@/modules/barcode/api';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { useWmsCollection, useWmsEnabled, wmsStore } from '../store';
import { notifyFail, notifyOk } from '../utils';

/** Barcode statuses that mean the pallet has left the system for good. */
const TERMINAL_BARCODE_STATUSES = new Set(['DISPATCHED', 'VOID']);

function formatWhen(iso: string): string {
  if (!iso) return '';
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

export default function WmsRemovedPalletsPage() {
  const enabled = useWmsEnabled();
  const navigate = useNavigate();
  const { data: pallets } = useWmsCollection('pallets');

  const removed = useMemo(
    () =>
      pallets
        .filter((p) => p.status === 'REMOVED')
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    [pallets],
  );
  const plates = useMemo(() => removed.map((p) => p.licensePlate), [removed]);

  // Look up each removed plate's live status in the barcode module (source of
  // truth). Keyed on the plate set so it refetches when the list changes.
  const { data: barcodeStatusByPlate } = useQuery({
    queryKey: ['wms', 'removed-pallets', 'barcode-status', plates],
    enabled: plates.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        plates.map(async (plate) => {
          try {
            const matches = await barcodeApi.getPallets({ search: plate });
            const exact = matches.find((m) => m.pallet_id.toLowerCase() === plate.toLowerCase());
            return [plate, exact?.status ?? null] as const;
          } catch {
            return [plate, null] as const;
          }
        }),
      );
      return new Map(entries);
    },
  });

  // Reconcile: a removed pallet that is dispatched/voided in barcode is gone for
  // good -> purge the retained WMS record so it drops off the list.
  const purgedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!barcodeStatusByPlate) return;
    for (const pallet of removed) {
      const status = barcodeStatusByPlate.get(pallet.licensePlate);
      if (status && TERMINAL_BARCODE_STATUSES.has(status) && !purgedRef.current.has(pallet.id)) {
        purgedRef.current.add(pallet.id);
        void wmsStore.purgeRemovedPallet(pallet.id);
      }
    }
  }, [barcodeStatusByPlate, removed]);

  // Only show pallets that haven't been dispatched/voided yet.
  const visible = useMemo(
    () =>
      removed.filter((p) => {
        const status = barcodeStatusByPlate?.get(p.licensePlate);
        return !(status && TERMINAL_BARCODE_STATUSES.has(status));
      }),
    [removed, barcodeStatusByPlate],
  );

  async function purge(palletId: string, plate: string) {
    try {
      await wmsStore.purgeRemovedPallet(palletId);
      notifyOk(`Cleared ${plate}.`);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Could not clear the pallet.');
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
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Removed Pallets</h1>
        <p className="text-sm text-muted-foreground">
          Pallets pulled off the map (physical bin was empty). They stay here until they’re
          dispatched or voided in barcode — then they clear automatically. Restore one if it was
          removed by mistake.
        </p>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No removed pallets. Anything pulled off the map that hasn’t been dispatched will show
            here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((pallet) => {
            const barcodeStatus = barcodeStatusByPlate?.get(pallet.licensePlate);
            return (
              <Card key={pallet.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {pallet.itemName || pallet.itemCode}
                      </span>
                      {barcodeStatus ? (
                        <Badge variant="outline" className="text-[10px]">
                          barcode: {barcodeStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{pallet.licensePlate}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pallet.boxCount} box{pallet.boxCount === 1 ? '' : 'es'}
                      {pallet.totalUnits ? ` · ${pallet.totalUnits} units` : ''}
                      {pallet.updatedAt ? ` · removed ${formatWhen(pallet.updatedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/warehouse-ops/receive?plate=${encodeURIComponent(pallet.licensePlate)}`)
                      }
                    >
                      <ArrowRightLeft className="mr-1 h-3.5 w-3.5" /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      title="Clear from the system (won’t affect the barcode pallet)"
                      onClick={() => void purge(pallet.id, pallet.licensePlate)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageX className="h-3.5 w-3.5" /> Removing a pallet from the map never touches its
        barcode record — this is only Warehouse Ops placement.
      </p>
    </div>
  );
}
