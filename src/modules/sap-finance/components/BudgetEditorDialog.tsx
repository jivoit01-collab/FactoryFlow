/**
 * Create or edit one SAP budget: a head (cost dimension 3), an optional
 * sub-budget (dimension 4) and one line per month.
 *
 * Saving goes to SAP immediately, so it asks first (`confirmSapPost`). Editing
 * replaces every line in SAP — a line removed here is removed there — which is
 * what SAP Portal did, and the confirmation says so.
 *
 * The form lives in its own component inside `DialogContent`, which unmounts
 * while the dialog is closed, so each opening starts from the budget it was
 * opened on instead of whatever was typed last time.
 *
 * An existing budget is read afresh from SAP (`useBudget`) before the form is
 * built: the list row the page holds has no lines, and because saving replaces
 * every line, a form built from it would delete all the budget's months.
 */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { type Budget, useBudget, useCostingCodes, useCreateBudget, useUpdateBudget } from '../api';
import {
  blankLine,
  budgetDraftError,
  draftTotal,
  firstMonth,
  type LineDraft,
  toDraft,
  toPayload,
} from '../utils/budgetDraft';
import { money, monthLabel } from '../utils/format';

export function BudgetEditorDialog({
  open,
  budget,
  onOpenChange,
}: {
  open: boolean;
  /** The budget being edited, or null for a new one. */
  budget: Budget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        {budget ? (
          <ExistingBudgetEditor docEntry={budget.doc_entry} onDone={() => onOpenChange(false)} />
        ) : (
          <BudgetEditorForm budget={null} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Waits for SAP's copy of the budget, lines included, then builds the form from it. */
function ExistingBudgetEditor({ docEntry, onDone }: { docEntry: number; onDone: () => void }) {
  const detail = useBudget(docEntry);
  // `isFetchedAfterMount`, not just `data`: a copy cached from an earlier
  // opening may be out of date, and the form keeps whatever it starts from.
  if (detail.data && detail.isFetchedAfterMount) {
    return <BudgetEditorForm budget={detail.data} onDone={onDone} />;
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Budget {docEntry}</DialogTitle>
        <DialogDescription>
          {detail.isError ? 'SAP could not be read, so this budget cannot be edited now.' : 'Reading the budget from SAP…'}
        </DialogDescription>
      </DialogHeader>
      <DialogBody />
      <DialogFooter className="gap-2 border-t pt-4">
        {detail.isError && (
          <Button variant="outline" onClick={() => detail.refetch()}>
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

function BudgetEditorForm({ budget, onDone }: { budget: Budget | null; onDone: () => void }) {
  const heads = useCostingCodes(3);
  const subBudgets = useCostingCodes(4);
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const [draft, setDraft] = useState(() => toDraft(budget));

  const error = budgetDraftError(draft.budget, draft.lines);
  const saving = create.isPending || update.isPending;
  const total = draftTotal(draft.lines);

  const setLines = (lines: (current: LineDraft[]) => LineDraft[]) =>
    setDraft((current) => ({ ...current, lines: lines(current.lines) }));
  const setLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((lines) => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const save = async () => {
    if (error) return;
    const ok = await confirmSapPost({
      title: budget ? `Update budget ${budget.doc_num ?? budget.doc_entry} in SAP?` : 'Create this budget in SAP?',
      description: budget
        ? 'SAP keeps exactly the lines below — any line removed here is deleted in SAP.'
        : undefined,
      details: [
        { label: 'Budget head', value: draft.budget },
        !!draft.subBudget && { label: 'Sub-budget', value: draft.subBudget },
        { label: 'Months', value: `${draft.lines.length}, from ${monthLabel(firstMonth(draft.lines))}` },
        { label: 'Total', value: money(total) },
      ],
      confirmLabel: budget ? 'Update in SAP' : 'Create in SAP',
    });
    if (!ok) return;
    const payload = toPayload(draft);
    if (budget) {
      await update.mutateAsync({ docEntry: budget.doc_entry, payload });
      toast.success('Budget updated in SAP');
    } else {
      await create.mutateAsync(payload);
      toast.success('Budget created in SAP');
    }
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{budget ? `Budget ${budget.doc_num ?? budget.doc_entry}` : 'New budget'}</DialogTitle>
        <DialogDescription>
          A budget head from cost dimension 3, an optional sub-budget from dimension 4, and the amount planned for each month.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="budget-head">Budget head</Label>
            <NativeSelect
              id="budget-head"
              value={draft.budget}
              onChange={(e) => setDraft((current) => ({ ...current, budget: e.target.value }))}
              disabled={heads.isLoading}
            >
              <SelectOption value="">{heads.isLoading ? 'Loading…' : 'Choose…'}</SelectOption>
              {(heads.data ?? []).map((code) => (
                <SelectOption key={code.code} value={code.code}>
                  {code.code} — {code.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-sub">Sub-budget (optional)</Label>
            <NativeSelect
              id="budget-sub"
              value={draft.subBudget}
              onChange={(e) => setDraft((current) => ({ ...current, subBudget: e.target.value }))}
              disabled={subBudgets.isLoading}
            >
              <SelectOption value="">None</SelectOption>
              {(subBudgets.data ?? []).map((code) => (
                <SelectOption key={code.code} value={code.code}>
                  {code.code} — {code.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Fixed amount</th>
                <th className="px-3 py-2 text-right font-medium">Variable amount</th>
                <th className="px-3 py-2 text-left font-medium">Line sub-budget</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line, index) => (
                <tr key={index} className="border-t">
                  <td className="px-3 py-1.5">
                    <Input
                      type="month"
                      aria-label={`Month of line ${index + 1}`}
                      value={line.month}
                      onChange={(e) => setLine(index, { month: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      inputMode="decimal"
                      aria-label={`Fixed amount of line ${index + 1}`}
                      value={line.fixed_amount}
                      onChange={(e) => setLine(index, { fixed_amount: e.target.value })}
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      inputMode="decimal"
                      aria-label={`Variable amount of line ${index + 1}`}
                      value={line.variable_amount}
                      onChange={(e) => setLine(index, { variable_amount: e.target.value })}
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <NativeSelect
                      aria-label={`Sub-budget of line ${index + 1}`}
                      value={line.sub_budget}
                      onChange={(e) => setLine(index, { sub_budget: e.target.value })}
                      className="h-8"
                    >
                      <SelectOption value="">—</SelectOption>
                      {(subBudgets.data ?? []).map((code) => (
                        <SelectOption key={code.code} value={code.code}>
                          {code.code}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => setLines((lines) => lines.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((lines) => [...lines, blankLine()])}>
            <Plus className="mr-1 h-4 w-4" /> Add month
          </Button>
          <span className="text-sm text-muted-foreground">
            Total <span className="font-semibold tabular-nums text-foreground">{money(total)}</span>
          </span>
        </div>
      </DialogBody>

      <DialogFooter className="gap-2 border-t pt-4">
        {error && <p className="mr-auto self-center text-sm text-destructive">{error}</p>}
        <Button variant="outline" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!!error || saving}>
          {saving ? 'Saving…' : budget ? 'Update in SAP' : 'Create in SAP'}
        </Button>
      </DialogFooter>
    </>
  );
}
