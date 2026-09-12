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
 *
 * The same table renders the history — what was approved or rejected, by whom,
 * and what SAP made of it — because the question an operator arrives with
 * ("I approved that, where did it go?") is answered by the row they decided.
 * The number on a pending row cannot answer it: a draft's DocNum is the
 * series' next number as at the save, so several open drafts carry the same
 * one and the add takes whatever is next *then*. The approved row's
 * `posted_doc_num` is the number SAP really gave it, and the only one worth
 * typing into the Awaiting transfer tab — hence the copy button on it.
 *
 * Layout: one line per row, one fact per column. A transfer draft carries a
 * lot that only matters once you are looking at THAT transfer — its item
 * lines, the comments, why a row cannot be posted — and putting any of it in
 * the grid makes every row a different height and the columns unscannable.
 * All of it lives in the expander instead; the grid keeps only what someone
 * scanning the queue needs, plus the one warning that changes a decision
 * (the sending warehouse is short).
 */

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  KeyRound,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Fragment, useState } from 'react';

import { Button, Card, CardContent, Textarea } from '@/shared/components/ui';

import { useDecideSapTransferApproval } from '../../api';
import type { SapApprovalStatus, SapTransferApproval } from '../../types';
import { Route } from './TransferBadges';
import { qty, shortDate } from './transferFormat';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

/**
 * ObjType 1250000001 — an inventory transfer *request*. Approving one clears
 * the request only; the stock does not move until an actual transfer is posted
 * against it, and SAP allows that in several parts (the request stays open,
 * drawing OpenQty down, until it closes). ObjType 67 is the transfer itself,
 * which does move stock on approval.
 */
const OBJ_TRANSFER_REQUEST = '1250000001';

/** A line the sending warehouse cannot currently cover. */
function isShort(line: SapTransferApproval['lines'][number]): boolean {
  return line.quantity !== null && line.source_stock !== null && line.source_stock < line.quantity;
}

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
      Waiting
    </span>
  );
}

/**
 * The posted number, with a copy button — it exists to be pasted into the
 * Awaiting transfer search, and retyping nine digits is how people end up on
 * the wrong document.
 */
function CopyableNumber({ value }: { value: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy this number"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard is unavailable over plain HTTP; the number is on screen.
        }
      }}
      className="group inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums text-green-800 hover:underline"
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3 text-green-700" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
      )}
    </button>
  );
}

/**
 * The identifying number, one line. A decided-and-added row leads with the
 * number SAP really gave the document; everything else leads with the draft
 * entry, because the draft's own DocNum is provisional and shared between open
 * drafts (see the module comment) and must never look like a key.
 */
function DocumentCell({ row }: { row: SapTransferApproval }) {
  return (
    <div className="space-y-0.5">
      <div className="whitespace-nowrap font-medium">{row.doc_type_label}</div>
      {row.posted_doc_num !== null ? (
        <>
          <CopyableNumber value={row.posted_doc_num} />
          <div className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            draft {row.draft_entry}
          </div>
        </>
      ) : (
        <div className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          draft {row.draft_entry}
        </div>
      )}
    </div>
  );
}

/** Who the row is on: the authorizer while pending, the decider afterwards. */
function PersonCell({ row }: { row: SapTransferApproval }) {
  if (row.status !== 'PENDING') {
    if (!row.decided_by && !row.decided_at) {
      return <span className="text-muted-foreground">—</span>;
    }
    return (
      <div className="space-y-0.5">
        <div className="whitespace-nowrap font-medium">{row.decided_by ?? '—'}</div>
        {row.decided_by_name && (
          <div className="truncate text-xs text-muted-foreground">{row.decided_by_name}</div>
        )}
      </div>
    );
  }

  if (!row.approver_code) {
    return <span className="text-xs text-muted-foreground">no authorizer named</span>;
  }
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="font-medium">{row.approver_code}</span>
        {row.is_mine && (
          <span className={`${CHIP} bg-blue-100 text-blue-800`}>
            <UserCheck className="h-3 w-3" />
            you
          </span>
        )}
      </div>
      {row.approver_name && (
        <div className="truncate text-xs text-muted-foreground">{row.approver_name}</div>
      )}
      {row.is_mine && !row.credentials_configured && (
        <div className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-amber-700">
          <KeyRound className="h-3 w-3" />
          no password on file
        </div>
      )}
    </div>
  );
}

/** The item lines in full — only rendered inside an opened row. */
function LineTable({ row }: { row: SapTransferApproval }) {
  if (!row.lines.length) {
    return <p className="text-xs text-muted-foreground">SAP reports no lines on this draft.</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="border-b">
          <th className="py-1.5 pr-3 text-left font-medium">Item</th>
          <th className="py-1.5 pr-3 text-left font-medium">Description</th>
          <th className="py-1.5 pr-3 text-right font-medium">Quantity</th>
          <th className="py-1.5 pr-3 text-right font-medium">
            At {row.from_warehouse || 'source'}
          </th>
        </tr>
      </thead>
      <tbody>
        {row.lines.map((line) => (
          <tr key={line.line_num} className="border-b last:border-0">
            <td className="py-1.5 pr-3 font-mono">{line.item_code}</td>
            <td className="py-1.5 pr-3 text-muted-foreground">{line.item_name}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{qty(line.quantity ?? 0)}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
              {line.source_stock === null ? (
                <span className="text-muted-foreground">—</span>
              ) : isShort(line) ? (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  {qty(line.source_stock)}
                </span>
              ) : (
                qty(line.source_stock)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Everything that only matters once you are looking at this one transfer:
 * the lines, SAP's comments, and where the document stands now. Out of the
 * grid so the grid stays scannable.
 */
function DetailPanel({ row }: { row: SapTransferApproval }) {
  const isRequest = row.obj_type === OBJ_TRANSFER_REQUEST;
  const notes: string[] = [];
  if (isRequest && row.status === 'PENDING') {
    notes.push(
      'Approving clears the request only — the stock moves when a transfer is posted against it, in the Awaiting transfer tab.',
    );
  }
  if (row.posted_doc_num !== null) {
    notes.push(
      isRequest
        ? `SAP added this as request ${row.posted_doc_num}. Search that number in Awaiting transfer to post the stock against it.`
        : `SAP posted this as transfer ${row.posted_doc_num}; the stock has moved.`,
    );
  }
  if (row.status === 'APPROVED' && row.posted_doc_num === null) {
    notes.push(
      isRequest
        ? 'Approved, but SAP has not turned the draft into a request yet, so there is nothing to post against.'
        : `Approved but never added in SAP, so no transfer exists and no stock has moved. It is in the Awaiting transfer tab under draft ${row.draft_entry}.`,
    );
  }

  return (
    <div className="space-y-3 border-l-2 border-primary/30 bg-muted/30 px-4 py-3">
      <LineTable row={row} />

      {row.comments && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">SAP comments:</span> {row.comments}
        </p>
      )}
      {row.rejection_reason && (
        <p className="text-xs text-red-700">
          <span className="font-medium">Rejected because:</span> {row.rejection_reason}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="text-xs text-muted-foreground">
          {note}
        </p>
      ))}
      {row.status === 'PENDING' && !row.is_mine && row.approver_code && (
        <p className="text-xs text-muted-foreground">
          SAP accepts a decision on this one from {row.approver_code} only
          {row.credentials_configured ? '' : ', and the app holds no password for them'}.
        </p>
      )}
    </div>
  );
}

export function SapTransferApprovalTable({
  rows,
  isLoading,
  isError,
  view = 'PENDING',
}: {
  rows: SapTransferApproval[];
  isLoading: boolean;
  isError: boolean;
  /** Which queue is on screen: the live one, or one of the history views. */
  view?: SapApprovalStatus;
}) {
  const decide = useDecideSapTransferApproval();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

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
  // Chevron + Document + Route + Items + Status + Person + Raised, then Decision.
  const colSpan = anySignable ? 8 : 7;
  const pending = rows.filter((r) => r.status === 'PENDING');
  const mine = pending.filter((r) => r.is_mine).length;
  // Mine but unsignable, i.e. my own SAP password is missing — the one case the
  // reader can fix themselves by asking an administrator for their account.
  const myPasswordMissing = pending.some((r) => r.is_mine && !r.credentials_configured);
  // Requests and transfers mean different things on approval, so the banner
  // only promises a stock movement when no request is in the list.
  const requestsPending = pending.filter((r) => r.obj_type === OBJ_TRANSFER_REQUEST).length;

  // On a history view the row's own number is worthless for finding the
  // document again, so the banner names the one that is not.
  const postedRequests = rows.filter(
    (r) => r.obj_type === OBJ_TRANSFER_REQUEST && r.posted_doc_num !== null,
  ).length;
  const unadded = rows.filter(
    (r) =>
      r.status === 'APPROVED' && r.obj_type !== OBJ_TRANSFER_REQUEST && r.posted_doc_num === null,
  ).length;

  return (
    <div className="space-y-4">
      {view === 'PENDING' ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          SAP is holding these transfer drafts until the authorizer named on each one decides it,
          and it accepts a decision from that person only. So you can act on the{' '}
          <span className="font-medium">{mine} waiting on you</span>
          {pending.length !== mine && `, out of ${pending.length} pending`}. Approving signs the
          decision in SAP as your own account.{' '}
          {requestsPending > 0 ? (
            <>
              A <span className="font-medium">Stock Transfer</span> moves the stock the moment SAP
              accepts it. A <span className="font-medium">Transfer Request</span> does not —
              approving clears the request, and the actual transfer still has to be posted against
              it afterwards.
            </>
          ) : (
            'The stock moves the moment SAP accepts it.'
          )}
          {myPasswordMissing && (
            <>
              {' '}
              <span className="font-medium">Your SAP password is not configured on the server</span>
              , so your own rows cannot be signed yet — ask an administrator to add it.
            </>
          )}
        </div>
      ) : view === 'APPROVED' ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Everything SAP has approved, newest first — decided here or in the SAP client. The number
          in green is the one to carry forward: it is read from the document SAP actually created,
          through the draft it came from. The draft&apos;s own number is not it — open drafts all
          show the series&apos; next number, so it is routinely shared with other drafts and already
          taken by a different posted document.
          {postedRequests > 0 && (
            <>
              {' '}
              <span className="font-medium">{postedRequests}</span>{' '}
              {postedRequests === 1 ? 'is a transfer request' : 'are transfer requests'} — copy that
              number into <span className="font-medium">Awaiting transfer</span> to post the stock
              against it.
            </>
          )}
          {unadded > 0 && (
            <>
              {' '}
              <span className="font-medium">{unadded}</span> approved{' '}
              {unadded === 1 ? 'transfer was' : 'transfers were'} never added in SAP, so no document
              exists yet — those sit in <span className="font-medium">Awaiting transfer</span> under
              their draft number.
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Transfers SAP rejected, newest first, with the reason the authorizer gave. Nothing moved
          and no document was created. A rejected draft can be edited in the SAP client, which opens
          a fresh approval request and puts it back in the pending queue.
        </div>
      )}

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
              {view === 'PENDING'
                ? 'SAP is not holding any transfer for approval.'
                : view === 'APPROVED'
                  ? 'No transfer approvals on record yet.'
                  : 'No transfer has been rejected.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-8 px-2 py-3" />
                    <th className="px-3 py-3 text-left font-medium">Document</th>
                    <th className="px-3 py-3 text-left font-medium">Route</th>
                    <th className="px-3 py-3 text-right font-medium">Items</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className="px-3 py-3 text-left font-medium">
                      {view === 'PENDING' ? 'Waiting on' : 'Decided by'}
                    </th>
                    <th className="px-3 py-3 text-left font-medium">Raised</th>
                    {anySignable && <th className="px-3 py-3 text-right font-medium">Decision</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const open = openIds.has(row.id);
                    const shortLines = row.lines.filter(isShort).length;
                    const totalQty = row.lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
                    return (
                      <Fragment key={row.id}>
                        <tr
                          onClick={() => toggle(row.id)}
                          className={`cursor-pointer border-b align-top last:border-0 hover:bg-muted/40 ${
                            open ? 'bg-muted/30' : ''
                          }`}
                        >
                          <td className="px-2 py-3 text-muted-foreground">
                            {open ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <DocumentCell row={row} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <Route from={row.from_warehouse} to={row.to_warehouse} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            <div className="tabular-nums">{qty(totalQty)}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.lines.length} line{row.lines.length === 1 ? '' : 's'}
                            </div>
                            {shortLines > 0 && (
                              <div
                                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"
                                title="The sending warehouse does not hold this quantity"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {shortLines} short
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <StatusChip status={row.status} />
                          </td>
                          <td className="max-w-[10rem] px-3 py-3">
                            <PersonCell row={row} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                            <div>{shortDate(row.created_at)}</div>
                            <div className="truncate text-xs">{row.created_by || '—'}</div>
                          </td>
                          {anySignable && (
                            <td
                              className="whitespace-nowrap px-3 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
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

                        {open && (
                          <tr className="border-b last:border-0">
                            <td colSpan={colSpan} className="p-0">
                              <DetailPanel row={row} />
                            </td>
                          </tr>
                        )}

                        {rejectingId === row.id && (
                          <tr className="border-b bg-muted/30">
                            <td colSpan={colSpan} className="px-4 py-3">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
