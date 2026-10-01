/**
 * One SAP approval request, read fresh from SAP each time it opens: who raised
 * it, every stage and who sits on it, the document as the draft holds it and
 * its lines — plus the three warnings SAP itself never gives an approver:
 *
 * - **a leftover**: SAP still lists it as pending but its draft's approval has
 *   ended (or a newer request replaced it), so there is nothing to decide;
 * - **siblings**: SAP opened one request per matching approval template, and
 *   the document is released only when every one is approved;
 * - **already posted**: the same document is already in SAP, so approving this
 *   copy would post it again.
 *
 * The action buttons follow the server's `can_decide` / `can_withdraw`, and
 * `can_change_decision` offers the one who decided a request the other decision.
 */
import { AlertTriangle, CheckCircle2, Circle, Layers, XCircle } from 'lucide-react';

import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';

import { useSapApprovalRequest } from '../api/sap-approvals.queries';
import type { SapApprovalDetail, SapApprovalRequest, SapApprovalStage } from '../types';
import { changeMode } from '../utils/decision';
import { dateTime, money, person, shortDate, STATUS_LABELS } from '../utils/format';
import { ApprovalDocument } from './ApprovalDocument';
import type { SapActionMode } from './SapActionDialog';
import { StatusChip } from './StatusChip';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

function StageIcon({ stage }: { stage: SapApprovalStage }) {
  if (stage.status === 'APPROVED') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (stage.status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-600" />;
  return (
    <Circle
      className={`h-4 w-4 ${stage.is_current ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`}
    />
  );
}

/** Warnings shared by the sheet and the table's row badges. */
export function RequestWarnings({ request }: { request: SapApprovalRequest }) {
  const otherPending = Math.max(
    0,
    request.pending_request_count - (request.status === 'PENDING' ? 1 : 0),
  );
  const notes: { tone: 'amber' | 'red' | 'slate'; text: string }[] = [];
  if (request.superseded) {
    notes.push({
      tone: 'slate',
      text: 'SAP still lists this request as pending, but its draft was edited since and SAP opened a newer request for it. Decide that one instead.',
    });
  } else if (request.stale_pending) {
    notes.push({
      tone: 'slate',
      text: `SAP never closed this request, but the approval of its draft ended (${STATUS_LABELS[request.status].toLowerCase()}) — there is nothing left to approve or reject.`,
    });
  }
  if (request.request_count > 1) {
    notes.push({
      tone: 'amber',
      text:
        otherPending > 0
          ? `This document has ${request.request_count} approval requests and ${otherPending} other ${otherPending === 1 ? 'is' : 'are'} still pending. It is released only when every one is approved.`
          : `This document has ${request.request_count} approval requests; the others are already decided.`,
    });
  }
  if (request.is_duplicate) {
    const own =
      request.already_posted_as &&
      request.posted_duplicates.some((p) => p.doc_entry === request.already_posted_as?.doc_entry);
    const docs = request.posted_duplicates
      .map((p) => `#${p.doc_num ?? p.doc_entry}${p.doc_date ? ` (${shortDate(p.doc_date)})` : ''}`)
      .join(', ');
    notes.push({
      tone: 'red',
      text: own
        ? `This draft is already posted in SAP as ${docs}. This request is a leftover — approving it posts nothing new. Reject it to clear it.`
        : `The same ${request.object_type_label} is already posted in SAP as ${docs} — same party, date, amount and reference. Approving this copy would post it twice.`,
    });
  }
  if (!notes.length) return null;
  const tones = {
    amber:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
    slate:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground',
  };
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.text}
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${tones[note.tone]}`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{note.text}</span>
        </div>
      ))}
    </div>
  );
}

function Stages({ detail }: { detail: SapApprovalDetail }) {
  if (!detail.stages.length) {
    return (
      <p className="text-sm text-muted-foreground">SAP holds no stage lines for this request.</p>
    );
  }
  return (
    <ol className="space-y-2">
      {detail.stages.map((stage, index) => (
        <li key={`${stage.step_code}-${stage.user_code}-${index}`} className="flex gap-3">
          <div className="pt-0.5">
            <StageIcon stage={stage} />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{person(stage.user_code, stage.user_name)}</span>
              <span className="text-xs text-muted-foreground">
                {stage.stage_name ?? `Stage ${stage.step_code ?? '—'}`}
                {stage.is_current && detail.status === 'PENDING' ? ' · waiting now' : ''}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {stage.status === 'PENDING'
                ? 'Not decided yet'
                : `${stage.status?.toLowerCase()} ${dateTime(stage.decided_at)}`}
            </div>
            {stage.remarks && <p className="mt-0.5 text-xs">“{stage.remarks}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Lines({ detail }: { detail: SapApprovalDetail }) {
  if (!detail.lines_available) {
    return (
      <p className="text-sm text-muted-foreground">
        A payment draft&apos;s accounts, invoices and cheques are in the full document below.
      </p>
    );
  }
  if (!detail.lines.length) {
    return <p className="text-sm text-muted-foreground">SAP reports no lines on this draft.</p>;
  }
  const currency = detail.document.currency;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1.5 pr-3 text-left font-medium">Item / account</th>
            <th className="py-1.5 pr-3 text-left font-medium">Description</th>
            <th className="py-1.5 pr-3 text-right font-medium">Qty</th>
            <th className="py-1.5 pr-3 text-right font-medium">Price</th>
            <th className="py-1.5 pr-3 text-right font-medium">Total</th>
            <th className="py-1.5 pr-3 text-left font-medium">Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line) => (
            <tr key={line.line_num} className="border-b align-top last:border-0">
              <td className="py-1.5 pr-3 font-mono">
                {line.item_code ?? line.account_code ?? '—'}
              </td>
              <td className="py-1.5 pr-3">
                <div className="text-muted-foreground">{line.description ?? '—'}</div>
                {line.base_ref && (
                  <div className="text-[11px] text-muted-foreground">
                    from {line.base_type_label ?? 'document'} {line.base_ref}
                  </div>
                )}
                {line.without_qty_posting && (
                  <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Without Qty Posting — value only, no stock moves
                  </div>
                )}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {line.quantity ?? '—'} {line.unit ?? ''}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{money(line.price, currency)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {money(line.line_total, currency)}
              </td>
              <td className="py-1.5 pr-3 font-mono">{line.warehouse ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApprovalDetailSheet({
  wddCode,
  onOpenChange,
  onAction,
}: {
  wddCode: number | null;
  onOpenChange: (open: boolean) => void;
  onAction: (mode: SapActionMode, request: SapApprovalRequest) => void;
}) {
  const query = useSapApprovalRequest(wddCode);
  const detail = query.data;
  const change = detail ? changeMode(detail) : null;

  return (
    <Sheet open={wddCode !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {detail
              ? `${detail.object_type_label} · request #${detail.wdd_code}`
              : 'SAP approval request'}
          </SheetTitle>
          <SheetDescription>
            Read live from SAP. Decisions are signed as your own SAP user.
          </SheetDescription>
        </SheetHeader>

        {query.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Reading the request from SAP…</p>
        ) : query.isError || !detail ? (
          <p className="mt-6 text-sm text-red-600">
            Could not open this request. It may not involve you, or SAP could not be read.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={detail.status} stale={detail.stale_pending} />
              {detail.request_count > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400">
                  <Layers className="h-3 w-3" />
                  {detail.request_count} requests on this document
                </span>
              )}
            </div>

            <RequestWarnings request={detail} />

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Party" value={detail.document.party_name} />
              <Field
                label="Amount"
                value={money(detail.document.total_amount, detail.document.currency)}
              />
              <Field label="Document date" value={shortDate(detail.document.doc_date)} />
              <Field label="Their reference" value={detail.document.reference} />
              <Field label="Draft" value={detail.draft_entry} />
              <Field label="Draft no. (provisional)" value={detail.document.doc_num} />
              <Field
                label="Raised by"
                value={person(detail.originator_code, detail.originator_name)}
              />
              <Field label="Raised" value={dateTime(detail.created_at)} />
              <Field label="Template" value={detail.template_name} />
              {detail.status === 'PENDING' ? (
                <Field
                  label="Waiting on"
                  value={person(detail.approver_code, detail.approver_name)}
                />
              ) : (
                <Field
                  label="Decided by"
                  value={person(detail.decided_by, detail.decided_by_name)}
                />
              )}
            </dl>
            {detail.document.comments && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">SAP comments:</span> {detail.document.comments}
              </p>
            )}
            {detail.rejection_reason && (
              <p className="text-sm text-red-700 dark:text-red-400">
                <span className="font-medium">Rejected because:</span> {detail.rejection_reason}
              </p>
            )}

            {(detail.can_decide || detail.can_withdraw) && (
              <div className="flex flex-wrap gap-2">
                {detail.can_decide && (
                  <>
                    <Button onClick={() => onAction('approve', detail)}>Approve</Button>
                    <Button variant="outline" onClick={() => onAction('reject', detail)}>
                      Reject
                    </Button>
                  </>
                )}
                {detail.can_withdraw && (
                  <Button variant="outline" onClick={() => onAction('withdraw', detail)}>
                    Withdraw
                  </Button>
                )}
              </div>
            )}

            {change && (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                <p>
                  You {detail.status === 'APPROVED' ? 'approved' : 'rejected'} this request
                  {detail.decided_at ? ` on ${dateTime(detail.decided_at)}` : ''}. Until the
                  document is posted you can change your decision — SAP itself accepts or refuses
                  the change.
                </p>
                <Button
                  size="sm"
                  variant={change === 'reject' ? 'destructive' : 'default'}
                  onClick={() => onAction(change, detail)}
                >
                  {change === 'reject' ? 'Change to rejected' : 'Change to approved'}
                </Button>
              </div>
            )}

            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Approval stages</h3>
              <Stages detail={detail} />
            </section>

            {detail.sibling_requests.length > 0 && (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold">Other requests on this document</h3>
                <ul className="space-y-1 text-sm">
                  {detail.sibling_requests.map((s) => (
                    <li key={s.wdd_code} className="flex items-center gap-2">
                      <span className="font-mono">#{s.wdd_code}</span>
                      <StatusChip status={s.status} />
                      <span className="text-muted-foreground">{s.template_name ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Lines</h3>
              <Lines detail={detail} />
            </section>

            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">The document</h3>
              <p className="text-xs text-muted-foreground">
                Every line with its details, tax deducted, the journal SAP will post, what it was
                copied from, and the attached scans.
              </p>
              <ApprovalDocument key={detail.wdd_code} wddCode={detail.wdd_code} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
