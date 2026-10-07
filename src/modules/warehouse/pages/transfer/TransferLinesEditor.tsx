import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import type { WarehouseStockItem } from '../../types';
import { ItemPicker } from './ItemPicker';
import { QuantityInput } from './QuantityInput';
import { type DraftLine, newDraftLine } from './transferDraftLines';
import { isWholeUnit, qty } from './transferFormat';
import { TransferLineBatchButton, TransferLineBatchPicker } from './TransferLineBatchPicker';

/**
 * The items card of a transfer request — raising one, or editing one before it
 * is decided. Items are picked from what `warehouse` holds in SAP, with what is
 * free to move beside each, and a batch-tracked item can be pinned to batches;
 * the parent owns the lines.
 */
export function TransferLinesEditor({
  warehouse,
  lines,
  onChange,
  excludeRequest,
}: {
  warehouse: string;
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  /** The request being edited, so its own batch picks are not shown as another's. */
  excludeRequest?: number;
}) {
  // Which lines have their batch panel open, by line key.
  const [batchesOpen, setBatchesOpen] = useState<string[]>([]);
  const setPanel = (key: string, open: boolean) =>
    setBatchesOpen((keys) => (open ? [...keys, key] : keys.filter((k) => k !== key)));

  function updateLine(key: string, patch: Partial<DraftLine>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Items</h3>
          <Button variant="outline" size="sm" onClick={() => onChange([...lines, newDraftLine()])}>
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>

        {/* Headers only from `sm` up, where the row is actually a grid. The
            in-whse column is SAP's own "Qty in Whse" — what the source
            warehouse holds, before anything promised is netted off — so the
            two figures on a line can be compared against the SAP client. */}
        <div
          className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_180px_auto]"
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
            In {warehouse || 'whse'}
          </span>
          <span className="pl-4">Batches</span>
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
                <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_130px_90px_110px_180px_auto]">
                  <ItemPicker
                    warehouse={warehouse}
                    value={line.item_code}
                    inputId={`transfer-item-${line.key}`}
                    ariaLabel={`Item for line ${index + 1}`}
                    onSelect={(item: WarehouseStockItem | null) => {
                      setPanel(line.key, false);
                      updateLine(line.key, {
                        item_code: item?.item_code ?? '',
                        item_name: item?.item_name ?? '',
                        uom: item?.uom ?? '',
                        onHand: item?.on_hand,
                        appReserved: item?.app_reserved,
                        freeToMove: item?.free_to_move,
                        committed: item?.committed,
                        // Another item's batches mean nothing here.
                        isBatchManaged: item?.is_batch_managed,
                        picks: [],
                      });
                    }}
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
                      aria-label={`Quantity in ${warehouse || 'the source warehouse'} for line ${index + 1}`}
                      value={line.onHand === undefined ? '' : qty(line.onHand)}
                      readOnly
                      className="bg-muted/40 text-right tabular-nums"
                      placeholder="In whse"
                    />
                  </div>
                  <TransferLineBatchButton
                    line={line}
                    lineNumber={index + 1}
                    open={batchesOpen.includes(line.key)}
                    onToggle={() => setPanel(line.key, !batchesOpen.includes(line.key))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {fractionalWholeUnit && (
                  <p className="pl-1 text-xs text-red-600">
                    {line.item_code} moves in whole {line.uom} — {requested} is not a whole number.
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
                          {line.item_code} is over-promised in {warehouse} — {qty(line.onHand)} in
                          whse, and open requests of your own already claim more than that.
                        </>
                      ) : (
                        <>
                          {qty(freeToMove)} {line.uom} free to move out of {warehouse}
                          {!!line.appReserved && (
                            <>
                              {' '}
                              · {qty(line.appReserved)} of the {qty(line.onHand)} here is held by
                              your other open requests
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
                        SAP shows {qty(line.committed)} committed here to other documents — a
                        transfer is not blocked by it.
                      </p>
                    )}
                  </>
                )}

                {line.item_code && line.isBatchManaged && (
                  <TransferLineBatchPicker
                    warehouse={warehouse}
                    line={line}
                    open={batchesOpen.includes(line.key)}
                    onClose={() => setPanel(line.key, false)}
                    excludeRequest={excludeRequest}
                    onChange={(picks) => updateLine(line.key, { picks })}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Only where there are batches to speak of: packaging and most raw
            materials are not batch-tracked in SAP, and telling someone moving
            caps that batches are chosen for them only raises the question. */}
        {lines.some((l) => l.item_code && l.isBatchManaged) && (
          <p className="text-xs text-muted-foreground">
            Use <strong className="font-medium text-foreground">Choose batches</strong> on a line
            to send particular batches. Lines left alone take the oldest batches when the transfer
            is posted, and whoever posts it can still change them then.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
