/**
 * Issue components to a released SAP production order (InventoryGenExits
 * against the order's lines), as SAP Portal's Issue page did.
 *
 * Each line starts at what is still to issue; set it to 0 to leave it out.
 * A batch-managed component needs its batches, which must add up to the line —
 * the server refuses otherwise, and "Fill oldest first" allocates the way SAP's
 * own FIFO would.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import type { SapOrderDetail, SapOrderLine } from '../api/sapOrders.api';
import { useComponentBatches, useIssueToSapOrder } from '../api/sapOrders.queries';
import { batchesMatch, qty, remaining } from '../utils/format';
import { postToSap } from '../utils/postToSap';

interface LineDraft {
  quantity: string;
  batches: Record<string, string>;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function IssueDialog({
  order,
  open,
  onOpenChange,
}: {
  order: SapOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <IssueForm order={order} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BatchPicker({
  line,
  quantity,
  value,
  onChange,
}: {
  line: SapOrderLine;
  quantity: number;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const batches = useComponentBatches(line.item_code, line.warehouse, true);
  const rows = batches.data ?? [];

  const fillOldestFirst = () => {
    let left = quantity;
    const next: Record<string, string> = {};
    for (const batch of rows) {
      if (left <= 0) break;
      const take = Math.min(batch.quantity, left);
      next[batch.batch_number] = String(Math.round(take * 1e6) / 1e6);
      left -= take;
    }
    onChange(next);
  };

  if (batches.isLoading) return <p className="text-xs text-muted-foreground">Loading batches…</p>;
  if (rows.length === 0) {
    return <p className="text-xs text-destructive">No stock in any batch of {line.item_code} at {line.warehouse}.</p>;
  }
  return (
    <div className="space-y-1.5 rounded-md border bg-muted/30 p-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Batches at {line.warehouse}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={fillOldestFirst}>
          Fill oldest first
        </Button>
      </div>
      {rows.map((batch) => (
        <div key={batch.batch_number} className="flex items-center gap-2 text-xs">
          <span className="w-40 truncate font-medium">{batch.batch_number}</span>
          <span className="w-24 tabular-nums text-muted-foreground">{qty(batch.quantity)} in stock</span>
          <Input
            aria-label={`Quantity from batch ${batch.batch_number}`}
            inputMode="decimal"
            value={value[batch.batch_number] ?? ''}
            onChange={(e) => onChange({ ...value, [batch.batch_number]: e.target.value })}
            className="h-7 w-28 text-right tabular-nums"
          />
        </div>
      ))}
    </div>
  );
}

function IssueForm({ order, onDone }: { order: SapOrderDetail; onDone: () => void }) {
  const issue = useIssueToSapOrder(order.doc_entry);
  const [postingDate, setPostingDate] = useState(todayIso());
  const [remarks, setRemarks] = useState('');
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>(() =>
    Object.fromEntries(
      order.lines.map((line) => [
        line.line_num,
        { quantity: String(remaining(line.planned_quantity, line.issued_quantity)), batches: {} },
      ]),
    ),
  );

  const chosen = useMemo(
    () => order.lines.filter((line) => Number(drafts[line.line_num]?.quantity) > 0),
    [order.lines, drafts],
  );

  const error = useMemo(() => {
    if (chosen.length === 0) return 'Enter a quantity on at least one line.';
    for (const line of order.lines) {
      const text = drafts[line.line_num]?.quantity ?? '';
      if (text !== '' && (Number.isNaN(Number(text)) || Number(text) < 0)) return `Line ${line.line_num}: not a quantity.`;
    }
    for (const line of chosen) {
      if (!line.batch_managed) continue;
      const draft = drafts[line.line_num];
      const batches = Object.values(draft.batches).map((quantity) => ({ quantity }));
      if (!batchesMatch(Number(draft.quantity), batches)) {
        return `${line.item_code}: the batches must add up to ${draft.quantity}.`;
      }
    }
    return null;
  }, [chosen, drafts, order.lines]);

  const setDraft = (lineNum: number, patch: Partial<LineDraft>) =>
    setDrafts((current) => ({ ...current, [lineNum]: { ...current[lineNum], ...patch } }));

  const submit = async () => {
    if (error) return;
    const ok = await confirmSapPost({
      title: `Issue to production order ${order.doc_num ?? order.doc_entry} in SAP?`,
      details: [
        { label: 'Product', value: `${order.item_code} — ${order.item_name}` },
        { label: 'Lines', value: chosen.map((line) => `${line.item_code} × ${drafts[line.line_num].quantity}`).join(', ') },
        { label: 'Posting date', value: postingDate },
      ],
      confirmLabel: 'Issue in SAP',
    });
    if (!ok) return;
    const result = await postToSap((confirmRepeat) =>
      issue.mutateAsync({
        lines: chosen.map((line) => {
          const draft = drafts[line.line_num];
          return {
            line_num: line.line_num,
            quantity: draft.quantity,
            ...(line.batch_managed
              ? {
                  batches: Object.entries(draft.batches)
                    .filter(([, quantity]) => Number(quantity) > 0)
                    .map(([batch_number, quantity]) => ({ batch_number, quantity })),
                }
              : {}),
          };
        }),
        posting_date: postingDate || undefined,
        remarks: remarks || undefined,
        confirm_repeat: confirmRepeat,
      }),
    );
    if (!result) return;
    if (result.pending_approval) toast.info(`SAP is holding the issue for approval (draft ${result.draft_entry}).`);
    else toast.success(`Issue ${result.doc_num ?? result.doc_entry} posted in SAP`);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Issue for production — order {order.doc_num ?? order.doc_entry}</DialogTitle>
        <DialogDescription>
          {order.item_code} — {order.item_name}. Each line starts at what is still to issue; set 0 to leave it out.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Component</th>
                <th className="px-3 py-2 text-right font-medium">Planned</th>
                <th className="px-3 py-2 text-right font-medium">Issued</th>
                <th className="px-3 py-2 text-left font-medium">Issue now</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => {
                const draft = drafts[line.line_num];
                const quantity = Number(draft?.quantity) || 0;
                return (
                  <tr key={line.line_num} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {line.item_code}
                        {line.is_resource && <span className="ml-1 text-xs text-muted-foreground">(resource)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {line.item_name} · {line.warehouse || 'no warehouse'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {qty(line.planned_quantity)} {line.uom}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{qty(line.issued_quantity)}</td>
                    <td className="space-y-2 px-3 py-2">
                      <Input
                        aria-label={`Quantity to issue of ${line.item_code}`}
                        inputMode="decimal"
                        value={draft?.quantity ?? ''}
                        onChange={(e) => setDraft(line.line_num, { quantity: e.target.value })}
                        className="h-8 w-32 text-right tabular-nums"
                      />
                      {line.batch_managed && quantity > 0 && (
                        <BatchPicker
                          line={line}
                          quantity={quantity}
                          value={draft.batches}
                          onChange={(batches) => setDraft(line.line_num, { batches })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="issue-date">Posting date</Label>
            <Input id="issue-date" type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-remarks">Remarks (optional)</Label>
            <Textarea id="issue-remarks" rows={1} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="gap-2 border-t pt-4">
        {error && <p className="mr-auto self-center text-sm text-muted-foreground">{error}</p>}
        <Button variant="outline" onClick={onDone} disabled={issue.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!!error || issue.isPending}>
          {issue.isPending ? 'Posting…' : 'Issue in SAP'}
        </Button>
      </DialogFooter>
    </>
  );
}
