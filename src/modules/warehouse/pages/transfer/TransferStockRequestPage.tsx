/**
 * Ask another warehouse for stock.
 *
 * The rest of Inventory Transfer is written from the sending side: the store
 * holding the stock raises the request, and the warehouse it goes to accepts.
 * The production floor needs it the other way round — whoever runs BH-PC has to
 * ask the oil store, BH-LO, for oil. So here the RECEIVING manager raises, and
 * the sending warehouse's manager agrees or refuses, because they are the one
 * handing the stock over. The SAP document is the same inventory transfer
 * request either way; only who may raise and who decides differs.
 */

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

import {
  useCreateTransferRequest,
  useTransferRequests,
  useWarehouseScope,
  useWMSWarehouses,
} from '../../api';
import type { TransferRequestLineInput, WarehouseStockItem } from '../../types';
import { ItemPicker } from './ItemPicker';
import { QuantityInput } from './QuantityInput';
import { ApprovalBadge, PostingBadge, Route } from './TransferBadges';
import { isWholeUnit, qty, shortDate } from './transferFormat';

interface DraftLine extends TransferRequestLineInput {
  key: string;
  /** What the source warehouse held when the item was picked. */
  onHand?: number;
  /** On hand less what this app's own open requests already hold there. */
  freeToMove?: number;
}

let lineSeq = 0;
const newLine = (): DraftLine => ({
  key: `ask-line-${(lineSeq += 1)}`,
  item_code: '',
  quantity: '',
});

const MY_REQUESTS = { mine: '1', raised_by_side: 'RECEIVER' } as const;

export default function TransferStockRequestPage() {
  const navigate = useNavigate();
  const { data: warehouseData, isLoading: warehousesLoading } = useWMSWarehouses();
  const warehouses = useMemo(() => warehouseData?.warehouses ?? [], [warehouseData]);

  // Only the manager of the warehouse the stock comes INTO may ask for it, so
  // that list is narrowed to theirs. The source stays open: its manager is the
  // one who decides.
  const scope = useWarehouseScope();
  const ownWarehouses = useMemo(
    () => (scope.unrestricted ? warehouses : warehouses.filter((w) => scope.manages(w.code))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.unrestricted, scope.codes, warehouses],
  );
  const managesNothing = scope.managesNothing;

  const createRequest = useCreateTransferRequest();
  const myRequests = useTransferRequests(MY_REQUESTS);

  const [intoWarehouse, setIntoWarehouse] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [error, setError] = useState('');

  // One warehouse to receive into is the common case (the floor runs BH-PC);
  // choose it rather than making them pick the only option.
  const into = intoWarehouse || (ownWarehouses.length === 1 ? ownWarehouses[0].code : '');

  const filledLines = useMemo(
    () => lines.filter((l) => l.item_code.trim() && Number(l.quantity) > 0),
    [lines],
  );
  const hasFractionalWholeUnit = filledLines.some(
    (l) => isWholeUnit(l.uom) && !Number.isInteger(Number(l.quantity)),
  );
  const sameWarehouse = !!fromWarehouse && fromWarehouse === into;
  const canSubmit =
    !!into &&
    !!fromWarehouse &&
    !sameWarehouse &&
    filledLines.length > 0 &&
    !hasFractionalWholeUnit;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  // Items are picked from the source's stock, so a new source clears them.
  function changeSource(next: string) {
    setFromWarehouse(next);
    setLines([newLine()]);
  }

  async function submit() {
    setError('');
    const confirmed = await confirmSapPost({
      title: 'Send this request to SAP?',
      details: [
        { label: 'Creates', value: 'Inventory Transfer Request' },
        { label: 'Asking', value: fromWarehouse },
        { label: 'To send to', value: into },
        { label: 'Lines', value: filledLines.length },
      ],
      confirmLabel: 'Send the request',
    });
    if (!confirmed) return;
    try {
      const created = await createRequest.mutateAsync({
        from_warehouse: fromWarehouse,
        to_warehouse: into,
        raised_by_side: 'RECEIVER',
        remarks,
        lines: filledLines.map((line) => ({
          item_code: line.item_code,
          item_name: line.item_name,
          uom: line.uom,
          quantity: Number(line.quantity),
        })),
      });
      navigate(`/warehouse/inventory-transfer/${created.id}`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
          ?.error ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not send the request. Try again in a moment.';
      setError(message);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Request Stock"
        description="Ask another warehouse to send stock to yours. Their manager approves it and posts the transfer."
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/inventory-transfer')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* From on the left, to on the right — the way a move is read. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ask-from">Ask from</Label>
              <NativeSelect
                id="ask-from"
                value={fromWarehouse}
                onChange={(e) => changeSource(e.target.value)}
                disabled={warehousesLoading}
              >
                <option value="">Select a warehouse…</option>
                {warehouses
                  .filter((w) => w.code !== into)
                  .map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} — {w.name}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ask-into">Send to (your warehouse)</Label>
              <NativeSelect
                id="ask-into"
                value={into}
                onChange={(e) => setIntoWarehouse(e.target.value)}
                disabled={warehousesLoading || managesNothing}
              >
                <option value="">
                  {managesNothing ? 'No warehouse assigned to you' : 'Select a warehouse…'}
                </option>
                {ownWarehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </NativeSelect>
              {managesNothing && (
                <p className="text-sm text-red-600">
                  You are not set as the manager of any warehouse in this company, so you cannot ask
                  for stock. An administrator assigns this on Admin → Warehouse Managers.
                </p>
              )}
            </div>
          </div>

          {sameWarehouse && (
            <p className="text-sm text-red-600">
              Source and destination are the same warehouse, so nothing would move.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="ask-remarks">Why (optional)</Label>
            <Textarea
              id="ask-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Oil for tomorrow's run on Line 2"
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

          <div
            className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_auto]"
            aria-hidden="true"
          >
            <span>Item</span>
            <span>Description</span>
            <span>Quantity</span>
            <span>UoM</span>
            <span className="text-right">In {fromWarehouse || 'source'}</span>
            <span className="w-9" />
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const requested = Number(line.quantity) || 0;
              const overRequested =
                line.freeToMove !== undefined && requested > 0 && requested > line.freeToMove;
              const fractional =
                isWholeUnit(line.uom) && requested > 0 && !Number.isInteger(requested);
              return (
                <div key={line.key} className="space-y-1">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_auto]">
                    <ItemPicker
                      warehouse={fromWarehouse}
                      value={line.item_code}
                      inputId={`ask-item-${line.key}`}
                      ariaLabel={`Item for line ${index + 1}`}
                      onSelect={(item: WarehouseStockItem | null) =>
                        updateLine(line.key, {
                          item_code: item?.item_code ?? '',
                          item_name: item?.item_name ?? '',
                          uom: item?.uom ?? '',
                          onHand: item?.on_hand,
                          freeToMove: item?.free_to_move,
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
                    <Input
                      aria-label={`Quantity in ${fromWarehouse || 'the source warehouse'} for line ${index + 1}`}
                      value={line.onHand === undefined ? '' : qty(line.onHand)}
                      readOnly
                      className="bg-muted/40 text-right tabular-nums"
                      placeholder="In whse"
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
                  {fractional && (
                    <p className="pl-1 text-xs text-red-600">
                      {line.item_code} moves in whole {line.uom} — {requested} is not a whole
                      number.
                    </p>
                  )}
                  {line.item_code && line.freeToMove !== undefined && (
                    <p
                      className={`pl-1 text-xs tabular-nums ${
                        overRequested
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {qty(Math.max(0, line.freeToMove))} {line.uom} free in {fromWarehouse}
                      {overRequested && (
                        <> · asking for {qty(requested - line.freeToMove)} more than is free</>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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
          {createRequest.isPending ? 'Sending…' : 'Send request'}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">My requests</h3>
        <Card>
          <CardContent className="p-0">
            {myRequests.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading your requests…</p>
            ) : myRequests.isError ? (
              <p className="p-6 text-sm text-red-600">
                Could not load your requests. Try again in a moment.
              </p>
            ) : !myRequests.data?.length ? (
              <p className="p-6 text-sm text-muted-foreground">
                You have not asked for any stock yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Entry</th>
                      <th className="px-4 py-3 text-left font-medium">Route</th>
                      <th className="px-4 py-3 text-left font-medium">Approval</th>
                      <th className="px-4 py-3 text-left font-medium">Stock</th>
                      <th className="px-4 py-3 text-right font-medium">Items</th>
                      <th className="px-4 py-3 text-left font-medium">Asked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.data.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/warehouse/inventory-transfer/${row.id}`)}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-medium">{row.entry_no}</td>
                        <td className="px-4 py-3">
                          <Route from={row.from_warehouse} to={row.to_warehouse} />
                        </td>
                        <td className="px-4 py-3">
                          <ApprovalBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PostingBadge
                            status={row.posting_status}
                            intransitWarehouse={row.intransit_warehouse}
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.line_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {shortDate(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
