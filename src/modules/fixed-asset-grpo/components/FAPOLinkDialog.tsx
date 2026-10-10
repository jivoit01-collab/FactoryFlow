import { AlertTriangle, Link2, Loader2, Lock, Unlink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
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
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useFAEntry,
  useFAOpenPOs,
  useLinkFAPO,
  useUnlinkFAPO,
  useUpdateFAPOLink,
} from '../api/faGrpo.queries';
import type { FAPOLinkRequest } from '../types';
import {
  buildLinkItems,
  buildLinkRows,
  type FALinkRow,
  formatQty,
  linkFormError,
  linkRowError,
  overReceiptCeiling,
  postingWarehouses,
} from '../utils/faGrpo.utils';
import { FAVendorPicker } from './FAVendorPicker';

/**
 * Link (or change, or remove) the SAP PO on a fixed-asset gate entry.
 *
 * The gate records the arrival with free text and completes it; the PO is
 * linked here, afterwards, by someone with the link or post right. This is
 * the spec's FAPOLinePicker, moved off the gate wizard (which stays as it is):
 * pick the SAP vendor, one of their open POs with lines in a fixed-asset
 * warehouse, and say how much of each line arrived.
 *
 * - **Received now** starts at the line's open quantity (or, for the PO
 *   already linked, at what was linked).
 * - When the backend says `over_receipt_enforced`, a line is held to 110% of
 *   its open quantity -- SAP's own ceiling (error 200017).
 * - A PO with lines in two warehouses is warned about here: one GRPO goes to
 *   one warehouse, so the post would be refused.
 * - The link is locked once a GRPO of it is posted, simulated or on its way,
 *   or the entry is closed by hand; the backend's reason is shown as is.
 *
 * One PO per entry (backend v1). Changing it discards the entry's unsent
 * drafts for that PO, because their saved lines would no longer exist.
 */
export function FAPOLinkDialog({
  vehicleEntryId,
  open,
  onOpenChange,
  onDone,
}: {
  vehicleEntryId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const { data: entry, isLoading: entryLoading } = useFAEntry(vehicleEntryId, open);
  const existing = entry?.po_receipts[0] ?? null;

  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [rows, setRows] = useState<FALinkRow[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const linkPO = useLinkFAPO(vehicleEntryId);
  const updateLink = useUpdateFAPOLink(vehicleEntryId);
  const unlinkPO = useUnlinkFAPO(vehicleEntryId);
  const isSaving = linkPO.isPending || updateLink.isPending || unlinkPO.isPending;

  // Start from the existing link each time the dialog opens on an entry.
  useEffect(() => {
    if (!open || !entry) return;
    setSupplierCode(existing?.supplier_code ?? '');
    setSupplierName(existing?.supplier_name ?? '');
    setPoNumber(existing?.po_number ?? '');
    setInvoiceNo(existing?.invoice_no ?? '');
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.vehicle_entry_id, existing?.id]);

  const {
    data: openPOs,
    isLoading: posLoading,
    isError: posError,
    error: posErrorObj,
  } = useFAOpenPOs(vehicleEntryId, supplierCode, open);
  const enforced = openPOs?.over_receipt_enforced ?? false;
  const selectedPO = useMemo(
    () => openPOs?.results.find((po) => po.po_number === poNumber) ?? null,
    [openPOs, poNumber],
  );

  // A fresh PO (or a fresh read of it) re-seeds the line table.
  useEffect(() => {
    setRows(selectedPO ? buildLinkRows(selectedPO, existing) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPO]);

  const lockReason = entry?.link_lock_reason || existing?.lock_reason || null;
  const warehouses = postingWarehouses(
    rows.map((row) => ({ warehouse_code: row.warehouse_code, qty: row.received_now })),
  );
  const existingNoLongerOpen =
    !!existing &&
    !!openPOs &&
    existing.supplier_code === supplierCode &&
    !openPOs.results.some((po) => po.po_number === existing.po_number);
  const gateHasInvoice = !!entry?.invoice_number;

  const setReceivedNow = (lineNum: number, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.line_num === lineNum ? { ...row, received_now: value } : row)),
    );
  };

  const handleSave = async () => {
    setFormError(null);
    if (!supplierCode) {
      setFormError('Choose the SAP supplier first.');
      return;
    }
    if (!selectedPO) {
      setFormError('Choose one of the supplier’s open POs.');
      return;
    }
    const error = linkFormError(rows, enforced);
    if (error) {
      setFormError(error);
      return;
    }
    const request: FAPOLinkRequest = {
      po_number: selectedPO.po_number,
      supplier_code: selectedPO.supplier_code || supplierCode,
      supplier_name: selectedPO.supplier_name || supplierName || supplierCode,
      items: buildLinkItems(rows),
      ...(invoiceNo.trim() ? { invoice_no: invoiceNo.trim() } : {}),
    };
    try {
      const response = existing
        ? await updateLink.mutateAsync({ poReceiptId: existing.id, data: request })
        : await linkPO.mutateAsync(request);
      toast.success(response.message || `PO ${response.po_receipt.po_number} linked.`);
      for (const warning of response.warnings ?? []) toast.warning(warning);
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not link the PO.'));
    }
  };

  const handleUnlink = async () => {
    if (!existing) return;
    const ok = await confirmDialog({
      title: `Unlink PO ${existing.po_number}?`,
      description:
        'The entry goes back to Needs PO. Any unsent GRPO draft of this PO is discarded with it.',
      confirmLabel: 'Unlink PO',
      destructive: true,
    });
    if (!ok) return;
    try {
      await unlinkPO.mutateAsync(existing.id);
      toast.success(`PO ${existing.po_number} unlinked.`);
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not unlink the PO.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {existing ? 'Change the linked PO' : 'Link an SAP PO'}
            {entry?.entry_no ? ` — ${entry.entry_no}` : ''}
          </DialogTitle>
          <DialogDescription>
            {entry?.supplier_name
              ? `The gate wrote the supplier as “${entry.supplier_name}”. `
              : ''}
            Pick the SAP supplier and one of their open fixed-asset POs, then enter what arrived.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {entryLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the entry…
            </div>
          )}

          {lockReason && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{lockReason}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FAVendorPicker
              value={supplierCode}
              displayName={supplierName}
              disabled={!!lockReason || isSaving}
              onChange={(vendor) => {
                setSupplierCode(vendor?.vendor_code ?? '');
                setSupplierName(vendor?.vendor_name ?? '');
                setPoNumber('');
                setFormError(null);
              }}
            />
            <div>
              <Label htmlFor="fa-po-link-po" className="mb-1 block">
                Open PO <span className="text-red-500">*</span>
              </Label>
              <NativeSelect
                id="fa-po-link-po"
                value={poNumber}
                disabled={!supplierCode || posLoading || !!lockReason || isSaving}
                onChange={(e) => {
                  setPoNumber(e.target.value);
                  setFormError(null);
                }}
              >
                <option value="">
                  {!supplierCode
                    ? 'Choose the supplier first'
                    : posLoading
                      ? 'Reading SAP…'
                      : (openPOs?.results.length ?? 0) === 0
                        ? 'No open fixed-asset PO'
                        : 'Choose a PO'}
                </option>
                {(openPOs?.results ?? []).map((po) => (
                  <option key={po.po_number} value={po.po_number}>
                    {po.po_number}
                    {po.doc_date ? ` — ${po.doc_date}` : ''} ({po.items.length} line
                    {po.items.length === 1 ? '' : 's'})
                  </option>
                ))}
              </NativeSelect>
              {openPOs && openPOs.warehouses.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Only PO lines in {openPOs.warehouses.join(', ')} are listed.
                </p>
              )}
            </div>
          </div>

          {posError && (
            <p className="text-sm text-red-600">
              {getErrorMessage(posErrorObj, 'Could not read the open POs from SAP.')}
            </p>
          )}

          {existingNoLongerOpen && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              The linked PO {existing?.po_number} is no longer open in SAP for this supplier. Choose
              another PO to change the link, or unlink it.
            </p>
          )}

          {!gateHasInvoice && selectedPO && (
            <div className="max-w-sm">
              <Label htmlFor="fa-po-link-invoice" className="mb-1 block">
                Supplier bill no. (optional)
              </Label>
              <Input
                id="fa-po-link-invoice"
                maxLength={50}
                value={invoiceNo}
                disabled={!!lockReason || isSaving}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="The gate did not record one"
              />
            </div>
          )}

          {selectedPO && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Item</th>
                    <th className="p-2 text-right font-medium">Ordered</th>
                    <th className="p-2 text-right font-medium">Received before</th>
                    <th className="p-2 text-right font-medium">Open</th>
                    <th className="p-2 text-right font-medium">Received now</th>
                    <th className="p-2 text-left font-medium">UOM</th>
                    <th className="p-2 text-right font-medium">Rate</th>
                    <th className="p-2 text-left font-medium">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rowError = linkRowError(row, enforced);
                    const ceiling = overReceiptCeiling(row.open_qty, enforced);
                    return (
                      <tr key={row.line_num} className="border-t align-top">
                        <td className="p-2">
                          <div className="font-medium">{row.po_item_code}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.item_name} · line {row.line_num}
                          </div>
                        </td>
                        <td className="p-2 text-right">{formatQty(row.ordered_qty)}</td>
                        <td className="p-2 text-right">{formatQty(row.received_before)}</td>
                        <td className="p-2 text-right">{formatQty(row.open_qty)}</td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            className="ml-auto w-28 text-right"
                            aria-label={`Received now, ${row.po_item_code}`}
                            value={row.received_now}
                            disabled={!!lockReason || isSaving}
                            onChange={(e) => setReceivedNow(row.line_num, e.target.value)}
                          />
                          {ceiling !== null && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              max {formatQty(ceiling)}
                            </div>
                          )}
                          {rowError && <div className="mt-1 text-xs text-red-600">{rowError}</div>}
                        </td>
                        <td className="p-2">{row.uom}</td>
                        <td className="p-2 text-right">{row.rate.toLocaleString('en-IN')}</td>
                        <td className="p-2">{row.warehouse_code || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {warehouses.length > 1 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                These lines sit in different warehouses ({warehouses.join(', ')}). A GRPO goes to
                one warehouse, so the post will be refused: link one warehouse&rsquo;s lines (set
                the others to 0).
              </span>
            </div>
          )}

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {formError}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          {existing && (
            <Button
              type="button"
              variant="outline"
              className="sm:mr-auto"
              disabled={!!lockReason || isSaving}
              onClick={() => void handleUnlink()}
            >
              <Unlink className="mr-1 h-4 w-4" /> Unlink PO
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!!lockReason || isSaving || !selectedPO}
          >
            {isSaving ? 'Saving…' : existing ? 'Save the link' : 'Link PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
