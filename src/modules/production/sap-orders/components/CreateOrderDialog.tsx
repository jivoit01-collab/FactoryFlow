/**
 * Create a SAP production order for a finished item — planned, or released so
 * materials can be issued straight away. SAP fills the components from the
 * item's BOM. Asks before posting (`confirmSapPost`), because the order lands
 * in SAP at once.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { confirmSapPost, SearchableSelect } from '@/shared/components';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { type SapItemOption, useSapItemSearch, useSapWarehouses } from '../api/lookups';
import { useCreateSapOrder } from '../api/sapOrders.queries';
import { postToSap } from '../utils/postToSap';

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <CreateOrderForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateOrderForm({ onDone }: { onDone: () => void }) {
  const [search, setSearch] = useState('');
  const [item, setItem] = useState<SapItemOption | null>(null);
  const [quantity, setQuantity] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [startDate, setStartDate] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [release, setRelease] = useState(true);
  const items = useSapItemSearch(search);
  const warehouses = useSapWarehouses();
  const create = useCreateSapOrder();

  const quantityNumber = Number(quantity);
  const error = !item
    ? 'Choose the item to produce.'
    : !quantity || Number.isNaN(quantityNumber) || quantityNumber <= 0
      ? 'Enter a planned quantity of more than zero.'
      : !dueDate
        ? 'Choose a due date.'
        : startDate && startDate > dueDate
          ? 'The due date is before the start date.'
          : null;

  const submit = async () => {
    if (error || !item) return;
    const ok = await confirmSapPost({
      title: release ? 'Create and release this order in SAP?' : 'Create this order in SAP?',
      details: [
        { label: 'Item', value: `${item.item_code} — ${item.item_name}` },
        { label: 'Planned', value: `${quantity} ${item.uom}` },
        { label: 'Due', value: dueDate },
        !!warehouse && { label: 'Warehouse', value: warehouse },
      ],
      confirmLabel: release ? 'Create and release' : 'Create order',
    });
    if (!ok) return;
    const result = await postToSap((confirmRepeat) =>
      create.mutateAsync({
        item_code: item.item_code,
        planned_quantity: quantity,
        due_date: dueDate,
        start_date: startDate || undefined,
        warehouse: warehouse || undefined,
        remarks: remarks || undefined,
        release,
        confirm_repeat: confirmRepeat,
      }),
    );
    if (!result) return;
    toast.success(`Production order ${result.doc_num ?? result.doc_entry} created in SAP`);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New SAP production order</DialogTitle>
        <DialogDescription>SAP takes the components from the item's bill of materials.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sap-order-item">Item to produce</Label>
          <SearchableSelect<SapItemOption>
            inputId="sap-order-item"
            value={item?.item_code ?? ''}
            items={items.data ?? []}
            isLoading={items.isFetching}
            isError={items.isError}
            placeholder="Type an item code or name…"
            minSearchLength={2}
            minSearchText="Type at least two characters"
            getItemKey={(option) => option.item_code}
            getItemLabel={(option) => `${option.item_code} — ${option.item_name}`}
            filterFn={() => true}
            loadingText="Searching SAP…"
            emptyText="Type to search"
            notFoundText="No item matches"
            onSearchChange={setSearch}
            onItemSelect={setItem}
            onClear={() => setItem(null)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sap-order-qty">Planned quantity{item?.uom ? ` (${item.uom})` : ''}</Label>
            <Input id="sap-order-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sap-order-whs">Warehouse (optional)</Label>
            <NativeSelect id="sap-order-whs" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <SelectOption value="">SAP default</SelectOption>
              {(warehouses.data ?? []).map((w) => (
                <SelectOption key={w.code} value={w.code}>
                  {w.code} — {w.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sap-order-start">Start date (optional)</Label>
            <Input id="sap-order-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sap-order-due">Due date</Label>
            <Input id="sap-order-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sap-order-remarks">Remarks (optional)</Label>
          <Textarea id="sap-order-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={release} onCheckedChange={(value) => setRelease(value === true)} />
          Release it now, so materials can be issued
        </label>
      </DialogBody>
      <DialogFooter className="gap-2 border-t pt-4">
        {error && <p className="mr-auto self-center text-sm text-muted-foreground">{error}</p>}
        <Button variant="outline" onClick={onDone} disabled={create.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!!error || create.isPending}>
          {create.isPending ? 'Posting…' : 'Create in SAP'}
        </Button>
      </DialogFooter>
    </>
  );
}
