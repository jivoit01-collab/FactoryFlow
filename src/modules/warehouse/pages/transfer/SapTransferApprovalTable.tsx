/**
 * SAP's own approval queue on transfer drafts, shown as a tab on the Transfer
 * Requests page.
 *
 * These are not the app's transfer requests: most were raised straight in the
 * SAP client, and SAP is holding the draft until the one authorizer its
 * approval template names decides it — signing as anybody else is refused with
 * -6006. So every row says who it is waiting on, and Approve/Reject appears
 * only on the rows where the reader's own mapped SAP account (Admin → SAP
 * Identities) IS that authorizer and its password is configured.
 *
 * Rows belonging to other people are listed anyway: knowing a transfer is stuck,
 * and on whom, is the whole point of surfacing SAP's queue here at all.
 */

import { AlertTriangle, CheckCircle2, Clock, KeyRound, UserCheck, XCircle } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Button, Card, CardContent, Textarea } from '@/shared/components/ui';

import { useDecideSapTransferApproval } from '../../api';
import type { SapTransferApproval } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

function StatusChip({ status }: { status: SapTransferApproval['status'] }) {
  if (status === 'APPROVED') {
    return (
      <span className={`${CHIP} bg-green-100 text-green-800`}>
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className={`${CHIP} bg-red-100 text-red-800`}>
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-amber-100 text-amber-800`}>
      <Clock className="h-3 w-3" />
      Awaiting SAP approval
    </span>
  );
}

/** Names the one SAP user the request is waiting on, and where you stand. */
function WaitingOn({ row }: { row: SapTransferApproval }) {
  if (!row.approver_code) {
    return <span className="text-xs text-muted-foreground">SAP names no authorizer</span>;
  }
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{row.approver_code}</span>
        {row.is_mine && (
          <span className={`${CHIP} bg-blue-100 text-blue-800`}>
            <UserCheck className="h-3 w-3" />
            you
          </span>
        )}
      </div>
      {row.approver_name && (
        <div className="text-xs text-muted-foreground">{row.approver_name}</div>
      )}
      {row.is_mine && !row.credentials_configured && (
        <div className="inline-flex items-center gap-1 text-xs text-amber-700">
          <KeyRound className="h-3 w-3" />
          your SAP password is not configured
        </div>
      )}
      {!row.is_mine && row.status === 'PENDING' && (
        <div className="text-xs text-muted-foreground">
          only they can decide it{row.credentials_configured ? '' : ' · no password on file'}
        </div>
      )}
    </div>
  );
}

/** Lines, flagging any the sending warehouse cannot actually cover. */
function Lines({ row }: { row: SapTransferApproval }) {
  if (!row.lines.length) {
    return <span className="text-xs text-muted-foreground">No lines</span>;
  }
  return (
    <div className="space-y-1">
      {row.lines.map((line) => {
        const short =
          line.quantity !== null && line.source_stock !== null && line.source_stock < line.quantity;
        return (
          <div key={line.line_num} className="text-xs">
            <span className="font-mono">{line.item_code}</span>{' '}
            <span className="text-muted-foreground">{line.item_name}</span>
            <span className="tabular-nums"> · {qty(line.quantity ?? 0)}</span>
            {short && (
              <span className="ml-1 inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {line.from_warehouse} holds {qty(line.source_stock ?? 0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SapTransferApprovalTable({
  rows,
  isLoading,
  isError,
}: {
  rows: SapTransferApproval[];
  isLoading: boolean;
  isError: boolean;
}) {
  const decide = useDecideSapTransferApproval();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function run(fn: () => Promise<{ message: string; signed_as: string }>, fallback: string) {
    setError('');
    setDone('');
    try {
      const result = await fn();
      setDone(`${result.message} Signed in SAP as ${result.signed_as}.`);
      setRejectingId(null);
      setReason('');
    } catch (err) {
      setError(apiError(err, fallback));
    }
  }

  const anySignable = rows.some((r) => r.can_decide);
  const pending = rows.filter((r) => r.status === 'PENDING');
  const mine = pending.filter((r) => r.is_mine).length;
  // Mine but unsignable, i.e. my own SAP password is missing — the one case the
  // reader can fix themselves by asking an administrator for their account.
  const myPasswordMissing = pending.some((r) => r.is_mine && !r.credentials_configured);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        SAP is holding these transfer drafts until the authorizer named on each one decides it, and
        it accepts a decision from that person only. So you can act on the{' '}
        <span className="font-medium">{mine} waiting on you</span>
        {pending.length !== mine && `, out of ${pending.length} pending`}. Approving signs the
        decision in SAP as your own account, and the stock moves the moment SAP accepts it.
        {myPasswordMissing && (
          <>
            {' '}
            <span className="font-medium">Your SAP password is not configured on the server</span>,
            so your own rows cannot be signed yet — ask an administrator to add it.
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {done}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading SAP approvals…</p>
          ) : isError ? (
            <p className="p-6 text-sm text-red-600">
              Could not read the SAP approval queue. Try again in a moment.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              SAP is not holding any transfer for approval.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Document</th>
                    <th className="px-4 py-3 text-left font-medium">Route</th>
                    <th className="px-4 py-3 text-left font-medium">Items</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Waiting on</th>
                    <th className="px-4 py-3 text-left font-medium">Raised by</th>
                    <th className="px-4 py-3 text-left font-medium">Raised</th>
                    {anySignable && <th className="px-4 py-3 text-right font-medium">Decision</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Fragment key={row.id}>
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.doc_type_label}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {row.doc_num ? `SAP ${row.doc_num}` : `draft ${row.draft_entry}`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Route from={row.from_warehouse} to={row.to_warehouse} />
                          {row.comments && (
                            <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                              {row.comments}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Lines row={row} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={row.status} />
                          {row.rejection_reason && (
                            <div className="mt-1 max-w-xs text-xs text-red-700">
                              {row.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <WaitingOn row={row} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.created_by || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {shortDate(row.created_at)}
                        </td>
                        {anySignable && (
                          <td className="px-4 py-3 text-right">
                            {row.can_decide ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={decide.isPending}
                                  onClick={() =>
                                    run(
                                      () =>
                                        decide.mutateAsync({
                                          wddCode: row.id,
                                          payload: { status: 'APPROVED' },
                                        }),
                                      'Could not approve this transfer in SAP.',
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={decide.isPending}
                                  onClick={() => {
                                    setRejectingId(rejectingId === row.id ? null : row.id);
                                    setReason('');
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                      {rejectingId === row.id && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={anySignable ? 8 : 7} className="px-4 py-3">
                            <Textarea
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Why is this being rejected? SAP records it against the authorizer."
                              rows={2}
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectingId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={!reason.trim() || decide.isPending}
                                onClick={() =>
                                  run(
                                    () =>
                                      decide.mutateAsync({
                                        wddCode: row.id,
                                        payload: {
                                          status: 'REJECTED',
                                          rejection_reason: reason.trim(),
                                        },
                                      }),
                                    'Could not reject this transfer in SAP.',
                                  )
                                }
                              >
                                {decide.isPending ? 'Rejecting…' : 'Confirm rejection'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
