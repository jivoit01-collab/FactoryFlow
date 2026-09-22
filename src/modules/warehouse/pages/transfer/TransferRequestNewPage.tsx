import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
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

import { useCreateTransferRequest, useWarehouseScope, useWMSWarehouses } from '../../api';
import type { TransferRequestLineInput, WarehouseStockItem } from '../../types';
import { ItemPicker } from './ItemPicker';
import { QuantityInput } from './QuantityInput';
import { isWholeUnit, qty } from './transferFormat';

interface DraftLine extends TransferRequestLineInput {
  key: string;
  /** What the source warehouse held when the item was picked — SAP's Qty in Whse. */
  onHand?: number;
  /** Held by this app's own open requests: the only thing netted off on hand. */
  appReserved?: number;
  /** `onHand` minus `appReserved` — the number safe to promise. May be negative. */
  freeToMove?: number;
  /** SAP's own IsCommited, shown as context and never subtracted. */
  committed?: number;
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
  const warehouses = useMemo(() => warehouseData?.warehouses ?? [], [warehouseData]);

  // Only a warehouse's own manager may send its stock out, so the source list is
  // narrowed to theirs rather than letting them pick one the server will refuse.
  // The destination stays open: they are asking another warehouse to accept, and
  // that warehouse's manager is the one who decides.
  const scope = useWarehouseScope();
  const sourceWarehouses = useMemo(
    () => (scope.unrestricted ? warehouses : warehouses.filter((w) => scope.manages(w.code))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.unrestricted, scope.codes, warehouses],
  );
  // Only when the scope is KNOWN and genuinely empty. An unreachable endpoint
  // must not tell people to go and see an administrator.
  const noSourceWarehouse = scope.managesNothing;
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
    const confirmed = await confirmSapPost({
      title: 'Raise this request in SAP?',
      details: [
        { label: 'Creates', value: 'Inventory Transfer Request' },
        { label: 'From', value: fromWarehouse },
        { label: 'To', value: toWarehouse },
        { label: 'Lines', value: filledLines.length },
      ],
      confirmLabel: 'Raise the request',
    });
    if (!confirmed) return;
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
      navigate(`/warehouse/inventory-transfer/${created.id}`);
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
        <Button variant="outline" onClick={() => navigate('/warehouse/inventory-transfer')}>
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
                disabled={warehousesLoading || noSourceWarehouse}
              >
                <option value="">
                  {noSourceWarehouse ? 'No warehouse assigned to you' : 'Select a warehouse…'}
                </option>
                {sourceWarehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
              {noSourceWarehouse && (
                <p className="text-sm text-red-600">
                  You are not set as the manager of any warehouse in this company, so you
                  cannot raise a transfer. An administrator assigns this on Admin →
                  Warehouse Managers.
                </p>
              )}
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

          {/* Headers only from `sm` up, where the row is actually a grid. The
              in-whse column is SAP's own "Qty in Whse" — what the source
              warehouse holds, before anything promised is netted off — so the
              two figures on a line can be compared against the SAP client. */}
          <div
            className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_auto]"
            aria-hidden="true"
          >
            <span>Item</span>
            <span>Description</span>
            <span>Quantity</span>
            <span>UoM</span>
            <span
              className="text-right"
              title="What SAP holds in the source warehouse right now — its Qty in Whse. Some of it may already be promised to other documents."
            >
              In {fromWarehouse || 'whse'}
            </span>
            <span className="w-9" />
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const requested = Number(line.quantity) || 0;
              const freeToMove = line.freeToMove;
              const overRequested =
                freeToMove !== undefined && requested > 0 && requested > freeToMove;
              const fractionalWholeUnit =
                isWholeUnit(line.uom) && requested > 0 && !Number.isInteger(requested);
              return (
                <div key={line.key} className="space-y-1">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_auto]">
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
                          onHand: item?.on_hand,
                          appReserved: item?.app_reserved,
                          freeToMove: item?.free_to_move,
                          committed: item?.committed,
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
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground sm:hidden">
                        In whse
                      </span>
                      <Input
                        aria-label={`Quantity in ${fromWarehouse || 'the source warehouse'} for line ${index + 1}`}
                        value={line.onHand === undefined ? '' : qty(line.onHand)}
                        readOnly
                        className="bg-muted/40 text-right tabular-nums"
                        placeholder="In whse"
                      />
                    </div>
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

                  {line.item_code && freeToMove !== undefined && (
                    <>
                      <p
                        className={`pl-1 text-xs tabular-nums ${
                          overRequested
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {freeToMove < 0 ? (
                          <>
                            {line.item_code} is over-promised in {fromWarehouse} —{' '}
                            {qty(line.onHand)} in whse, and open requests of your own
                            already claim more than that.
                          </>
                        ) : (
                          <>
                            {qty(freeToMove)} {line.uom} free to move out of {fromWarehouse}
                            {!!line.appReserved && (
                              <>
                                {' '}
                                · {qty(line.appReserved)} of the {qty(line.onHand)} here is
                                held by your other open requests
                              </>
                            )}
                            {requested > 0 && !overRequested && (
                              <> · {qty(freeToMove - requested)} would be left</>
                            )}
                            {overRequested && (
                              <> · asking for {qty(requested - freeToMove)} more than is free</>
                            )}
                          </>
                        )}
                      </p>
                      {/* Said out loud because SAP's own screens show it and the gap
                          would otherwise look like the app losing stock. It is not
                          deducted: a commitment does not stop a transfer. */}
                      {!!line.committed && (
                        <p className="pl-1 text-xs text-muted-foreground tabular-nums">
                          SAP shows {qty(line.committed)} committed here to other documents —
                          a transfer is not blocked by it.
                        </p>
                      )}
                    </>
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
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/warehouse/inventory-transfer')}>
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
