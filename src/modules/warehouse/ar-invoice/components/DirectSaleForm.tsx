import { FileText, Plus, ReceiptText, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { WarehouseSelect } from '@/modules/warehouse/grpo/components';
import { SearchableSelect } from '@/shared/components';
import { Button, Card, CardContent, Input, Label, Textarea } from '@/shared/components/ui';
import { formatCurrency, getErrorMessage } from '@/shared/utils';

import { arInvoiceApi } from '../api/ar-invoice.api';
import { useCreateArInvoice, useWarehouseItems } from '../api/ar-invoice.queries';
import type { DirectSaleLine, WarehouseStockItem } from '../types';
import { CustomerSelect } from './CustomerSelect';

/** The org's tax codes embed their rate ("CG+SG@5", "IGST@12") — parse it to
 * estimate the gross. SAP's own computation at posting stays authoritative. */
function taxRate(taxCode: string): number | null {
  const match = /@(\d+(?:\.\d+)?)/.exec(taxCode);
  return match ? Number(match[1]) : null;
}

function lineGross(line: DirectSaleLine): number {
  const net = Number(line.quantity) * Number(line.unit_price);
  const rate = taxRate(line.tax_code);
  return rate == null ? net : net * (1 + rate / 100);
}

/**
 * Direct (cash/counter) sale: no Sales Order — the operator builds the lines
 * by hand against a warehouse's stock. Price and tax prefill from what the
 * customer last paid for the item; both stay editable. The SAP journey after
 * submit is identical to the SO flow (approval draft → Invoice Approval page
 * → batch allocation → posted invoice).
 */
export function DirectSaleForm({ onCreated }: { onCreated: () => void }) {
  const [customerCode, setCustomerCode] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [pickedItem, setPickedItem] = useState<WarehouseStockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [cart, setCart] = useState<DirectSaleLine[]>([]);

  const [customerRef, setCustomerRef] = useState('');
  const [docDate, setDocDate] = useState('');
  const [docDueDate, setDocDueDate] = useState('');
  const [comments, setComments] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = useWarehouseItems(warehouse, itemSearch, itemPickerOpen);
  const createInvoice = useCreateArInvoice();

  const cartTotal = cart.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
    0,
  );
  const cartGross = cart.reduce((sum, line) => sum + lineGross(line), 0);

  const pickItem = async (item: WarehouseStockItem | null) => {
    setPickedItem(item);
    setUnitPrice('');
    setTaxCode('');
    if (!item || !customerCode) return;
    // Prefill from the customer's last purchase of this item (best-effort).
    try {
      const defaults = await arInvoiceApi.getLineDefaults(customerCode, item.item_code);
      if (defaults.price != null) setUnitPrice(String(defaults.price));
      if (defaults.tax_code) setTaxCode(defaults.tax_code);
    } catch {
      // No history — the operator types both.
    }
  };

  const addLine = () => {
    if (!pickedItem) return toast.error('Pick an item.');
    if (!warehouse) return toast.error('Pick a warehouse.');
    const qty = Number(quantity);
    if (!qty || qty <= 0) return toast.error('Enter a positive quantity.');
    if (qty > pickedItem.on_hand) {
      return toast.error(
        `Only ${pickedItem.on_hand} on hand for ${pickedItem.item_code} in ${warehouse}.`,
      );
    }
    if (unitPrice === '' || Number(unitPrice) < 0) return toast.error('Enter a unit price.');
    if (!taxCode.trim()) return toast.error('Enter a tax code (e.g. CG+SG@5).');
    if (cart.some((l) => l.item_code === pickedItem.item_code && l.warehouse_code === warehouse)) {
      return toast.error(`${pickedItem.item_code} is already on the invoice.`);
    }
    setCart((prev) => [
      ...prev,
      {
        item_code: pickedItem.item_code,
        description: pickedItem.item_name,
        quantity: String(qty),
        unit_price: unitPrice,
        tax_code: taxCode.trim(),
        warehouse_code: warehouse,
      },
    ]);
    setPickedItem(null);
    setQuantity('');
    setUnitPrice('');
    setTaxCode('');
  };

  const reset = () => {
    setCart([]);
    setCustomerRef('');
    setDocDate('');
    setDocDueDate('');
    setComments('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!customerCode) return toast.error('Select a customer.');
    if (cart.length === 0) return toast.error('Add at least one line.');

    try {
      const posting = await createInvoice.mutateAsync({
        data: {
          customer_code: customerCode,
          direct_lines: cart,
          ...(customerRef.trim() ? { customer_ref: customerRef.trim() } : {}),
          ...(docDate ? { doc_date: docDate } : {}),
          ...(docDueDate ? { doc_due_date: docDueDate } : {}),
          ...(comments.trim() ? { comments: comments.trim() } : {}),
        },
        files,
      });
      if (posting.status === 'PENDING_APPROVAL') {
        toast.success(
          `Cash sale sent to SAP — awaiting approval (draft ${posting.sap_draft_entry}).`,
        );
      } else if (posting.status === 'POSTED') {
        toast.success(`Cash sale posted to SAP as ${posting.sap_doc_num}.`);
      } else {
        toast.warning(`Invoice saved with status ${posting.status_display}.`);
      }
      reset();
      onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create the cash-sale invoice'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-80">
          <CustomerSelect
            label="Customer"
            required
            value={customerCode}
            onChange={(customer) => setCustomerCode(customer?.customer_code ?? '')}
            placeholder="e.g. CASH SALE PB"
          />
        </div>
        <div className="w-full sm:w-64">
          <WarehouseSelect
            value={warehouse}
            onChange={setWarehouse}
            label="Warehouse"
            placeholder="Ship-from warehouse"
            required
          />
        </div>
      </div>

      {!customerCode || !warehouse ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <ReceiptText className="h-8 w-8" />
          <p className="text-sm">Select the customer and warehouse to start adding items.</p>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Add item</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <SearchableSelect<WarehouseStockItem>
                    label="Item"
                    inputId="direct-sale-item"
                    value={pickedItem?.item_code}
                    items={items.data ?? []}
                    isLoading={items.isLoading}
                    placeholder="Search item by code or name"
                    getItemKey={(i) => i.item_code}
                    getItemLabel={(i) => `${i.item_name} (${i.item_code})`}
                    filterFn={() => true}
                    onSearchChange={setItemSearch}
                    onOpenChange={setItemPickerOpen}
                    renderItem={(item) => (
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {item.item_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.item_code}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {item.on_hand} {item.uom}
                        </span>
                      </div>
                    )}
                    loadingText="Loading items..."
                    emptyText="No stock in this warehouse"
                    notFoundText="No items found"
                    onItemSelect={pickItem}
                    onClear={() => pickItem(null)}
                  />
                </div>
                <div>
                  <Label htmlFor="direct-qty">
                    Qty{pickedItem ? ` (max ${pickedItem.on_hand})` : ''}
                  </Label>
                  <Input
                    id="direct-qty"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="direct-price">Unit price</Label>
                  <Input
                    id="direct-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Pre-tax"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="direct-tax">Tax code</Label>
                  <Input
                    id="direct-tax"
                    placeholder="e.g. CG+SG@5"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="outline" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" /> Add line
              </Button>
            </CardContent>
          </Card>

          {cart.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Unit price</th>
                    <th className="px-3 py-2 font-medium">Tax</th>
                    <th className="px-3 py-2 font-medium">Warehouse</th>
                    <th className="px-3 py-2 text-right font-medium">Pre-tax</th>
                    <th className="px-3 py-2 text-right font-medium">Est. incl. tax</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line, index) => (
                    <tr key={`${line.item_code}-${line.warehouse_code}`} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-medium">{line.item_code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {line.description}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatCurrency(Number(line.unit_price))}
                      </td>
                      <td className="px-3 py-2">{line.tax_code}</td>
                      <td className="px-3 py-2">{line.warehouse_code}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(Number(line.quantity) * Number(line.unit_price))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {taxRate(line.tax_code) == null ? '—' : formatCurrency(lineGross(line))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${line.item_code}`}
                          onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Invoice details</h3>
                <p className="text-sm text-muted-foreground">
                  {cart.length} line(s) ·{' '}
                  <span className="font-medium text-foreground">{formatCurrency(cartTotal)}</span>{' '}
                  pre-tax · ≈{' '}
                  <span className="font-medium text-foreground">{formatCurrency(cartGross)}</span>{' '}
                  incl. tax (SAP computes the final total)
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="direct-customer-ref">Customer ref / bill no.</Label>
                  <Input
                    id="direct-customer-ref"
                    placeholder="Optional — goes to NumAtCard"
                    value={customerRef}
                    onChange={(e) => setCustomerRef(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="direct-doc-date">Posting date</Label>
                  <Input
                    id="direct-doc-date"
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="direct-due-date">Due date</Label>
                  <Input
                    id="direct-due-date"
                    type="date"
                    value={docDueDate}
                    onChange={(e) => setDocDueDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="direct-attachments">Attachments (optional)</Label>
                  <Input
                    id="direct-attachments"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                </div>
              </div>
              {files.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Label htmlFor="direct-comments">Comments</Label>
                <Textarea
                  id="direct-comments"
                  rows={2}
                  placeholder="Optional remarks carried onto the SAP document"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <Button onClick={submit} disabled={createInvoice.isPending || cart.length === 0}>
                <Upload className="mr-2 h-4 w-4" />
                {createInvoice.isPending ? 'Posting…' : 'Create & send to SAP'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
