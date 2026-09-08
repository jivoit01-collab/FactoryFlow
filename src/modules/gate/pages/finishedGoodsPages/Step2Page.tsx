import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { Card } from '@/shared/components/ui';
import { Input } from '@/shared/components/ui';

import type { CreatePOReceiptRequest, PurchaseOrder } from '../../api/po/po.api';
import {
  useCreateFGReceipt,
  useFGReceipts,
  useOpenFGPOs,
  useUpdateFGReceipt,
} from '../../api/fg/fg.queries';
import { StepFooter, StepHeader, StepLoadingSpinner, VendorSelect } from '../../components';
import { FINISHED_GOODS_FLOW } from '../../constants/entryFlowConfig';
import { useEntryId, useEntryStepTracker } from '../../hooks';

interface FGItemRow {
  line_num: number;
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_prev: number; // already received on the PO
  // SAP's POR1.OpenQty — the basis for the over-receipt ceiling. null when it has
  // not been read yet (edit mode, before the PO is re-fetched).
  remaining_initial: number | null;
  received_now: number;
  uom: string;
  rate: number;
}

// SAP refuses a receipt above 110% of the PO line's OPEN quantity — it checks
// PDN1."Quantity" > PDN1."BaseOpnQty" * 1.10 (error 200017), not 110% of the
// quantity originally ordered. Keep in step with the server's
// raw_material_gatein/services/validations.py.
const OVER_RECEIPT_TOLERANCE = 1.1;

/**
 * Most that may be received against a PO line — null when there is no cap to show,
 * either because this company does not enforce the rule (the server says so per PO)
 * or because the line's open qty has not been read yet.
 */
const overReceiptCeiling = (openQty: number | null, enforced: boolean): number | null =>
  !enforced || openQty === null ? null : openQty * OVER_RECEIPT_TOLERANCE;

export default function Step2Page() {
  const navigate = useNavigate();
  const { entryIdNumber, isEditMode } = useEntryId();
  useEntryStepTracker();

  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [overReceiptEnforced, setOverReceiptEnforced] = useState(false);
  const [items, setItems] = useState<FGItemRow[]>([]);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: existingReceipts, isLoading: isLoadingReceipts } = useFGReceipts(
    isEditMode ? entryIdNumber : null,
  );
  // A saved receipt stores no open quantity, so an edit-mode page has to re-read the
  // PO before it can show a ceiling.
  const needsOpenQtys = items.some((it) => it.remaining_initial === null);
  const {
    data: openPOs = [],
    isLoading: isLoadingPOs,
    error: poError,
  } = useOpenFGPOs(supplierCode, poDropdownOpen || (needsOpenQtys && !!poNumber));

  const createReceipt = useCreateFGReceipt(entryIdNumber ?? 0);
  const updateReceipt = useUpdateFGReceipt(entryIdNumber ?? 0);

  // Hydrate from an existing receipt in edit mode.
  useEffect(() => {
    if (!existingReceipts || existingReceipts.length === 0) return;
    const receipt = existingReceipts[0];
    setReceiptId(receipt.id ?? null);
    setSupplierCode(receipt.supplier_code);
    setSupplierName(receipt.supplier_name);
    setPoNumber(receipt.po_number);
    setItems(
      receipt.items.map((it) => ({
        line_num: it.sap_line_num,
        po_item_code: it.po_item_code,
        item_name: it.item_name,
        ordered_qty: Number(it.ordered_qty) || 0,
        received_prev: 0,
        // The saved receipt carries no open quantity; standing in the ordered
        // quantity gave a ceiling of ordered x 1.1 on a line that may have almost
        // nothing left open. Left unknown until the PO is re-read below.
        remaining_initial: null,
        received_now: Number(it.received_qty) || 0,
        uom: it.uom,
        rate: Number(it.unit_price) || 0,
      })),
    );
  }, [existingReceipts]);

  // Backfill SAP's open quantities once the PO has been re-read. Only fills gaps, so
  // it cannot fight a fresh PO selection. A failed read leaves the ceiling unknown
  // rather than guessing at it — the server re-checks against SAP regardless.
  useEffect(() => {
    if (!needsOpenQtys || !poNumber || isLoadingPOs || poError) return;
    const matchingPO = openPOs.find((po) => po.po_number === poNumber);
    const openByLine = new Map(
      (matchingPO?.items ?? []).map((it) => [
        it.line_num,
        { open: Number(it.remaining_qty) || 0, received: Number(it.received_qty) || 0 },
      ]),
    );
    setOverReceiptEnforced(matchingPO?.over_receipt_enforced ?? false);
    setItems((prev) =>
      prev.map((it) => {
        if (it.remaining_initial !== null) return it;
        const fromPO = openByLine.get(it.line_num);
        // Absent from the open-PO list means nothing is left open against the line.
        return {
          ...it,
          received_prev: fromPO?.received ?? it.received_prev,
          remaining_initial: fromPO?.open ?? 0,
        };
      }),
    );
  }, [needsOpenQtys, poNumber, isLoadingPOs, poError, openPOs]);

  const handleSelectPO = (po: PurchaseOrder) => {
    setPoNumber(po.po_number);
    setPoDropdownOpen(false);
    setOverReceiptEnforced(po.over_receipt_enforced ?? false);
    setItems(
      po.items.map((it) => {
        const remaining = Number(it.remaining_qty) || 0;
        return {
          line_num: it.line_num,
          po_item_code: it.po_item_code,
          item_name: it.item_name,
          ordered_qty: Number(it.ordered_qty) || 0,
          received_prev: Number(it.received_qty) || 0,
          remaining_initial: remaining,
          received_now: 0,
          uom: it.uom,
          rate: Number(it.rate) || 0,
        };
      }),
    );
  };

  const handleReceivedChange = (lineNum: number, value: string) => {
    const qty = Number(value) || 0;
    setItems((prev) =>
      prev.map((it) => (it.line_num === lineNum ? { ...it, received_now: qty } : it)),
    );
  };

  const totalReceiving = useMemo(
    () => items.reduce((sum, it) => sum + (it.received_now > 0 ? 1 : 0), 0),
    [items],
  );

  const buildPayload = (): CreatePOReceiptRequest => ({
    po_number: poNumber,
    supplier_code: supplierCode,
    supplier_name: supplierName,
    items: items
      .filter((it) => it.received_now > 0)
      .map((it) => ({
        line_num: it.line_num,
        po_item_code: it.po_item_code,
        item_name: it.item_name,
        ordered_qty: it.ordered_qty,
        received_qty: it.received_now,
        uom: it.uom,
      })),
  });

  const validate = (): boolean => {
    if (!supplierCode) {
      setError('Please select a supplier.');
      return false;
    }
    if (!poNumber) {
      setError('Please select a finished-goods PO.');
      return false;
    }
    if (totalReceiving === 0) {
      setError('Enter a received quantity for at least one item.');
      return false;
    }
    const over = items.find((it) => {
      const ceiling = overReceiptCeiling(it.remaining_initial, overReceiptEnforced);
      return ceiling !== null && it.received_now > ceiling;
    });
    if (over) {
      const ceiling = overReceiptCeiling(over.remaining_initial, overReceiptEnforced) ?? 0;
      setError(
        `Only ${over.remaining_initial ?? 0} ${over.uom} is open on the PO line for ` +
          `${over.po_item_code}, so SAP will accept at most ${ceiling.toFixed(3)} ` +
          `${over.uom} (open + 10% tolerance).`,
      );
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError(null);
    if (!entryIdNumber) return;
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (receiptId) {
        await updateReceipt.mutateAsync({ poReceiptId: receiptId, data: payload });
      } else {
        await createReceipt.mutateAsync(payload);
      }
      toast.success('Finished-goods PO received');
      navigate(`${FINISHED_GOODS_FLOW.routePrefix}/edit/${entryIdNumber}/review`);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save PO receipt.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditMode && isLoadingReceipts) {
    return <StepLoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <StepHeader
        currentStep={2}
        totalSteps={FINISHED_GOODS_FLOW.totalSteps}
        title={FINISHED_GOODS_FLOW.headerTitle}
        error={error}
      />

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <VendorSelect
              label="Supplier"
              required
              value={supplierCode}
              onChange={(vendor) => {
                setSupplierCode(vendor?.vendor_code || '');
                setSupplierName(vendor?.vendor_name || '');
                setPoNumber('');
                setItems([]);
                setReceiptId(null);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Finished Goods PO <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={poNumber}
              disabled={!supplierCode}
              onFocus={() => setPoDropdownOpen(true)}
              onChange={(e) => {
                const po = openPOs.find((p) => p.po_number === e.target.value);
                if (po) handleSelectPO(po);
              }}
            >
              <option value="">
                {supplierCode ? 'Select a PO…' : 'Select a supplier first'}
              </option>
              {isLoadingPOs && <option disabled>Loading POs…</option>}
              {openPOs.map((po) => (
                <option key={po.po_number} value={po.po_number}>
                  {po.po_number} — {po.items.length} FG item(s)
                </option>
              ))}
            </select>
            {supplierCode && !isLoadingPOs && openPOs.length === 0 && poDropdownOpen && (
              <p className="mt-1 text-xs text-muted-foreground">
                No open finished-goods POs for this supplier.
              </p>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Item Code</th>
                  <th className="p-2 text-left font-medium">Item Name</th>
                  <th className="p-2 text-right font-medium">Rate</th>
                  <th className="p-2 text-right font-medium">Ordered</th>
                  <th className="p-2 text-right font-medium">Remaining</th>
                  <th className="p-2 text-right font-medium">Received Now</th>
                  <th className="p-2 text-left font-medium">UOM</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.line_num} className="border-t">
                    <td className="p-2 whitespace-nowrap font-medium">{it.po_item_code}</td>
                    <td className="p-2">{it.item_name}</td>
                    <td className="p-2 text-right">{it.rate.toFixed(2)}</td>
                    <td className="p-2 text-right">{it.ordered_qty}</td>
                    <td className="p-2 text-right">
                      {it.remaining_initial === null ? '—' : it.remaining_initial}
                    </td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max={
                          overReceiptCeiling(it.remaining_initial, overReceiptEnforced) ??
                          undefined
                        }
                        className="w-28 text-right"
                        value={it.received_now || ''}
                        onChange={(e) => handleReceivedChange(it.line_num, e.target.value)}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{it.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StepFooter
        onPrevious={() =>
          navigate(`${FINISHED_GOODS_FLOW.routePrefix}/edit/${entryIdNumber}/step1`)
        }
        onCancel={() => navigate(FINISHED_GOODS_FLOW.routePrefix)}
        onNext={handleNext}
        isSaving={isSaving}
        isEditMode={isEditMode}
      />
    </div>
  );
}
