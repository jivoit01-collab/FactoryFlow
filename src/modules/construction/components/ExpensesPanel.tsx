/**
 * The project's spending, and where it has got to with the approver.
 *
 * Written to be read by a site manager who has not been told how the module
 * works. An earlier version of this screen said "Batch 1 · Collecting · 1 line"
 * and put an "open" chip on every row: all true, none of it meaningful to
 * somebody who just wants to know whether their cement bill has been signed off.
 *
 * So: no "batch", no "line", no state names. The card says what has happened
 * and what to do next, and the total appears once.
 */
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';

import { useDeleteExpense, useExpenseBatches, useSubmitBatch } from '../api';
import type { Expense } from '../types';
import { formatMoney, formatShortDate } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { ExpenseTable } from './ExpenseTable';
import { RecordPaymentDialog } from './RecordPaymentDialog';

export function ExpensesPanel({
  projectId,
  canSpend,
  picked,
  onPickedChange,
  adding,
  onAddingChange,
  sending,
  onSendingChange,
}: {
  projectId: number;
  canSpend: boolean;
  /**
   * Selection and the two dialogs are driven from the project page, because
   * the buttons that act on them now sit up in the tab row beside the tabs —
   * where an action belongs when it applies to a whole tab rather than to a
   * row in it.
   */
  picked: number[];
  onPickedChange: (ids: number[]) => void;
  adding: boolean;
  onAddingChange: (open: boolean) => void;
  sending: boolean;
  onSendingChange: (open: boolean) => void;
}) {
  const { data: batchData } = useExpenseBatches(projectId);
  const remove = useDeleteExpense(projectId);
  const submit = useSubmitBatch(projectId);

  // Deleting a payment somebody recorded from a site cannot be undone, so it
  // asks first.
  const [removing, setRemoving] = useState<{ id: number; label: string } | null>(null);
  // The row opens the same form it was written in. Only while the batch is
  // still the site's to change — an approved payment is settled.
  const [editing, setEditing] = useState<Expense | null>(null);

  const open = batchData?.open ?? null;
  const pickedTotal =
    open?.expenses
      .filter((expense) => picked.includes(expense.id))
      .reduce((sum, expense) => sum + Number(expense.amount), 0) ?? 0;
  const approvedTotal =
    batchData?.batches
      .filter((batch) => batch.status === 'APPROVED')
      .reduce((sum, batch) => sum + Number(batch.total), 0) ?? 0;

  const waiting = open?.status === 'SUBMITTED';
  const sentBack = open?.status === 'RETURNED';

  return (
    <div className="space-y-3">
      {/*
        The status card that used to sit here is gone: it announced "Not sent
        for approval yet" above a table whose own Approval column already says
        so on every row, and repeated the selected total that the Send button
        now carries.

        What it said that nothing else does is kept — the approver's reason for
        sending payments back, and the fact that a batch under review cannot be
        touched. Neither is visible anywhere else, and losing the first would
        leave the site unable to find out what it was asked to fix.
      */}
      {open && open.line_count > 0 && sentBack && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Your approver sent these back
          </p>
          {open.decision_note && (
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              “{open.decision_note}” — {open.decided_by_name ?? 'your approver'}
            </p>
          )}
          <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
            Fix what they asked about, then send them again.
          </p>
        </div>
      )}

      {open && open.line_count > 0 && waiting && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          {formatMoney(open.total)} across {open.line_count} payment
          {open.line_count === 1 ? '' : 's'} is with your approver
          {open.submitted_at ? `, sent ${formatShortDate(open.submitted_at)}` : ''}. Nothing
          here can be changed until they decide.
        </p>
      )}

      {open && open.line_count === 0 && approvedTotal > 0 && (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Everything spent so far has been approved.
        </p>
      )}

      {!open && approvedTotal > 0 && (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Everything spent so far has been approved — {formatMoney(String(approvedTotal))}.
        </p>
      )}

      {/* ---- everything spent ---- */}
      <ExpenseTable
        projectId={projectId}
        canSpend={canSpend}
        selected={picked}
        onSelectedChange={onPickedChange}
        onEdit={setEditing}
        onRemove={(expense) =>
          setRemoving({
            id: expense.id,
            label: `${expense.description} — ${formatMoney(expense.amount)}`,
          })
        }
      />

      {sending && open && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && onSendingChange(false)}
          tone="default"
          title={`Send ${picked.length} payment${picked.length === 1 ? '' : 's'} for approval?`}
          description={
            picked.length < open.line_count
              ? `${formatMoney(String(pickedTotal))} goes to your approver. The ${
                  open.line_count - picked.length
                } you left unticked stay here and can be sent later. Nothing sent can be changed until they decide.`
              : `${formatMoney(
                  String(pickedTotal),
                )}. You will not be able to change or remove any of them until your approver decides.`
          }
          confirmLabel="Send for approval"
          successMessage="Sent to your approver"
          errorMessage="Could not send these for approval."
          onConfirm={async () => {
            await submit.mutateAsync(picked);
            onPickedChange([]);
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setRemoving(null)}
          title="Remove this payment?"
          description={`${removing.label}. It comes off the project's spend. This cannot be undone.`}
          confirmLabel="Remove payment"
          successMessage="Payment removed"
          errorMessage="Could not remove the payment."
          onConfirm={() => remove.mutateAsync(removing.id)}
        />
      )}

      <RecordPaymentDialog
        projectId={projectId}
        open={adding}
        onOpenChange={onAddingChange}
        batchNo={open?.batch_no}
        batchTotal={open?.total}
      />

      <RecordPaymentDialog
        projectId={projectId}
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
        expense={editing}
      />
    </div>
  );
}
