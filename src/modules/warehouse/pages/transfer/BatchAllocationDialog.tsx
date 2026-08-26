import { AlertTriangle, RotateCcw, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useAllocationPreview } from '../../api';
import type {
  TransferAllocationLine,
  TransferPostAllocation,
} from '../../types';
import { QuantityInput } from './QuantityInput';
import { qty, shortDate } from './transferFormat';

/** line_num -> batch_number -> the quantity typed against it. */
type Picked = Record<number, Record<string, string>>;

const TOLERANCE = 0.0005;

/** The server's oldest-first proposal, as editable form state. */
function seedFromProposal(lines: TransferAllocationLine[]): Picked {
  const seeded: Picked = {};
  for (const line of lines) {
    if (!line.is_batch_managed) continue;
    seeded[line.line_num] = {};
    for (const proposed of line.proposed) {
      seeded[line.line_num][proposed.BatchNumber] = String(proposed.Quantity);
    }
  }
  return seeded;
}

function lineTotal(picked: Picked, lineNum: number): number {
  return Object.values(picked[lineNum] ?? {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
}

function findProblems(lines: TransferAllocationLine[], picked: Picked): string[] {
  const problems: string[] = [];
  for (const line of lines) {
    if (line.error) {
      problems.push(`${line.item_code}: ${line.error}`);
      continue;
    }
    const total = lineTotal(picked, line.line_num);
    const needed = Number(line.quantity);
    if (Math.abs(total - needed) > TOLERANCE) {
      problems.push(
        `${line.item_code}: batches add up to ${qty(total)}, but ${qty(needed)} is moving.`,
      );
    }
    for (const batch of line.available) {
      const taking = Number(picked[line.line_num]?.[batch.batch_number] ?? 0);
      if (taking > Number(batch.quantity)) {
        problems.push(
          `${line.item_code}: batch ${batch.batch_number} only holds ${qty(batch.quantity)}.`,
        );
      }
    }
  }
  return problems;
}

/**
 * Shows which batches posting will take, and lets the operator change them.
 *
 * Oldest-first is the right default but not always the right answer — a customer
 * may specify a production date, or the floor may want short-dated stock cleared
 * first. Nothing is reserved by opening this; the preview is read-only until
 * Post is pressed.
 *
 * The edited split is *derived* rather than synced into state: `edits` is null
 * until the operator touches something, and the proposal shows through until
 * then. Copying the proposal into state via an effect would cascade renders and
 * would also silently discard edits whenever the preview refetched.
 */
export function BatchAllocationDialog({
  requestId,
  open,
  onOpenChange,
  onConfirm,
  isPosting,
  crossBranch,
}: {
  requestId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (allocations: TransferPostAllocation[]) => void;
  isPosting: boolean;
  crossBranch: boolean;
}) {
  const { data: preview, isLoading, isError } = useAllocationPreview(requestId, open);
  const [edits, setEdits] = useState<Picked | null>(null);

  const batchLines = useMemo(
    () => (preview?.lines ?? []).filter((line) => line.is_batch_managed),
    [preview],
  );
  const seeded = useMemo(() => seedFromProposal(preview?.lines ?? []), [preview]);
  const picked = edits ?? seeded;
  const problems = useMemo(() => findProblems(batchLines, picked), [batchLines, picked]);

  function setBatch(lineNum: number, batchNumber: string, value: string) {
    setEdits((previous) => {
      const base = previous ?? seeded;
      return {
        ...base,
        [lineNum]: { ...(base[lineNum] ?? {}), [batchNumber]: value },
      };
    });
  }

  function close(next: boolean) {
    // Drop edits on close so reopening starts from a fresh proposal.
    if (!next) setEdits(null);
    onOpenChange(next);
  }

  function confirm() {
    onConfirm(
      batchLines.map((line) => ({
        line_num: line.line_num,
        batches: Object.entries(picked[line.line_num] ?? {})
          .filter(([, value]) => Number(value) > 0)
          .map(([batch_number, value]) => ({
            batch_number,
            quantity: Number(value),
          })),
      })),
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose the batches to move</DialogTitle>
          <DialogDescription>
            {crossBranch
              ? 'This is leg 1, into the in-transit warehouse. Oldest batches first unless you change it.'
              : 'Oldest batches first unless you change it. Nothing moves until you post.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Reading batches from SAP…</p>
        ) : isError ? (
          <p className="py-6 text-sm text-red-600">Could not read the batches from SAP.</p>
        ) : (
          <div className="space-y-5">
            {batchLines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing on this request is batch-tracked, so there is nothing to choose.
              </p>
            )}

            {batchLines.map((line) => {
              const total = lineTotal(picked, line.line_num);
              const needed = Number(line.quantity);
              const balanced = Math.abs(total - needed) <= TOLERANCE;
              return (
                <div key={line.line_num} className="rounded-lg border">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{line.item_code}</div>
                      <div className="text-xs text-muted-foreground">{line.item_name}</div>
                    </div>
                    <div
                      className={`text-sm tabular-nums ${
                        balanced ? 'text-muted-foreground' : 'text-amber-700'
                      }`}
                    >
                      {qty(total)} of {qty(needed)} {line.uom} chosen
                    </div>
                  </div>

                  {line.error && (
                    <p className="border-b bg-red-50 px-3 py-2 text-sm text-red-800">
                      {line.error}
                    </p>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Batch</th>
                          <th className="px-3 py-2 text-left font-medium">Received</th>
                          <th className="px-3 py-2 text-left font-medium">Expires</th>
                          <th className="px-3 py-2 text-right font-medium">In warehouse</th>
                          <th className="px-3 py-2 text-right font-medium">Take</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line.available.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                              No released batches of {line.item_code} in {line.from_warehouse}.
                            </td>
                          </tr>
                        ) : (
                          line.available.map((batch) => {
                            const value = picked[line.line_num]?.[batch.batch_number] ?? '';
                            const over = Number(value) > Number(batch.quantity);
                            return (
                              <tr key={batch.batch_number} className="border-t">
                                <td className="px-3 py-2 font-medium">{batch.batch_number}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {shortDate(batch.in_date)}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {shortDate(batch.expiry_date)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {qty(batch.quantity)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <QuantityInput
                                    ariaLabel={`Take from batch ${batch.batch_number}`}
                                    className={`ml-auto w-28 text-right ${
                                      over ? 'border-red-400' : ''
                                    }`}
                                    uom={line.uom}
                                    max={batch.quantity}
                                    value={value}
                                    onChange={(next) =>
                                      setBatch(line.line_num, batch.batch_number, next)
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {problems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul className="space-y-1">
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setEdits(null)} disabled={!edits || isPosting}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Back to oldest first
          </Button>
          <Button variant="outline" onClick={() => close(false)} disabled={isPosting}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={problems.length > 0 || isPosting || isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            {isPosting ? 'Posting…' : 'Post transfer to SAP'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
