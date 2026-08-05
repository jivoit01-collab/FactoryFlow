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
  remaining_initial: number;
  received_now: number;
  uom: string;
  rate: number;
}

const OVER_RECEIPT_TOLERANCE = 1.1;

export default function Step2Page() {
  const navigate = useNavigate();
  const { entryIdNumber, isEditMode } = useEntryId();
  useEntryStepTracker();

  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState<FGItemRow[]>([]);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: existingReceipts, isLoading: isLoadingReceipts } = useFGReceipts(
    isEditMode ? entryIdNumber : null,
  );
  const { data: openPOs = [], isLoading: isLoadingPOs } = useOpenFGPOs(
    supplierCode,
    poDropdownOpen,
  );

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
        remaining_initial: Number(it.ordered_qty) || 0,
        received_now: Number(it.received_qty) || 0,
        uom: it.uom,
        rate: Number(it.unit_price) || 0,
      })),
    );
  }, [existingReceipts]);

  const handleSelectPO = (po: PurchaseOrder) => {
    setPoNumber(po.po_number);
    setPoDropdownOpen(false);
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
    const over = items.find(
      (it) => it.received_now > it.ordered_qty * OVER_RECEIPT_TOLERANCE,
    );
    if (over) {
      setError(
        `Received quantity for ${over.po_item_code} exceeds 110% of the ordered quantity.`,
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
                    <td className="p-2 text-right">{it.remaining_initial}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
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
