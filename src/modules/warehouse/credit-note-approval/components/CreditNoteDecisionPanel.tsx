/**
 * Approve or reject one credit note, inline under its row.
 *
 * What SAP Portal's credit-note screen asked for before a decision, and the
 * queue now does too:
 *
 * * **Posted duplicates.** When SAP already holds a posted credit note for the
 *   same party and amount, approving this one credits the party twice. The
 *   duplicates are shown before anything is sent, and approving needs an
 *   explicit tick; "Reject as duplicate" is one click. The server refuses on
 *   its own too (409 `DUPLICATE_CREDIT_NOTE`), and if its check finds a
 *   duplicate this panel did not know about, the same tick appears.
 * * **A typed SAP password** when none is stored for the approver. Used for
 *   this one decision, never saved; the field does not autofill.
 * * **A comment** SAP records with the approval.
 *
 * The final "are you sure" is still `confirmSapPost`, as for every SAP write.
 */
import { AlertTriangle, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { confirmSapPost } from '@/shared/components';
import { Button, Checkbox, Input, Label, Textarea } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';

import { useCreditNoteActions, useDecideCreditNoteApproval } from '../api/creditNoteApproval.queries';
import type { CreditNoteApproval, CreditNoteDecisionPayload, PostedDuplicate } from '../types';

/** SAP truncates remarks at 200 and the app appends who decided. */
const COMMENT_MAX = 150;

type Mode = 'approve' | 'reject';

interface ApiErrorBody {
  error?: string;
  code?: string;
  duplicate_of?: PostedDuplicate[];
}

function money(value: string | null, currency: string | null): string {
  if (value === null || value === '') return '—';
  const n = Number(value);
  return Number.isNaN(n) ? value : formatCurrency(n, currency ?? 'INR');
}

function duplicateLabel(d: PostedDuplicate): string {
  return `#${d.doc_num ?? d.doc_entry}${d.doc_date ? ` of ${d.doc_date}` : ''}`;
}

export function CreditNoteDecisionPanel({
  row,
  mode,
  initialReason = '',
  withoutQty,
  onModeChange,
  onCancel,
  onDecided,
}: {
  row: CreditNoteApproval;
  mode: Mode;
  /** A rejection reason to start from ("Reject as duplicate" fills one in). */
  initialReason?: string;
  /** Without Qty Posting chosen in the row's panel; undefined leaves SAP's lines alone. */
  withoutQty: boolean | undefined;
  onModeChange: (mode: Mode, reason?: string) => void;
  onCancel: () => void;
  onDecided: (message: string) => void;
}) {
  const decide = useDecideCreditNoteApproval();
  const actions = useCreditNoteActions(row.id, row.status === 'PENDING');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState(initialReason);
  const [password, setPassword] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [serverDuplicates, setServerDuplicates] = useState<PostedDuplicate[]>([]);
  const [error, setError] = useState('');

  const duplicates = serverDuplicates.length ? serverDuplicates : (actions.data?.posted_duplicates ?? []);
  const passwordRequired = !row.credentials_configured;
  const approving = mode === 'approve';
  const blocked =
    decide.isPending ||
    (passwordRequired && !password) ||
    (approving && duplicates.length > 0 && !confirmDuplicate) ||
    (!approving && !reason.trim());

  async function submit() {
    setError('');
    const confirmed = await confirmSapPost({
      title: approving ? 'Approve this credit note in SAP?' : 'Reject this credit note in SAP?',
      details: [
        { label: 'Document', value: row.doc_type_label },
        { label: 'Party', value: row.party_name },
        { label: 'Amount', value: money(row.total_amount, row.currency) },
        approving && {
          label: 'Stock',
          value: row.moves_stock
            ? row.stock_direction === 'OUT'
              ? 'Leaves the warehouse'
              : 'Comes back into the warehouse'
            : 'No goods move (service)',
        },
        approving &&
          withoutQty !== undefined && {
            label: 'Without Qty Posting',
            value: withoutQty
              ? 'Set on every item line — value only, no stock moves'
              : 'Cleared on every item line — stock moves',
          },
        approving &&
          duplicates.length > 0 && {
            label: 'Already posted',
            value: `As ${duplicates.map(duplicateLabel).join(', ')} — approving anyway`,
          },
        approving && !!comment.trim() && { label: 'Comment', value: comment.trim() },
        !approving && { label: 'Reason', value: reason.trim() },
        { label: 'Recorded', value: 'With your own SAP user' },
      ],
      confirmLabel: approving ? 'Approve in SAP' : 'Reject in SAP',
      destructive: !approving,
    });
    if (!confirmed) return;

    const payload: CreditNoteDecisionPayload = approving
      ? {
          status: 'APPROVED',
          ...(withoutQty !== undefined && { without_qty_posting: withoutQty }),
          ...(comment.trim() && { approval_comment: comment.trim() }),
          ...(duplicates.length > 0 && confirmDuplicate && { confirm_duplicate: true }),
        }
      : { status: 'REJECTED', rejection_reason: reason.trim() };
    if (password) payload.sap_password = password;

    try {
      const result = await decide.mutateAsync({ wddCode: row.id, payload });
      setPassword('');
      onDecided(`${result.message} Signed in SAP as ${result.signed_as}.`);
    } catch (err) {
      const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
      if (body?.code === 'DUPLICATE_CREDIT_NOTE' && body.duplicate_of?.length) {
        // SAP found one this panel had not been shown: ask for the tick.
        setServerDuplicates(body.duplicate_of);
        setConfirmDuplicate(false);
      }
      setError(
        body?.error ??
          (approving ? 'Could not approve this credit note in SAP.' : 'Could not reject this credit note in SAP.'),
      );
    }
  }

  return (
    <div className="space-y-3 border-l-2 border-primary/50 bg-muted/30 px-4 py-3" onClick={(e) => e.stopPropagation()}>
      {approving && duplicates.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            SAP already posted this credit note as {duplicates.map(duplicateLabel).join(', ')}. Approving it
            again credits the same amount twice.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onModeChange('reject', `Duplicate of credit note ${duplicates.map(duplicateLabel).join(', ')}`)
              }
            >
              Reject as duplicate
            </Button>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={confirmDuplicate}
                onCheckedChange={(checked) => setConfirmDuplicate(checked === true)}
                aria-label="This is a separate credit note"
              />
              This really is a separate credit note — approve it anyway
            </label>
          </div>
        </div>
      )}
      {approving && actions.data?.duplicate_check_failed && duplicates.length === 0 && (
        <p className="text-xs text-muted-foreground">
          SAP could not be asked for duplicates just now; it is asked again when you approve.
        </p>
      )}

      {approving ? (
        <div className="space-y-1.5">
          <Label htmlFor={`cn-comment-${row.id}`}>Comment for SAP (optional)</Label>
          <Textarea
            id={`cn-comment-${row.id}`}
            value={comment}
            maxLength={COMMENT_MAX}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything SAP should record with the approval"
            rows={2}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`cn-reason-${row.id}`}>Reason</Label>
          <Textarea
            id={`cn-reason-${row.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being rejected? SAP records it against the authorizer."
            rows={2}
          />
        </div>
      )}

      {passwordRequired && (
        <div className="space-y-1.5">
          <Label htmlFor={`cn-password-${row.id}`} className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Your SAP password (required)
          </Label>
          <Input
            id={`cn-password-${row.id}`}
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your SAP Business One password"
          />
          <p className="text-xs text-muted-foreground">
            No password is stored for you, so SAP needs it for this one decision. It is never saved.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={decide.isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={blocked} variant={approving ? 'default' : 'destructive'}>
          {decide.isPending
            ? approving
              ? 'Approving…'
              : 'Rejecting…'
            : approving
              ? 'Approve in SAP'
              : 'Confirm rejection'}
        </Button>
      </div>
    </div>
  );
}
