import { ArrowLeft, ArrowRight, FileCheck2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { StepHeader } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import {
  type GoodsReturnDetail,
  type GoodsReturnItemCondition,
  useGoodsReturn,
  useSaveGoodsReturnItems,
} from '../api';
import { CONDITION_OPTIONS } from '../utils';

interface EditableLine {
  key: string;
  invoice_ref: number | null;
  source_line_num: number | null;
  item_code: string;
  item_name: string;
  uom: string;
  invoice_quantity: number;
  return_quantity: string;
  reason: string;
  condition: GoodsReturnItemCondition;
  manual: boolean;
}

export default function GoodsReturnItemsPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);
  const { data: detail, isLoading } = useGoodsReturn(id);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return <ItemsForm key={detail.id} id={id} detail={detail} />;
}

function buildLines(detail: GoodsReturnDetail): EditableLine[] {
  return detail.lines.map((line, index) => ({
    key: `line-${line.id ?? index}`,
    invoice_ref: line.invoice_ref,
    source_line_num: line.source_line_num,
    item_code: line.item_code,
    item_name: line.item_name,
    uom: line.uom,
    invoice_quantity: Number(line.invoice_quantity) || 0,
    return_quantity: Number(line.return_quantity) > 0 ? String(Number(line.return_quantity)) : '',
    reason: line.reason,
    condition: line.condition,
    manual: line.invoice_ref === null && detail.basis !== 'INVOICE',
  }));
}

function ItemsForm({ id, detail }: { id: number; detail: GoodsReturnDetail }) {
  const navigate = useNavigate();
  const saveItems = useSaveGoodsReturnItems(id);
  const isInvoiceBasis = detail.basis === 'INVOICE';

  const [lines, setLines] = useState<EditableLine[]>(() => buildLines(detail));
  const [error, setError] = useState<string | null>(null);
  const manualCounter = useRef(0);

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addManualLine() {
    manualCounter.current += 1;
    const key = `manual-${manualCounter.current}`;
    setLines((prev) => [
      ...prev,
      {
        key,
        invoice_ref: null,
        source_line_num: null,
        item_code: '',
        item_name: '',
        uom: '',
        invoice_quantity: 0,
        return_quantity: '',
        reason: '',
        condition: 'DAMAGED',
        manual: true,
      },
    ]);
  }

  const returningCount = useMemo(
    () => lines.filter((line) => Number(line.return_quantity) > 0).length,
    [lines],
  );

  async function handleContinue() {
    setError(null);
    const payloadLines = lines
      .filter((line) => Number(line.return_quantity) > 0)
      .map((line) => ({
        invoice_ref_id: line.invoice_ref,
        source_line_num: line.source_line_num,
        item_code: line.item_code.trim(),
        item_name: line.item_name.trim(),
        uom: line.uom.trim(),
        invoice_quantity: line.invoice_quantity,
        return_quantity: Number(line.return_quantity),
        reason: line.reason.trim(),
        condition: line.condition,
      }));

    if (payloadLines.length === 0) {
      setError('Enter a return quantity for at least one item.');
      return;
    }
    for (const line of payloadLines) {
      if (line.invoice_quantity && line.return_quantity > line.invoice_quantity) {
        setError(
          `Return quantity for ${line.item_code || 'an item'} cannot exceed invoice quantity (${line.invoice_quantity}).`,
        );
        return;
      }
      if (!line.item_code && !line.item_name) {
        setError('Every item needs a code or name.');
        return;
      }
    }

    try {
      await saveItems.mutateAsync({ lines: payloadLines });
      navigate(`/goods-return/edit/${id}/vehicle`);
    } catch (err) {
      setError(readError(err));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <StepHeader currentStep={2} totalSteps={3} title="Goods Return" error={error} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {detail.entry_no} · {detail.customer_name || detail.customer_code || 'No customer'}
        </span>
        <span>{returningCount} item(s) returning</span>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck2 className="h-4 w-4" /> Returning Items
            </div>
            {!isInvoiceBasis && (
              <Button size="sm" variant="outline" onClick={addManualLine}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {isInvoiceBasis ? 'No invoice lines found.' : 'Add the items being returned.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Item</th>
                    <th className="px-2 py-2 w-28">Invoice Qty</th>
                    <th className="px-2 py-2 w-28">Return Qty</th>
                    <th className="px-2 py-2 w-40">Reason</th>
                    <th className="px-2 py-2 w-32">Condition</th>
                    {!isInvoiceBasis && <th className="px-2 py-2 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b align-top">
                      <td className="px-2 py-2">
                        {line.manual ? (
                          <div className="space-y-1">
                            <Input
                              value={line.item_code}
                              onChange={(event) => updateLine(line.key, { item_code: event.target.value })}
                              placeholder="Item code"
                              className="h-8"
                            />
                            <Input
                              value={line.item_name}
                              onChange={(event) => updateLine(line.key, { item_name: event.target.value })}
                              placeholder="Item name"
                              className="h-8"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{line.item_name || line.item_code}</p>
                            <p className="text-xs text-muted-foreground">{line.item_code}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {line.manual ? (
                          <Input
                            value={line.uom}
                            onChange={(event) => updateLine(line.key, { uom: event.target.value })}
                            placeholder="UOM"
                            className="h-8"
                          />
                        ) : (
                          <span>
                            {line.invoice_quantity} {line.uom}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          max={line.invoice_quantity || undefined}
                          value={line.return_quantity}
                          onChange={(event) => updateLine(line.key, { return_quantity: event.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={line.reason}
                          onChange={(event) => updateLine(line.key, { reason: event.target.value })}
                          placeholder="Damaged, shortage…"
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={line.condition}
                          onChange={(event) =>
                            updateLine(line.key, {
                              condition: event.target.value as GoodsReturnItemCondition,
                            })
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {CONDITION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      {!isInvoiceBasis && (
                        <td className="px-2 py-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/goods-return/edit/${id}/details`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleContinue} disabled={saveItems.isPending}>
          {saveItems.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}

function readError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || 'Could not save the items.';
}
