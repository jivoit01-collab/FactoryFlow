/**
 * Receive the finished product of a released SAP production order
 * (InventoryGenEntries against the order), as SAP Portal's Receipt page did.
 *
 * SAP Portal also offered Complete / Reject, which it set by writing SAP's
 * IGN1 table directly afterwards. JI does not write SAP tables, so a receipt
 * from here is SAP's default — Complete — and the dialog says so.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import {
  Button,
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

import { useSapWarehouses } from '../api/lookups';
import type { SapOrderDetail } from '../api/sapOrders.api';
import { useReceiveFromSapOrder } from '../api/sapOrders.queries';
import { qty, remaining } from '../utils/format';
import { postToSap } from '../utils/postToSap';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function ReceiptDialog({
  order,
  open,
  onOpenChange,
}: {
  order: SapOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <ReceiptForm order={order} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReceiptForm({ order, onDone }: { order: SapOrderDetail; onDone: () => void }) {
  const receive = useReceiveFromSapOrder(order.doc_entry);
  const warehouses = useSapWarehouses();
  const [quantity, setQuantity] = useState(String(remaining(order.planned_quantity, order.received_quantity)));
  const [warehouse, setWarehouse] = useState(order.warehouse);
  const [batch, setBatch] = useState('');
  const [postingDate, setPostingDate] = useState(todayIso());
  const [remarks, setRemarks] = useState('');

  const amount = Number(quantity);
  const error = !quantity || Number.isNaN(amount) || amount <= 0 ? 'Enter a quantity of more than zero.' : null;

  const submit = async () => {
    if (error) return;
    const ok = await confirmSapPost({
      title: `Receive into stock from order ${order.doc_num ?? order.doc_entry}?`,
      details: [
        { label: 'Product', value: `${order.item_code} — ${order.item_name}` },
        { label: 'Quantity', value: `${quantity} ${order.uom}` },
        { label: 'Warehouse', value: warehouse || 'the order’s' },
        !!batch && { label: 'Batch', value: batch },
      ],
      confirmLabel: 'Receive in SAP',
    });
    if (!ok) return;
    const result = await postToSap((confirmRepeat) =>
      receive.mutateAsync({
        quantity,
        warehouse: warehouse || undefined,
        batch_number: batch || undefined,
        posting_date: postingDate || undefined,
        remarks: remarks || undefined,
        confirm_repeat: confirmRepeat,
      }),
    );
    if (!result) return;
    if (result.pending_approval) toast.info(`SAP is holding the receipt for approval (draft ${result.draft_entry}).`);
    else toast.success(`Receipt ${result.doc_num ?? result.doc_entry} posted in SAP`);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Receipt from production — order {order.doc_num ?? order.doc_entry}</DialogTitle>
        <DialogDescription>
          {order.item_code} — {order.item_name}. {qty(order.received_quantity)} of {qty(order.planned_quantity)}{' '}
          {order.uom} received so far. Posted as Complete.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-qty">Quantity ({order.uom || 'units'})</Label>
            <Input id="receipt-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-whs">Warehouse</Label>
            <NativeSelect id="receipt-whs" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <SelectOption value="">The order’s</SelectOption>
              {(warehouses.data ?? []).map((w) => (
                <SelectOption key={w.code} value={w.code}>
                  {w.code} — {w.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-batch">Batch number</Label>
            <Input id="receipt-batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Needed if the product is batch managed" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-date">Posting date</Label>
            <Input id="receipt-date" type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt-remarks">Remarks (optional)</Label>
          <Textarea id="receipt-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </DialogBody>
      <DialogFooter className="gap-2 border-t pt-4">
        {error && <p className="mr-auto self-center text-sm text-muted-foreground">{error}</p>}
        <Button variant="outline" onClick={onDone} disabled={receive.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!!error || receive.isPending}>
          {receive.isPending ? 'Posting…' : 'Receive in SAP'}
        </Button>
      </DialogFooter>
    </>
  );
}
