import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  Textarea,
} from '@/shared/components/ui';

import { useCreateTransferRequest, useWMSWarehouses } from '../../api';
import type { TransferRequestLineInput, WarehouseStockItem } from '../../types';
import { ItemPicker } from './ItemPicker';
import { QuantityInput } from './QuantityInput';
import { isWholeUnit, qty } from './transferFormat';

interface DraftLine extends TransferRequestLineInput {
  key: string;
  /** Snapshot of what SAP held when the item was picked, for the free-stock hint. */
  available?: number;
  onHand?: number;
}

let lineSeq = 0;
const newLine = (): DraftLine => ({
  key: `line-${(lineSeq += 1)}`,
  item_code: '',
  quantity: '',
});

export default function TransferRequestNewPage() {
  const navigate = useNavigate();
  const { data: warehouseData, isLoading: warehousesLoading } = useWMSWarehouses();
  const warehouses = warehouseData?.warehouses ?? [];
  const createRequest = useCreateTransferRequest();

  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [error, setError] = useState('');

  const filledLines = useMemo(
    () => lines.filter((l) => l.item_code.trim() && Number(l.quantity) > 0),
    [lines],
  );
  // A fraction of a discrete unit is refused server-side, so do not let it be
  // submitted — SAP itself would accept 0.993 PCS without complaint.
  const hasFractionalWholeUnit = useMemo(
    () =>
      filledLines.some(
        (l) => isWholeUnit(l.uom) && !Number.isInteger(Number(l.quantity)),
      ),
    [filledLines],
  );

  const sameWarehouse = !!fromWarehouse && fromWarehouse === toWarehouse;
  const canSubmit =
    !!fromWarehouse &&
    !!toWarehouse &&
    !sameWarehouse &&
    filledLines.length > 0 &&
    !hasFractionalWholeUnit;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  // Items are picked from a specific warehouse's stock, so changing the source
  // invalidates every line — keeping them would show another warehouse's
  // free-stock figures against these items.
  function changeSource(next: string) {
    setFromWarehouse(next);
    setLines([newLine()]);
  }

  async function submit() {
    setError('');
    try {
      const created = await createRequest.mutateAsync({
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        remarks,
        lines: filledLines.map((line) => ({
          item_code: line.item_code,
          item_name: line.item_name,
          uom: line.uom,
          from_warehouse: line.from_warehouse,
          to_warehouse: line.to_warehouse,
          quantity: Number(line.quantity),
        })),
      });
      navigate(`/warehouse/transfer-requests/${created.id}`);
    } catch (err) {
      // The backend refuses routes SAP would reject and says why, so surface its
      // message verbatim rather than a generic failure.
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not raise the request. Try again in a moment.';
      setError(message);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Raise a Transfer Request"
        description="Ask another warehouse to send you stock. It is reserved while they decide."
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/transfer-requests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-warehouse">Send from</Label>
              <NativeSelect
                id="from-warehouse"
                value={fromWarehouse}
                onChange={(e) => changeSource(e.target.value)}
                disabled={warehousesLoading}
              >
                <option value="">Select a warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-warehouse">Send to</Label>
              <NativeSelect
                id="to-warehouse"
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                disabled={warehousesLoading}
              >
                <option value="">Select a warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {sameWarehouse && (
            <p className="text-sm text-red-600">
              Source and destination are the same warehouse, so nothing would move.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks">Why (optional)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Anything the receiving warehouse should know"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Items</h3>
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const requested = Number(line.quantity) || 0;
              const available = line.available;
              const overRequested =
                available !== undefined && requested > 0 && requested > available;
              const fractionalWholeUnit =
                isWholeUnit(line.uom) && requested > 0 && !Number.isInteger(requested);
              return (
                <div key={line.key} className="space-y-1">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_auto]">
                    <ItemPicker
                      warehouse={fromWarehouse}
                      value={line.item_code}
                      inputId={`transfer-item-${line.key}`}
                      ariaLabel={`Item for line ${index + 1}`}
                      onSelect={(item: WarehouseStockItem | null) =>
                        updateLine(line.key, {
                          item_code: item?.item_code ?? '',
                          item_name: item?.item_name ?? '',
                          uom: item?.uom ?? '',
                          available: item?.available,
                          onHand: item?.on_hand,
                        })
                      }
                    />
                    <Input
                      aria-label={`Description for line ${index + 1}`}
                      placeholder="Description"
                      value={line.item_name ?? ''}
                      readOnly
                      className="bg-muted/40"
                    />
                    <QuantityInput
                      ariaLabel={`Quantity for line ${index + 1}`}
                      placeholder="Quantity"
                      uom={line.uom}
                      value={String(line.quantity)}
                      onChange={(value) => updateLine(line.key, { quantity: value })}
                    />
                    <Input
                      aria-label={`Unit for line ${index + 1}`}
                      value={line.uom ?? ''}
                      readOnly
                      className="bg-muted/40"
                      placeholder="UoM"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {fractionalWholeUnit && (
                    <p className="pl-1 text-xs text-red-600">
                      {line.item_code} moves in whole {line.uom} — {requested} is not a
                      whole number.
                    </p>
                  )}

                  {line.item_code && available !== undefined && (
                    <p
                      className={`pl-1 text-xs tabular-nums ${
                        overRequested ? 'text-amber-700' : 'text-muted-foreground'
                      }`}
                    >
                      {available < 0 ? (
                        <>
                          {line.item_code} is over-committed in {fromWarehouse} —{' '}
                          {qty(line.onHand)} on hand, more than that already promised.
                        </>
                      ) : (
                        <>
                          {qty(available)} {line.uom} free in {fromWarehouse}
                          {requested > 0 && !overRequested && (
                            <> · {qty(available - requested)} would be left</>
                          )}
                          {overRequested && (
                            <> · asking for {qty(requested - available)} more than is free</>
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Batches are chosen automatically, oldest first, when the transfer is posted —
            you do not pick them here.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/warehouse/transfer-requests')}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!canSubmit || createRequest.isPending}>
          <Send className="mr-2 h-4 w-4" />
          {createRequest.isPending ? 'Raising…' : 'Raise request'}
        </Button>
      </div>
    </div>
  );
}
