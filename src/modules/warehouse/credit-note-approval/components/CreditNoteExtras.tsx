/**
 * The two things SAP Portal's credit-note screen offered that the queue had
 * not: SAP's "Without Qty Posting" when approving, and a withdraw for the
 * person who raised the request.
 *
 * Both depend on facts the queue's rows do not carry (who raised it, whether
 * it is still a draft, its item lines' flags), so they are read from
 * `credit-note-approvals/<id>/actions/` when a pending row is opened, and shown
 * only where the server says they apply.
 *
 * Without Qty Posting is a choice held by the table and sent with Approve —
 * only when it differs from what SAP holds, as the portal did, so an untouched
 * mixed credit note keeps SAP's per-line settings.
 */
import { PackageX, Undo2 } from 'lucide-react';

import { confirmSapPost } from '@/shared/components';
import { Button, Checkbox } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCreditNoteActions, useWithdrawCreditNote } from '../api/creditNoteApproval.queries';
import type { CreditNoteApproval } from '../types';

export function CreditNoteExtras({
  row,
  withoutQty,
  onWithoutQtyChange,
  onResult,
  onError,
}: {
  row: CreditNoteApproval;
  /** The approver's choice, or undefined to leave SAP's settings alone. */
  withoutQty: boolean | undefined;
  onWithoutQtyChange: (value: boolean | undefined) => void;
  onResult: (message: string) => void;
  onError: (message: string) => void;
}) {
  const query = useCreditNoteActions(row.id, row.status === 'PENDING');
  const withdraw = useWithdrawCreditNote();
  const actions = query.data;
  if (!actions) return null;

  const noQty = actions.without_qty_posting;
  const shown = withoutQty ?? noQty.current === true;

  async function onWithdraw() {
    const confirmed = await confirmSapPost({
      title: 'Withdraw this credit note request in SAP?',
      description: 'SAP cancels the approval request. It cannot be undone here.',
      details: [
        { label: 'Document', value: row.doc_type_label },
        { label: 'Party', value: row.party_name },
        { label: 'Approval request', value: row.id },
        { label: 'Recorded', value: 'With your own SAP user' },
      ],
      confirmLabel: 'Withdraw in SAP',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const result = await withdraw.mutateAsync(row.id);
      onResult(`${result.message} Signed in SAP as ${result.signed_as}.`);
    } catch (err) {
      onError(getErrorMessage(err, 'Could not withdraw this credit note in SAP.'));
    }
  }

  if (
    !noQty.can_set &&
    !actions.can_withdraw &&
    !(actions.is_originator && actions.withdraw_note)
  ) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-3 text-xs">
      {noQty.can_set && (
        <label className="flex items-start gap-2">
          <Checkbox
            checked={shown}
            onCheckedChange={(checked) =>
              // Only a change from what SAP holds is sent; ticking back to it clears the choice.
              onWithoutQtyChange(
                checked === (noQty.current === true) && noQty.current !== null
                  ? undefined
                  : checked,
              )
            }
            aria-label="Without Qty Posting"
            className="mt-0.5"
          />
          <span>
            <span className="inline-flex items-center gap-1 font-medium">
              <PackageX className="h-3 w-3" />
              Without Qty Posting
            </span>{' '}
            — credit the amount only and do <span className="font-medium">not</span> move stock (a
            rate difference or discount, not a goods return). Applied to the credit note in SAP when
            you approve.
            {noQty.current === null && withoutQty === undefined && (
              <span className="block text-amber-700 dark:text-amber-400">
                Some item lines are set and some are not; ticking or unticking applies to all{' '}
                {noQty.item_lines}.
              </span>
            )}
          </span>
        </label>
      )}
      {actions.can_withdraw ? (
        <Button size="sm" variant="outline" disabled={withdraw.isPending} onClick={onWithdraw}>
          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          {withdraw.isPending ? 'Withdrawing…' : 'Withdraw request'}
        </Button>
      ) : (
        actions.is_originator &&
        actions.withdraw_note && <p className="text-muted-foreground">{actions.withdraw_note}</p>
      )}
    </div>
  );
}
