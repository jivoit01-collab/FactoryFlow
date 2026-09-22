/**
 * SAP's approval queue on credit-note drafts.
 *
 * These are not the app's documents: every one was raised in the SAP client,
 * and SAP is holding the draft until the single authorizer its approval
 * template names decides it — signing as anybody else is refused with -6006.
 * So each row says who it is waiting on, and Approve/Reject appears only where
 * the reader's own mapped SAP account (Admin → SAP Identities) IS that
 * authorizer and its password is configured. Rows belonging to other people
 * are listed anyway: knowing a credit note is stuck, and on whom, is the whole
 * reason for surfacing SAP's queue here.
 *
 * A credit note comes in two shapes and the grid must not pretend otherwise.
 * An ITEM credit note has items, quantities and a warehouse, and goods move on
 * approval — back IN from a customer (A/R) or back OUT to a vendor (A/P). A
 * SERVICE one has no items and no warehouse at all: it is an amount against a
 * G/L account, and nothing moves. Roughly a third of them are service, so the
 * row is rendered from what the document actually holds rather than from an
 * assumption that a credit note is always goods coming back.
 *
 * Layout follows the transfer queue: one line per row, one fact per column,
 * and everything that only matters once you are looking at THAT credit note —
 * lines, comments, what it was raised against — inside the expander, so the
 * rows stay one height and the columns stay scannable.
 */

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  KeyRound,
  Layers,
  Receipt,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Fragment, useState } from 'react';

import { confirmSapPost } from '@/shared/components';
import { Button, Card, CardContent, Textarea } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';

import { useDecideCreditNoteApproval } from '../api/creditNoteApproval.queries';
import type {
  CreditNoteApproval,
  CreditNoteApprovalLine,
  CreditNoteApprovalStatus,
} from '../types';
import { CreditNotePrintButton } from './CreditNotePrintButton';

function apiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

function money(value: string | null, currency: string | null): string {
  if (value === null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return formatCurrency(n, currency ?? 'INR');
}

function qty(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * A line whose warehouse cannot currently cover it. Only meaningful when the
 * goods are going OUT (an A/P credit note returning stock to a vendor) — on an
 * A/R credit note the stock is arriving, so a low balance is expected and
 * flagging it would cry wolf on every row.
 */
function isShort(row: CreditNoteApproval, line: CreditNoteApprovalLine): boolean {
  return (
    row.stock_direction === 'OUT' &&
    line.quantity !== null &&
    line.warehouse_stock !== null &&
    line.warehouse_stock < line.quantity
  );
}

function StatusChip({ status }: { status: CreditNoteApprovalStatus }) {
  if (status === 'APPROVED') {
    return (
      <span className={`${CHIP} bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400`}>
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className={`${CHIP} bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400`}>
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400`}>
      <Clock className="h-3 w-3" />
      Waiting
    </span>
  );
}

/** What approving actually does to stock — or that it does nothing. */
function EffectChip({ row }: { row: CreditNoteApproval }) {
  if (!row.moves_stock) {
    return (
      <span className={`${CHIP} bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground`} title="No goods move">
        <Receipt className="h-3 w-3" />
        Service
      </span>
    );
  }
  if (row.stock_direction === 'OUT') {
    return (
      <span className={`${CHIP} bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-400`} title="Goods go back to the vendor">
        <ArrowUpRight className="h-3 w-3" />
        Stock out
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400`} title="Goods come back into stock">
      <ArrowDownLeft className="h-3 w-3" />
      Stock in
    </span>
  );
}

/**
 * The posted number, with a copy button — it exists to be pasted into SAP, and
 * retyping nine digits is how people end up on the wrong document.
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
      className="group inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums text-green-800 dark:text-green-400 hover:underline"
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3 text-green-700 dark:text-green-400" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
      )}
    </button>
  );
}

/**
 * The identifying number, one line. A decided-and-added row leads with the
 * number SAP really gave the document; everything else leads with the draft
 * entry, because a draft's own DocNum is provisional and shared between open
 * drafts (three Oil credit notes carry 626042613 between them) and must never
 * look like a key.
 *
 * Where the draft opened more than one approval request — SAP does that once a
 * credit note matches two templates, and each request needs its own signature
 * — the row also says WHICH of them it is and under which template. Everything
 * else on the row belongs to the shared draft, so without this the two rows are
 * character-for-character identical and read as one credit note listed twice.
 */
function DocumentCell({ row }: { row: CreditNoteApproval }) {
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
      {row.request_count > 1 && (
        <>
          <div
            className={`${CHIP} bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400`}
            title={`This credit note needs ${row.request_count} separate approvals in SAP and is listed once per approval`}
          >
            <Layers className="h-3 w-3" />
            approval {row.request_index} of {row.request_count}
          </div>
          {row.template_name && (
            <div
              className="max-w-[11rem] truncate text-xs text-muted-foreground"
              title={`SAP approval template: ${row.template_name}`}
            >
              {row.template_name}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Who the row is on: the authorizer while pending, the decider afterwards. */
function PersonCell({ row }: { row: CreditNoteApproval }) {
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
          <span className={`${CHIP} bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400`}>
            <UserCheck className="h-3 w-3" />
            you
          </span>
        )}
      </div>
      {row.approver_name && (
        <div className="truncate text-xs text-muted-foreground">{row.approver_name}</div>
      )}
      {row.is_mine && !row.credentials_configured && (
        <div className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-amber-700 dark:text-amber-400">
          <KeyRound className="h-3 w-3" />
          no password on file
        </div>
      )}
    </div>
  );
}

/** Item lines: what moves, from where, and whether that warehouse has it. */
function ItemLineTable({ row }: { row: CreditNoteApproval }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="border-b">
          <th className="py-1.5 pr-3 text-left font-medium">Item</th>
          <th className="py-1.5 pr-3 text-left font-medium">Description</th>
          <th className="py-1.5 pr-3 text-right font-medium">Quantity</th>
          <th className="py-1.5 pr-3 text-left font-medium">Warehouse</th>
          <th className="py-1.5 pr-3 text-right font-medium">In stock</th>
          <th className="py-1.5 pr-3 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {row.lines.map((line) => (
          <tr key={line.line_num} className="border-b last:border-0">
            <td className="py-1.5 pr-3 font-mono">{line.item_code ?? '—'}</td>
            <td className="py-1.5 pr-3 text-muted-foreground">{line.description ?? '—'}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{qty(line.quantity)}</td>
            <td className="py-1.5 pr-3 font-mono">{line.warehouse ?? '—'}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
              {line.warehouse_stock === null ? (
                <span className="text-muted-foreground">—</span>
              ) : isShort(row, line) ? (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {qty(line.warehouse_stock)}
                </span>
              ) : (
                qty(line.warehouse_stock)
              )}
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
              {money(line.line_total, row.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Service lines: no goods, just where the money lands. */
function ServiceLineTable({ row }: { row: CreditNoteApproval }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="border-b">
          <th className="py-1.5 pr-3 text-left font-medium">Account</th>
          <th className="py-1.5 pr-3 text-left font-medium">Description</th>
          <th className="py-1.5 pr-3 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {row.lines.map((line) => (
          <tr key={line.line_num} className="border-b last:border-0">
            <td className="py-1.5 pr-3">
              <div className="font-mono">{line.account_code ?? '—'}</div>
              {line.account_name && (
                <div className="text-muted-foreground">{line.account_name}</div>
              )}
            </td>
            <td className="py-1.5 pr-3 text-muted-foreground">{line.description ?? '—'}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
              {money(line.line_total, row.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Everything that only matters once you are looking at this one credit note:
 * its lines in the shape they actually are, what it was raised against, SAP's
 * comments, and where the document stands now.
 */
function DetailPanel({ row }: { row: CreditNoteApproval }) {
  /**
   * Only what nothing above the panel already says.
   *
   * The explainers that used to sit here are gone: what approving would do, and
   * the twin-approval warning in full. Both were a paragraph restating something
   * the reader had already been told — approving is what the Approve button
   * does, and the twin warning is on the row's own "approval 2 of 2" chip, in
   * that chip's tooltip and in the queue's banner above the table. Four
   * paragraphs of it under every expanded row buried the lines, which are the
   * reason the row was opened.
   */
  const notes: string[] = [];
  if (row.posted_doc_num !== null) {
    notes.push(`SAP posted this as credit note ${row.posted_doc_num}.`);
  }
  if (row.status === 'APPROVED' && row.posted_doc_num === null) {
    notes.push(
      `Approved but never added in SAP, so no credit note exists yet — it is still a draft (${row.draft_entry}) and has to be added in the SAP client.`,
    );
  }

  /**
   * Printable only once SAP holds the document itself, and only for the ones
   * this sheet is: a customer's credit note with item lines.
   *
   * A pending row has nothing to print — its draft has no number, no tax and no
   * date. An A/P credit note is a vendor document and is not in ORIN at all. A
   * service credit note credits a G/L account, so the item grid it would print
   * on would be empty. The server refuses all three; the button is hidden for
   * them so nobody presses it to find that out.
   */
  const printableEntry =
    row.posted_doc_entry !== null && row.family === 'AR' && row.line_type === 'I'
      ? row.posted_doc_entry
      : null;

  return (
    <div className="space-y-3 border-l-2 border-primary/30 bg-muted/30 px-4 py-3">
      {row.lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">SAP reports no lines on this draft.</p>
      ) : row.moves_stock ? (
        <ItemLineTable row={row} />
      ) : (
        <ServiceLineTable row={row} />
      )}

      {printableEntry !== null && (
        <CreditNotePrintButton docEntry={printableEntry} docNum={row.posted_doc_num} />
      )}

      {/*
        Only what the row itself could not say. The party, its card code and
        what the credit note was raised against are all in the columns directly
        above, so restating them here spent the panel on things the reader had
        just read and buried the lines — the reason they opened the row — in a
        block of repetition.
      */}
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {row.branch && (
          <div>
            <span className="font-medium">Branch:</span> {row.branch}
          </div>
        )}
        <div>
          <span className="font-medium">Approval request:</span> {row.id}
          {row.template_name && ` · ${row.template_name}`}
        </div>
        {/* Only the first fits in the column, so list them all once there are more. */}
        {row.base_documents.length > 1 && (
          <div>
            <span className="font-medium">Raised against:</span> {row.base_documents.join(', ')}
          </div>
        )}
        {row.reference && (
          <div>
            <span className="font-medium">Their reference:</span> {row.reference}
          </div>
        )}
        {row.tax_amount && row.tax_amount !== '0.00' && (
          <div>
            <span className="font-medium">Of which tax:</span> {money(row.tax_amount, row.currency)}
          </div>
        )}
      </div>

      {row.comments && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">SAP comments:</span> {row.comments}
        </p>
      )}
      {row.rejection_reason && (
        <p className="text-xs text-red-700 dark:text-red-400">
          <span className="font-medium">Rejected because:</span> {row.rejection_reason}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="text-xs text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}

export function CreditNoteApprovalTable({
  rows,
  isLoading,
  isError,
  view = 'PENDING',
  searching = false,
}: {
  rows: CreditNoteApproval[];
  isLoading: boolean;
  isError: boolean;
  /** Which queue is on screen: the live one, or one of the history views. */
  view?: CreditNoteApprovalStatus;
  /** A search is on, so an empty queue means "no match", not "nothing here". */
  searching?: boolean;
}) {
  const decide = useDecideCreditNoteApproval();
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

  async function run(
    // Null when the user backed out of the SAP warning: nothing was decided, so
    // there is nothing to report either way.
    fn: () => Promise<{ message: string; signed_as: string } | null | undefined>,
    fallback: string,
  ) {
    setError('');
    setDone('');
    try {
      const result = await fn();
      if (!result) return;
      setDone(`${result.message} Signed in SAP as ${result.signed_as}.`);
      setRejectingId(null);
      setReason('');
    } catch (err) {
      setError(apiError(err, fallback));
    }
  }

  const anySignable = rows.some((r) => r.can_decide);
  // Chevron + Document + Party + Amount + Effect + Status + Person + Raised,
  // then Decision.
  const colSpan = anySignable ? 9 : 8;
  const pending = rows.filter((r) => r.status === 'PENDING');
  const mine = pending.filter((r) => r.is_mine).length;
  // Mine but unsignable, i.e. my own SAP password is missing — the one case the
  // reader can fix themselves by asking an administrator for their account.
  const myPasswordMissing = pending.some((r) => r.is_mine && !r.credentials_configured);
  // Rows that are one of several approvals on a single credit note. Counted so
  // the queue can admit up front that a document appears more than once, rather
  // than letting it look like the page is repeating itself.
  const multiApproval = pending.filter((r) => r.request_count > 1).length;
  const unadded = rows.filter(
    (r) => r.status === 'APPROVED' && r.posted_doc_num === null,
  ).length;

  return (
    <div className="space-y-4">
      {view === 'PENDING' ? (
        <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 p-3 text-sm text-slate-700 dark:text-muted-foreground">
          SAP is holding these credit-note drafts until the authorizer named on each one decides
          it, and it accepts a decision from that person only. So you can act on the{' '}
          <span className="font-medium">{mine} waiting on you</span>
          {pending.length !== mine && `, out of ${pending.length} pending`}. Approving signs the
          decision in SAP as your own account and posts the credit note — an item credit note
          moves the goods with it, a service one moves money only.
          {multiApproval > 0 && (
            <>
              {' '}
              <span className="font-medium">{multiApproval}</span> of these rows belong to credit
              notes SAP wants signed more than once: the document matched more than one approval
              template, so SAP opened a request per template and each is decided on its own. Such a
              credit note is listed once per approval — every row showing the whole document&apos;s
              amount, not a share of it — and the{' '}
              <span className="font-medium">approval 1 of 2</span> mark says which row is which.
            </>
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
        <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 p-3 text-sm text-slate-700 dark:text-muted-foreground">
          Everything SAP has approved, newest first — decided here or in the SAP client. The number
          in green is the one to carry forward: it is read from the document SAP actually created,
          through the draft it came from. The draft&apos;s own number is not it — open drafts all
          show the series&apos; next number, so it is routinely shared with other drafts and
          already taken by a different posted document.
          {unadded > 0 && (
            <>
              {' '}
              <span className="font-medium">{unadded}</span> approved{' '}
              {unadded === 1 ? 'credit note was' : 'credit notes were'} never added in SAP, so no
              document exists for {unadded === 1 ? 'it' : 'them'} yet — those have to be added in
              the SAP client.
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 p-3 text-sm text-slate-700 dark:text-muted-foreground">
          Credit notes SAP rejected, newest first, with the reason the authorizer gave. Nothing was
          credited and no document was created. A rejected draft can be edited in the SAP client,
          which opens a fresh approval request and puts it back in the pending queue.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-400">
          {done}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading SAP credit notes…</p>
          ) : isError ? (
            <p className="p-6 text-sm text-red-600">
              Could not read the SAP credit-note queue. Try again in a moment.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {searching
                ? 'Nothing in this queue matches that search.'
                : view === 'PENDING'
                  ? 'SAP is not holding any credit note for approval.'
                  : view === 'APPROVED'
                    ? 'No credit-note approvals on record yet.'
                    : 'No credit note has been rejected.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-8 px-2 py-3" />
                    <th className="px-3 py-3 text-left font-medium">Document</th>
                    <th className="px-3 py-3 text-left font-medium">Customer / vendor</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-left font-medium">Effect</th>
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
                    const shortLines = row.lines.filter((l) => isShort(row, l)).length;
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
                          <td className="max-w-[14rem] px-3 py-3">
                            <div className="truncate font-medium" title={row.party_name}>
                              {row.party_name}
                            </div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {row.card_code}
                            </div>
                            {row.base_documents.length > 0 && (
                              <div
                                className="truncate text-xs text-muted-foreground"
                                title={row.base_documents.join(', ')}
                              >
                                vs {row.base_documents[0]}
                                {row.base_documents.length > 1 &&
                                  ` +${row.base_documents.length - 1}`}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            <div className="tabular-nums">
                              {money(row.total_amount, row.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.lines.length} line{row.lines.length === 1 ? '' : 's'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <EffectChip row={row} />
                            {row.warehouses.length > 0 && (
                              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {row.warehouses.join(', ')}
                              </div>
                            )}
                            {shortLines > 0 && (
                              <div
                                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                                title="The warehouse does not hold this quantity"
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
                            <div>{shortDate(row.doc_date ?? row.created_at)}</div>
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
                                        async () => {
                                          const confirmed = await confirmSapPost({
                                            title: `Approve this credit note in SAP?`,
                                            details: [
                                              { label: 'Document', value: row.doc_type_label },
                                              { label: 'Party', value: row.party_name },
                                              {
                                                label: 'Amount',
                                                value: money(row.total_amount, row.currency),
                                              },
                                              {
                                                label: 'Stock',
                                                value: row.moves_stock
                                                  ? row.stock_direction === 'OUT'
                                                    ? 'Leaves the warehouse'
                                                    : 'Comes back into the warehouse'
                                                  : 'No goods move (service)',
                                              },
                                              {
                                                label: 'Recorded',
                                                value: 'With your own SAP user',
                                              },
                                            ],
                                            confirmLabel: 'Approve in SAP',
                                          });
                                          if (!confirmed) return null;
                                          return decide.mutateAsync({
                                            wddCode: row.id,
                                            payload: { status: 'APPROVED' },
                                          });
                                        },
                                        'Could not approve this credit note in SAP.',
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
                                      async () => {
                                        const confirmed = await confirmSapPost({
                                          title: `Reject this credit note in SAP?`,
                                          details: [
                                            { label: 'Document', value: row.doc_type_label },
                                            { label: 'Party', value: row.party_name },
                                            {
                                              label: 'Amount',
                                              value: money(row.total_amount, row.currency),
                                            },
                                            { label: 'Reason', value: reason.trim() },
                                            { label: 'Recorded', value: 'With your own SAP user' },
                                          ],
                                          confirmLabel: 'Reject in SAP',
                                          destructive: true,
                                        });
                                        if (!confirmed) return null;
                                        return decide.mutateAsync({
                                          wddCode: row.id,
                                          payload: {
                                            status: 'REJECTED',
                                            rejection_reason: reason.trim(),
                                          },
                                        });
                                      },
                                      'Could not reject this credit note in SAP.',
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
