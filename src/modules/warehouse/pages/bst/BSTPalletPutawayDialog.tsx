/**
 * Assign a Warehouse Ops (bin-level WMS) location to a pallet received on a BST.
 *
 * Bridges the BST receive flow into the WMS: it resolves the destination
 * warehouse (a stock transfer's `sap_to_warehouse`, or an operator pick for an
 * invoice), offers the same smart putaway picker as the WMS Receive page, and on
 * confirm places the pallet — creating a WMS Pallet + Inventory + PUTAWAY
 * movement via the external-pallet bridge (`syncExternalPalletPlacement`, keyed
 * by the pallet's license plate).
 */
import { Loader2, PackagePlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PutawayBinPicker, type PutawaySelection } from '@/modules/wms/components/PutawayBinPicker';
import type { MoveItem } from '@/modules/wms/services';
import { useWmsCollection, wmsStore } from '@/modules/wms/store';
import { Button, Label, NativeSelect } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { getErrorMessage } from '@/shared/utils';

import { bstApi } from '../../api';
import type { BSTTransferDetail } from '../../types';
import type { BstReceivedPallet } from './bstReceivePallets';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pallet: BstReceivedPallet | null;
  transfer: BSTTransferDetail;
  /** Called after a successful placement (parent can refresh / close). */
  onPlaced: () => void;
}

function sameCode(a?: string | null, b?: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

export function BSTPalletPutawayDialog({ open, onOpenChange, pallet, transfer, onPlaced }: Props) {
  const { data: warehouses } = useWmsCollection('warehouses');

  const ownWarehouses = useMemo(
    () => warehouses.filter((wh) => (wh.type ?? 'OWN') === 'OWN'),
    [warehouses],
  );

  // A stock transfer has a concrete destination warehouse (`sap_to_warehouse`);
  // an invoice does not (destination is a company), so the operator picks one.
  const preferredCode = useMemo(
    () =>
      transfer.source_type === 'STOCK_TRANSFER'
        ? transfer.sap_to_warehouse || pallet?.warehouseCode || ''
        : '',
    [transfer.source_type, transfer.sap_to_warehouse, pallet?.warehouseCode],
  );

  const defaultWarehouseId = useMemo(() => {
    const matched = preferredCode
      ? ownWarehouses.find((wh) => sameCode(wh.sapWarehouseCode, preferredCode))
      : null;
    return matched?.id ?? ownWarehouses[0]?.id ?? '';
  }, [ownWarehouses, preferredCode]);

  const [warehouseOverride, setWarehouseOverride] = useState<string | null>(null);
  const [selection, setSelection] = useState<PutawaySelection>({ location: null, validation: null });
  const [busy, setBusy] = useState(false);

  const warehouseId = warehouseOverride ?? defaultWarehouseId;

  // Fresh state whenever a different pallet is opened.
  useEffect(() => {
    setWarehouseOverride(null);
    setSelection({ location: null, validation: null });
    setBusy(false);
  }, [pallet?.palletCode, open]);

  const item: MoveItem = useMemo(
    () => ({
      itemCode: pallet?.itemCode ?? '',
      materialType: '',
      temperatureClass: null,
      hazmatClass: '',
      lotNumber: pallet?.batchNumber ?? '',
      serialNumber: '',
      expiryDate: null,
    }),
    [pallet],
  );
  const added = useMemo(
    () => ({ pallets: 1, units: pallet?.quantity ?? 0, weight: 0, volume: 0 }),
    [pallet],
  );

  async function confirm() {
    if (!pallet || !selection.location || !selection.validation?.ok) return;
    setBusy(true);
    try {
      await wmsStore.syncExternalPalletPlacement({
        licensePlate: pallet.palletCode,
        toLocationId: selection.location.id,
        itemCode: pallet.itemCode,
        itemName: pallet.itemName,
        lotNumber: pallet.batchNumber,
        boxCount: pallet.boxCount,
        totalUnits: pallet.quantity,
        uom: pallet.uom,
        note: `BST ${transfer.entry_no} receive putaway`,
      });

      // The pallet is now physically kept in a destination-warehouse location, so
      // hand ownership of it — and its boxes — to the receiving company (the
      // cross-company intercompany transfer). No-ops for intra-company transfers
      // and idempotent. A failure here (e.g. a missing item-code mapping) must not
      // un-place the pallet, so surface it without throwing.
      try {
        await bstApi.putawayPallet(transfer.id, pallet.palletCode);
      } catch (error) {
        toast.warning(
          getErrorMessage(
            error,
            'Pallet placed, but the ownership transfer to this company did not complete.',
          ),
        );
      }

      toast.success(`Pallet ${pallet.palletCode} placed in ${selection.location.code}.`);
      onPlaced();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not assign location'));
    } finally {
      setBusy(false);
    }
  }

  const showWarehousePicker = ownWarehouses.length > 1 || transfer.source_type === 'INVOICE';

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a Warehouse Ops location</DialogTitle>
        </DialogHeader>

        {!pallet ? null : ownWarehouses.length === 0 ? (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            No Warehouse Ops warehouse is configured for this company. Design one (with a matching SAP
            warehouse code) before assigning locations.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Pallet summary */}
            <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="font-medium">
                Pallet <span className="font-mono">{pallet.palletCode}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {pallet.itemName || pallet.itemCode} · {pallet.boxCount} box
                {pallet.boxCount === 1 ? '' : 'es'} · {pallet.quantity} {pallet.uom}
                {pallet.batchNumber ? ` · lot ${pallet.batchNumber}` : ''}
              </p>
            </div>

            {showWarehousePicker ? (
              <div className="space-y-1.5">
                <Label htmlFor="bst-putaway-warehouse">Warehouse</Label>
                <NativeSelect
                  id="bst-putaway-warehouse"
                  value={warehouseId}
                  onChange={(event) => {
                    setWarehouseOverride(event.target.value);
                    setSelection({ location: null, validation: null });
                  }}
                >
                  {ownWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {warehouseId ? (
              <PutawayBinPicker
                warehouseId={warehouseId}
                item={item}
                quantity={pallet.quantity}
                added={added}
                selectedLocationId={selection.location?.id ?? null}
                onChange={setSelection}
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void confirm()} disabled={busy || !selection.validation?.ok}>
                {busy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-1 h-4 w-4" />
                )}
                Place in {selection.location?.code ?? 'location'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
