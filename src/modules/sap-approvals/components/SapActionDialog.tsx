/**
 * Approve, reject or withdraw one SAP approval request.
 *
 * The decision is signed in SAP as the reader's own SAP user — the server has
 * already checked they ARE the stage's authorizer (or the request's originator,
 * to withdraw), and checks again before SAP is called. What this dialog adds:
 *
 * - remarks, required to reject (SAP records them against the authorizer);
 * - an optional SAP password. With one stored on the server it may be left
 *   blank; without one it must be typed. It lives only in this form's state —
 *   the form unmounts when the dialog closes and the field is cleared after
 *   every attempt SAP answered — and is sent only when not blank;
 * - the duplicate lock: approving a document SAP already posted needs an
 *   explicit tick, whether the row said so up front or the server answered 409;
 * - the SAP-post confirmation every write to SAP goes through.
 */
import { AlertTriangle, KeyRound } from 'lucide-react';
import { useState } from 'react';

import type { ApiError } from '@/core/api';
import { confirmSapPost } from '@/shared/components';
import {
  Button,
  Checkbox,
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
import { getErrorMessage } from '@/shared/utils';

import { useSapApprovalActions } from '../api/sap-approvals.queries';
import type { PostedDocument, SapApprovalRequest } from '../types';
import { money, shortDate } from '../utils/format';

export type SapActionMode = 'approve' | 'reject' | 'withdraw';

const TITLES: Record<SapActionMode, string> = {
  approve: 'Approve in SAP',
  reject: 'Reject in SAP',
  withdraw: 'Withdraw this request',
};

function postedLabel(docs: PostedDocument[]): string {
  return docs
    .map((d) => `#${d.doc_num ?? d.doc_entry}${d.doc_date ? ` (${shortDate(d.doc_date)})` : ''}`)
    .join(', ');
}

export function SapActionDialog({
  request,
  mode,
  onClose,
  onDone,
}: {
  request: SapApprovalRequest | null;
  mode: SapActionMode | null;
  onClose: () => void;
  /** Called with SAP's answer once the action is recorded. */
  onDone: (message: string) => void;
}) {
  const open = request !== null && mode !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        {open && (
          <ActionForm
            key={`${request.wdd_code}-${mode}`}
            request={request}
            mode={mode}
            onClose={onClose}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  request,
  mode,
  onClose,
  onDone,
}: {
  request: SapApprovalRequest;
  mode: SapActionMode;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const actions = useSapApprovalActions();
  const [remarks, setRemarks] = useState('');
  const [password, setPassword] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [duplicates, setDuplicates] = useState<PostedDocument[]>(
    mode === 'approve' ? request.posted_duplicates : [],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordRequired = !request.credentials_configured;
  const doc = request.document;
  const otherPending = Math.max(
    0,
    request.pending_request_count - (request.status === 'PENDING' ? 1 : 0),
  );

  async function submit() {
    setError('');
    if (mode === 'reject' && !remarks.trim()) {
      setError('Say why this is being rejected — SAP records it against your user.');
      return;
    }
    if (passwordRequired && !password) {
      setError('Type your SAP password: none is stored on the server for your SAP user.');
      return;
    }
    if (mode === 'approve' && duplicates.length > 0 && !confirmDuplicate) {
      setError('This document is already posted in SAP. Tick the box to approve it anyway.');
      return;
    }

    const confirmed = await confirmSapPost({
      title: `${TITLES[mode]}?`,
      details: [
        { label: 'Request', value: `#${request.wdd_code} · ${request.object_type_label}` },
        doc.party_name ? { label: 'Party', value: doc.party_name } : null,
        doc.total_amount ? { label: 'Amount', value: money(doc.total_amount, doc.currency) } : null,
        mode !== 'withdraw' &&
          otherPending > 0 && {
            label: 'Other approvals',
            value: `${otherPending} more still pending — this alone will not release the document`,
          },
        mode === 'approve' &&
          duplicates.length > 0 && {
            label: 'Already posted',
            value: `${postedLabel(duplicates)} — approving posts it again`,
          },
        mode === 'reject' && { label: 'Reason', value: remarks.trim() },
        {
          label: 'Signed as',
          value: password ? 'Your SAP user, with the password you typed' : 'Your SAP user',
        },
      ],
      confirmLabel: TITLES[mode],
      destructive: mode !== 'approve',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const result =
        mode === 'withdraw'
          ? await actions.withdraw(request.wdd_code, password || undefined)
          : await actions.decide(request.wdd_code, {
              approve: mode === 'approve',
              remarks,
              sapPassword: password || undefined,
              confirmDuplicate: mode === 'approve' && confirmDuplicate,
            });
      setPassword('');
      onDone(`${result.message} Signed in SAP as ${result.signed_as}.`);
    } catch (err) {
      const apiError = err as ApiError;
      const data = apiError.response?.data as
        | { code?: string; duplicate_of?: PostedDocument[] }
        | undefined;
      if (apiError.status === 409 && data?.code === 'DUPLICATE_DOCUMENT') {
        // Keep what was typed: the approver only has to tick and send again.
        setDuplicates(data.duplicate_of ?? []);
        setConfirmDuplicate(false);
      } else {
        setPassword('');
        if (apiError.status === 409) void actions.invalidate();
      }
      setError(getErrorMessage(err, 'SAP did not record this. Try again in a moment.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{TITLES[mode]}</DialogTitle>
        <DialogDescription>
          #{request.wdd_code} · {request.object_type_label}
          {doc.party_name ? ` · ${doc.party_name}` : ''}
          {doc.total_amount ? ` · ${money(doc.total_amount, doc.currency)}` : ''}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {mode !== 'withdraw' && otherPending > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            SAP opened {request.request_count} approval requests on this document and {otherPending}{' '}
            other {otherPending === 1 ? 'is' : 'are'} still pending. Approving this one alone will
            not release it.
          </div>
        )}

        {mode === 'approve' && duplicates.length > 0 && (
          <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This document is already posted in SAP as {postedLabel(duplicates)}. Approving this
                copy would post it a second time — reject it instead unless it really is a separate
                document.
              </span>
            </div>
            <label className="flex items-center gap-2 font-medium">
              <Checkbox
                checked={confirmDuplicate}
                onCheckedChange={setConfirmDuplicate}
                aria-label="Approve anyway"
              />
              It really is a separate document — approve anyway
            </label>
          </div>
        )}

        {mode !== 'withdraw' && (
          <div className="space-y-1.5">
            <Label htmlFor="sap-action-remarks">
              {mode === 'reject' ? 'Reason (required)' : 'Remarks (optional)'}
            </Label>
            <Textarea
              id="sap-action-remarks"
              value={remarks}
              maxLength={150}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                mode === 'reject'
                  ? 'Why is this being rejected? SAP records it against your user.'
                  : 'Anything SAP should record with the approval'
              }
              rows={2}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="sap-action-password" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Your SAP password {passwordRequired ? '(required)' : '(optional)'}
          </Label>
          <Input
            id="sap-action-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              passwordRequired
                ? 'Your SAP Business One password'
                : 'Leave blank to use the password stored for you'
            }
          />
          <p className="text-xs text-muted-foreground">
            Used for this one {mode === 'withdraw' ? 'withdrawal' : 'decision'} and never saved.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={mode === 'approve' ? 'default' : 'destructive'}
          onClick={submit}
          disabled={busy}
        >
          {busy ? 'Sending to SAP…' : TITLES[mode]}
        </Button>
      </DialogFooter>
    </>
  );
}
