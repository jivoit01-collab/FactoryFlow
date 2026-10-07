import { ChevronDown, Layers } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { useItemBatches } from '../../api';
import { QuantityInput } from './QuantityInput';
import {
  type DraftBatch,
  type DraftLine,
  pickedBatches,
  pickedTotal,
  withPick,
} from './transferDraftLines';
import { qty, shortDate } from './transferFormat';

const TOLERANCE = 0.0005;

function isBalanced(line: DraftLine): boolean {
  return Math.abs(pickedTotal(line) - (Number(line.quantity) || 0)) <= TOLERANCE;
}

/**
 * The line's own Batches cell: a button in the row, beside the quantity.
 *
 * It sits in the row rather than in the notes under it because that is where
 * people look — a link among three lines of small print went unnoticed. A line
 * whose item SAP does not batch-track says so in the same place, so the empty
 * cell is not mistaken for a missing button.
 */
export function TransferLineBatchButton({
  line,
  lineNumber,
  open,
  onToggle,
}: {
  line: DraftLine;
  lineNumber: number;
  open: boolean;
  onToggle: () => void;
}) {
  if (!line.item_code) return <div className="hidden sm:block" />;
  if (!line.isBatchManaged) {
    return (
      <div className="flex h-10 items-center px-1 text-xs text-muted-foreground">
        not batch-tracked
      </div>
    );
  }

  const count = pickedBatches(line).length;
  const label = count ? `${count} ${count === 1 ? 'batch' : 'batches'} picked` : 'Choose batches';
  const tone = !count
    ? ''
    : isBalanced(line)
      ? 'border-primary text-primary'
      : 'border-amber-500 text-amber-700 dark:text-amber-400';
  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full justify-start ${tone} ${open ? 'bg-muted' : ''}`}
      aria-expanded={open}
      aria-label={`${label} for line ${lineNumber}`}
      onClick={onToggle}
    >
      <Layers aria-hidden="true" />
      {label}
      <ChevronDown
        aria-hidden="true"
        className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </Button>
  );
}

/**
 * Pin one batch-tracked line of a transfer request to particular batches —
 * the panel the row's Batches button opens, and the picks once it is closed.
 *
 * Optional: a line left alone takes the oldest batches when it is posted. The
 * floor picks when it matters — a customer asking for one production date, or
 * the older run going first. The batches are read from SAP only while the panel
 * is open, and the server checks the pick against the shelf again on save.
 *
 * What other open requests have already picked from a batch is shown beside
 * it, not subtracted, the same way the item's free-to-move figure works.
 */
export function TransferLineBatchPicker({
  warehouse,
  line,
  open,
  onClose,
  excludeRequest,
  onChange,
}: {
  warehouse: string;
  line: DraftLine;
  open: boolean;
  onClose: () => void;
  /** The request being edited, so its own picks are not shown as another's. */
  excludeRequest?: number;
  onChange: (picks: DraftBatch[]) => void;
}) {
  const { data, isLoading, isError } = useItemBatches(warehouse, line.item_code, {
    enabled: open,
    excludeRequest,
  });

  const picked = pickedBatches(line);
  const total = pickedTotal(line);
  const wanted = Number(line.quantity) || 0;
  const balanced = isBalanced(line);
  // SAP's batch window counts down a "Total Needed"; the floor reads it that way.
  const gap =
    total < wanted
      ? `${qty(wanted - total)} still needed`
      : `${qty(total - wanted)} more than the line`;
  const shelf = data?.batches ?? [];
  const shelfOrder = shelf.map((b) => b.batch_number);
  // A pick saved earlier whose batch has since left the shelf still gets a row,
  // so it can be seen and cleared rather than silently sent.
  const gone = (line.picks ?? []).filter((b) => !shelfOrder.includes(b.batch_number));
  const typed = (batchNumber: string) =>
    line.picks?.find((b) => b.batch_number === batchNumber)?.quantity ?? '';
  const setTake = (batchNumber: string, value: string) =>
    onChange(withPick(line.picks ?? [], shelfOrder, batchNumber, value));

  return (
    <div className="pl-1 text-xs">
      {!open && picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>
            Batches:{' '}
            {picked.map((b, i) => (
              <span key={b.batch_number}>
                {i > 0 && ' · '}
                <span className="font-medium">{b.batch_number}</span> × {qty(b.quantity)}
              </span>
            ))}
          </span>
        </div>
      )}

      {!open && picked.length > 0 && !balanced && (
        <p className="mt-1 text-amber-700 tabular-nums dark:text-amber-400">
          The batches picked add up to {qty(total)} of the {qty(wanted)} {line.uom} asked for —{' '}
          {gap}.
        </p>
      )}

      {open && (
        <div className="mt-2 rounded-lg border">
          {isLoading ? (
            <p className="px-3 py-3 text-muted-foreground">Reading batches from SAP…</p>
          ) : isError ? (
            <p className="px-3 py-3 text-red-600">Could not read the batches from SAP.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Batch</th>
                    <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Made</th>
                    <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                      Expires
                    </th>
                    <th className="px-3 py-2 text-right font-medium">In {warehouse}</th>
                    <th className="px-3 py-2 text-right font-medium">Take</th>
                  </tr>
                </thead>
                <tbody>
                  {shelf.length === 0 && gone.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                        No released batches of {line.item_code} in {warehouse}.
                      </td>
                    </tr>
                  )}
                  {shelf.map((batch) => {
                    const value = typed(batch.batch_number);
                    const over = Number(value) > Number(batch.quantity);
                    return (
                      <tr key={batch.batch_number} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{batch.batch_number}</div>
                          {/* The date columns fold in here on a phone. */}
                          <div className="text-xs text-muted-foreground sm:hidden">
                            Made {shortDate(batch.production_date || batch.in_date)} · expires{' '}
                            {shortDate(batch.expiry_date)}
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                          {shortDate(batch.production_date || batch.in_date)}
                        </td>
                        <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                          {shortDate(batch.expiry_date)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {qty(batch.quantity)}
                          {Number(batch.held_by_requests) > 0 && (
                            <div className="text-xs text-amber-700 dark:text-amber-400">
                              {qty(batch.held_by_requests)} picked by other requests
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <QuantityInput
                            ariaLabel={`Take from batch ${batch.batch_number}`}
                            className={`ml-auto w-28 text-right ${over ? 'border-red-400' : ''}`}
                            uom={line.uom}
                            max={batch.quantity}
                            value={value}
                            onChange={(next) => setTake(batch.batch_number, next)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {gone.map((batch) => (
                    <tr key={batch.batch_number} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{batch.batch_number}</div>
                        <div className="text-xs text-red-600">No longer in {warehouse}</div>
                      </td>
                      <td colSpan={2} className="hidden sm:table-cell" />
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">0</td>
                      <td className="px-3 py-2 text-right">
                        <QuantityInput
                          ariaLabel={`Take from batch ${batch.batch_number}`}
                          className="ml-auto w-28 border-red-400 text-right"
                          uom={line.uom}
                          value={batch.quantity}
                          onChange={(next) => setTake(batch.batch_number, next)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
            <span
              className={`tabular-nums ${
                !picked.length || balanced
                  ? 'text-muted-foreground'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {qty(total)} of {qty(wanted)} {line.uom} picked
              {picked.length > 0 && !balanced && <> · {gap}</>}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                disabled={!line.picks?.length}
              >
                Back to oldest first
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
