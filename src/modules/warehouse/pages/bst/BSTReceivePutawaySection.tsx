/**
 * "Put away received pallets" — the WMS bridge shown on the BST receive page.
 *
 * Groups the transfer's ACCEPTED box scans by pallet and lets the operator drop
 * each received pallet into a Warehouse Ops bin (see BSTPalletPutawayDialog). It
 * is mounted only when the WMS master flag is on (its parent wraps it in
 * WmsEnabledGate), so the WMS collections load only for companies that use it.
 *
 * Placement status is read back from the WMS `pallets` collection (by plate), so
 * it survives reloads without persisting anything on the BST side.
 */
import { MapPin, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAppSelector } from '@/core/store';
import { useWmsCollection } from '@/modules/wms/store';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import type { BSTTransferDetail } from '../../types';
import { BSTPalletPutawayDialog } from './BSTPalletPutawayDialog';
import { type BstReceivedPallet, groupAcceptedPallets } from './bstReceivePallets';

export function BSTReceivePutawaySection({ transfer }: { transfer: BSTTransferDetail }) {
  const currentCompany = useAppSelector((state) => state.auth.currentCompany);
  const { data: wmsPallets, loading: palletsLoading } = useWmsCollection('pallets');
  const { data: locations, loading: locationsLoading } = useWmsCollection('locations');

  // Until BOTH collections have loaded, `placedByPlate` is empty and every pallet
  // would fall through to "Assign location" — falsely showing already-placed
  // pallets as needing putaway. Hold the placement column until the reads resolve.
  const wmsLoading = palletsLoading || locationsLoading;

  const [putawayPallet, setPutawayPallet] = useState<BstReceivedPallet | null>(null);

  const receivedPallets = useMemo(
    () => groupAcceptedPallets(transfer.box_scans),
    [transfer.box_scans],
  );

  // Where each plate currently sits in WMS — durable status across reloads.
  const placedByPlate = useMemo(() => {
    const codeByLocation = new Map(locations.map((l) => [l.id, l.code]));
    const map = new Map<string, string>();
    for (const pallet of wmsPallets) {
      if (!pallet.currentLocationId || pallet.status === 'SHIPPED') continue;
      const code = codeByLocation.get(pallet.currentLocationId);
      if (code) map.set(pallet.licensePlate.trim().toLowerCase(), code);
    }
    return map;
  }, [wmsPallets, locations]);

  // WMS data is scoped to the ACTIVE company. For an invoice (cross-company) BST
  // the receiving company differs from the sender, so putaway must happen while
  // the destination company is active — otherwise we'd write to the wrong tenant.
  const receivingCompanyCode =
    transfer.source_type === 'INVOICE' ? transfer.destination_company_code : transfer.company_code;
  const receivingCompanyName =
    transfer.source_type === 'INVOICE' ? transfer.destination_company_name : transfer.company_name;
  const companyMismatch = Boolean(
    receivingCompanyCode &&
      currentCompany?.company_code &&
      receivingCompanyCode.trim().toLowerCase() !== currentCompany.company_code.trim().toLowerCase(),
  );

  if (receivedPallets.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium">Put away received pallets</p>
        </div>

        {companyMismatch ? (
          <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Switch to{' '}
            <span className="font-medium">{receivingCompanyName || receivingCompanyCode}</span> to
            assign Warehouse Ops locations for this transfer.
          </p>
        ) : null}

        <div className="space-y-1">
          {receivedPallets.map((pallet) => {
            const placedCode = placedByPlate.get(pallet.palletCode.trim().toLowerCase());
            return (
              <div
                key={pallet.palletCode}
                className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <span className="font-mono">{pallet.palletCode}</span>{' '}
                    <span className="text-muted-foreground">· {pallet.itemName || pallet.itemCode}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pallet.boxCount} box{pallet.boxCount === 1 ? '' : 'es'} · {pallet.quantity}{' '}
                    {pallet.uom}
                  </p>
                </div>
                {placedCode ? (
                  <Badge variant="outline" className="shrink-0 text-emerald-700">
                    <MapPin className="mr-1 h-3 w-3" /> {placedCode}
                  </Badge>
                ) : wmsLoading ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Checking location…</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    disabled={companyMismatch}
                    onClick={() => setPutawayPallet(pallet)}
                  >
                    <MapPin className="mr-1 h-3 w-3" /> Assign location
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <BSTPalletPutawayDialog
        open={putawayPallet !== null}
        onOpenChange={(next) => !next && setPutawayPallet(null)}
        pallet={putawayPallet}
        transfer={transfer}
        onPlaced={() => setPutawayPallet(null)}
      />
    </Card>
  );
}
