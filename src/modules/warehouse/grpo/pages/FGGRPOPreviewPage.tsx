import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { Button, Card, Input } from '@/shared/components/ui';

import { useFGGRPOPreview, usePostFGGRPO } from '../api/fgGrpo.queries';
import { DEFAULT_BRANCH_ID } from '../constants/grpo.constants';
import type { PostGRPOItemRequest, PostGRPOResponse } from '../types';

interface ItemForm {
  accepted_qty: number;
  unit_price: number;
  tax_code: string;
  gl_account: string;
}

export default function FGGRPOPreviewPage() {
  const { vehicleEntryId } = useParams<{ vehicleEntryId: string }>();
  const entryId = vehicleEntryId ? parseInt(vehicleEntryId, 10) : null;
  const navigate = useNavigate();

  const { data: preview = [], isLoading, isError } = useFGGRPOPreview(entryId);
  const postGRPO = usePostFGGRPO();

  const [itemForms, setItemForms] = useState<Record<number, ItemForm>>({});
  const [warehouseCode, setWarehouseCode] = useState('');
  const [vendorRef, setVendorRef] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PostGRPOResponse | null>(null);

  // Only POs not yet posted are actionable. Finished goods are always QC-ready.
  const postablePOs = useMemo(
    () => preview.filter((po) => po.grpo_status !== 'POSTED'),
    [preview],
  );

  // Seed the per-item form (accepted = received, prices from the PO) once loaded.
  useEffect(() => {
    if (postablePOs.length === 0) return;
    const seed: Record<number, ItemForm> = {};
    for (const po of postablePOs) {
      for (const it of po.items) {
        seed[it.po_item_receipt_id] = {
          accepted_qty: Number(it.received_qty) || 0,
          unit_price: Number(it.unit_price) || 0,
          tax_code: it.tax_code || '',
          gl_account: it.gl_account || '',
        };
      }
    }
    setItemForms(seed);
    if (!vendorRef && postablePOs[0]?.vendor_ref) setVendorRef(postablePOs[0].vendor_ref);
    if (!warehouseCode) {
      const whs = postablePOs[0]?.items[0]?.warehouse_code;
      if (whs) setWarehouseCode(whs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postablePOs.length]);

  const updateItem = (id: number, field: keyof ItemForm, value: string) => {
    setItemForms((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: field === 'accepted_qty' || field === 'unit_price' ? Number(value) || 0 : value },
    }));
  };

  const branchId = postablePOs[0]?.branch_id ?? DEFAULT_BRANCH_ID;

  const handlePost = async () => {
    setError(null);
    if (!entryId) return;
    if (postablePOs.length === 0) {
      setError('Nothing to post — all POs are already posted.');
      return;
    }
    if (attachments.length === 0) {
      setError('At least one attachment (e.g. the vendor invoice) is required.');
      return;
    }

    const items: PostGRPOItemRequest[] = [];
    for (const po of postablePOs) {
      for (const it of po.items) {
        const form = itemForms[it.po_item_receipt_id];
        if (!form || form.accepted_qty <= 0) continue;
        items.push({
          po_item_receipt_id: it.po_item_receipt_id,
          accepted_qty: form.accepted_qty,
          unit_price: form.unit_price || undefined,
          tax_code: form.tax_code || undefined,
          gl_account: form.gl_account || undefined,
        });
      }
    }

    if (items.length === 0) {
      setError('Enter an accepted quantity for at least one item.');
      return;
    }

    try {
      const response = await postGRPO.mutateAsync({
        vehicle_entry_id: entryId,
        po_receipt_ids: postablePOs.map((po) => po.po_receipt_id),
        items,
        branch_id: branchId,
        warehouse_code: warehouseCode || undefined,
        vendor_ref: vendorRef || undefined,
        attachments,
      });
      setResult(response);
      toast.success(`GRPO posted — SAP Doc ${response.sap_doc_num}`);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to post GRPO to SAP.');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (isError) return <div className="p-8 text-center text-red-600">Failed to load preview.</div>;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-green-600">GRPO Posted to SAP</h2>
          <p className="text-sm text-muted-foreground">SAP Doc Number</p>
          <p className="mb-4 text-2xl font-bold">{result.sap_doc_num}</p>
          <p className="text-sm text-muted-foreground">Total: {result.sap_doc_total}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate('/warehouse/grpo/fg')}>Back to FG GRPO</Button>
          </div>
        </Card>
      </div>
    );
  }

  const headerPO = preview[0];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Finished Goods GRPO — {headerPO?.entry_no}
        </h2>
        <p className="text-sm text-muted-foreground">
          Review received quantities and post the goods receipt to SAP.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {postablePOs.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          All POs for this entry have already been posted.
        </Card>
      ) : (
        <>
          {postablePOs.map((po) => (
            <Card key={po.po_receipt_id} className="mb-4 p-4">
              <div className="mb-2">
                <h4 className="font-semibold">PO {po.po_number}</h4>
                <p className="text-sm text-muted-foreground">
                  {po.supplier_name} ({po.supplier_code})
                </p>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">Item</th>
                      <th className="p-2 text-right font-medium">Received</th>
                      <th className="p-2 text-right font-medium">Accepted</th>
                      <th className="p-2 text-right font-medium">Unit Price</th>
                      <th className="p-2 text-left font-medium">Tax Code</th>
                      <th className="p-2 text-left font-medium">GL Account</th>
                      <th className="p-2 text-left font-medium">UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((it) => {
                      const form = itemForms[it.po_item_receipt_id];
                      return (
                        <tr key={it.po_item_receipt_id} className="border-t">
                          <td className="p-2">
                            <div className="font-medium">{it.item_code}</div>
                            <div className="text-xs text-muted-foreground">{it.item_name}</div>
                          </td>
                          <td className="p-2 text-right">{it.received_qty}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              className="w-24 text-right"
                              value={form?.accepted_qty ?? ''}
                              onChange={(e) =>
                                updateItem(it.po_item_receipt_id, 'accepted_qty', e.target.value)
                              }
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24 text-right"
                              value={form?.unit_price ?? ''}
                              onChange={(e) =>
                                updateItem(it.po_item_receipt_id, 'unit_price', e.target.value)
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="w-20"
                              value={form?.tax_code ?? ''}
                              onChange={(e) =>
                                updateItem(it.po_item_receipt_id, 'tax_code', e.target.value)
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="w-28"
                              value={form?.gl_account ?? ''}
                              onChange={(e) =>
                                updateItem(it.po_item_receipt_id, 'gl_account', e.target.value)
                              }
                            />
                          </td>
                          <td className="p-2 whitespace-nowrap">{it.uom}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          <Card className="mb-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Warehouse Code</label>
                <Input
                  value={warehouseCode}
                  onChange={(e) => setWarehouseCode(e.target.value)}
                  placeholder="e.g. BH-FG"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Vendor Reference</label>
                <Input value={vendorRef} onChange={(e) => setVendorRef(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Attachments (vendor invoice) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  multiple
                  className="block w-full text-sm"
                  onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/warehouse/grpo/fg')}>
              ← Back
            </Button>
            <Button onClick={handlePost} disabled={postGRPO.isPending}>
              {postGRPO.isPending ? 'Posting to SAP…' : 'Post GRPO to SAP'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
