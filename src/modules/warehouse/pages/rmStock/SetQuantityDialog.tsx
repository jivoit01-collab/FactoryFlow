import { Loader2, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { RawMaterialItem, RawMaterialStockRow } from '@/modules/warehouse/api';
import { useRMItemSearch, useSetRMStock } from '@/modules/warehouse/api';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

export interface SetQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The one warehouse this register covers, from the server. */
  registerWarehouse: string;
  /** Its display name, when SAP's warehouse list has loaded. */
  registerWarehouseName?: string;
  /** The row being re-stated, or null when adding an item to the register. */
  editing: RawMaterialStockRow | null;
}

function today(): string {
  // Local date, not `toISOString()` — that is UTC and would offer yesterday to
  // anyone typing before 05:30 IST.
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Sets what one raw material's quantity is in one warehouse.
 *
 * The same dialog adds an item to the register and re-states one already on it —
 * the backend upserts, so there is no separate "edit". When re-stating, the
 * item is fixed and only the figure, its date and the remark can change:
 * pointing an existing row at a different item would silently rewrite the
 * history of the item it used to hold.
 *
 * State is seeded once, at mount, and never reset by an effect: the page
 * remounts this component on each open (see its `key`), which is what makes a
 * cancelled edit unable to leak into the next one.
 */
export function SetQuantityDialog({
  open,
  onOpenChange,
  registerWarehouse,
  registerWarehouseName,
  editing,
}: SetQuantityDialogProps) {
  const setStock = useSetRMStock();

  // Not a choice. Raw material lives in the bulk-oil store, and offering a
  // dropdown only invited a count to be filed against a warehouse nothing
  // reads. An existing row keeps its own code so a legacy row entered
  // elsewhere still edits truthfully.
  const warehouse = editing?.warehouse_code ?? registerWarehouse;
  const [item, setItem] = useState<RawMaterialItem | null>(() =>
    editing
      ? {
          item_code: editing.item_code,
          item_name: editing.item_name,
          uom: editing.uom,
          // Unknown here: the row carries no SAP figure, and re-reading HANA
          // just to fill a hint is not worth the round trip.
          sap_on_hand: null,
        }
      : null,
  );
  const [qty, setQty] = useState(editing?.qty ?? '');
  const [asOfDate, setAsOfDate] = useState(() => editing?.as_of_date ?? today());
  const [remarks, setRemarks] = useState(editing?.remarks ?? '');
  const [itemSearch, setItemSearch] = useState('');

  const debouncedSearch = useDebounce(itemSearch);
  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useRMItemSearch(
    debouncedSearch,
    warehouse || undefined,
  );

  const sapOnHand = useMemo(() => {
    if (item?.sap_on_hand == null) return null;
    return item.sap_on_hand.toLocaleString(undefined, { maximumFractionDigits: 3 });
  }, [item]);

  async function handleSave() {
    if (!item) {
      toast.error('Choose an item.');
      return;
    }
    if (qty.trim() === '' || Number(qty) < 0 || Number.isNaN(Number(qty))) {
      toast.error('Enter the quantity on the floor — zero is allowed, blank is not.');
      return;
    }
    try {
      await setStock.mutateAsync({
        warehouse_code: warehouse,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        qty: qty.trim(),
        as_of_date: asOfDate,
        remarks: remarks.trim(),
      });
      toast.success(`${item.item_code} in ${warehouse} is now ${qty.trim()} ${item.uom}`.trim());
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the quantity.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Update the quantity' : 'Set a quantity'}</DialogTitle>
          <DialogDescription>
            The quantity your store is holding right now. It is recorded here only — nothing
            is posted to SAP — and the figure it replaces is kept in the item&apos;s history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Warehouse</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="font-mono text-sm font-medium">
                {warehouse}
                {registerWarehouseName && (
                  <span className="ml-2 font-sans font-normal text-muted-foreground">
                    {registerWarehouseName}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rm-item">Raw material</Label>
            {editing ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="font-mono text-sm font-medium">{editing.item_code}</p>
                <p className="text-xs text-muted-foreground">{editing.item_name}</p>
              </div>
            ) : (
              <SearchableSelect<RawMaterialItem>
                items={items}
                isLoading={itemsLoading && debouncedSearch.trim().length >= 2}
                isError={itemsError}
                inputId="rm-item"
                value={item?.item_code ?? ''}
                defaultDisplayText={item ? `${item.item_code} — ${item.item_name}` : ''}
                placeholder="Search a raw material by code or name…"
                getItemKey={(i) => i.item_code}
                getItemLabel={(i) => `${i.item_code} — ${i.item_name}`}
                // The server did the filtering; filtering again locally would
                // hide rows it deliberately matched on a field we do not show.
                filterFn={() => true}
                renderItem={(i) => (
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-medium">{i.item_code}</div>
                      <div className="truncate text-sm">{i.item_name}</div>
                    </div>
                    {i.sap_on_hand != null && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        SAP {i.sap_on_hand.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </Badge>
                    )}
                  </div>
                )}
                loadingText="Searching SAP…"
                emptyText="Type at least 2 characters"
                notFoundText="No raw material matches that"
                errorText="Could not reach SAP for the item list"
                onSearchChange={setItemSearch}
                onItemSelect={setItem}
                onClear={() => setItem(null)}
              />
            )}
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Raw materials as SAP groups them, with SAP&apos;s own stock for {warehouse}
                beside each. The group decides, not the code — a few raw materials carry a PM
                code.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="rm-qty">Quantity on the floor{item?.uom ? ` (${item.uom})` : ''}</Label>
              <Input
                id="rm-qty"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0.000"
              />
              {sapOnHand && (
                <p className="text-xs text-muted-foreground">
                  SAP shows {sapOnHand} {item?.uom} in {warehouse}.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="rm-as-of">True as of</Label>
              <Input
                id="rm-as-of"
                type="date"
                value={asOfDate}
                max={today()}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rm-remarks">Remarks</Label>
            <Textarea
              id="rm-remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Anything worth knowing about this figure — a count sheet, a pending receipt…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={setStock.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setStock.isPending}>
            {setStock.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save quantity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
