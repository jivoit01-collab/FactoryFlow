/**
 * One SAP document, opened from the browser — SAP Portal's document modal
 * (documents.html `openDetail` / `docHeaderHtml`) on JI's components.
 *
 * Header facts with codes resolved to names and the partner's own GSTIN (never
 * our branch's), lines one column per field as the portal's approvals showed
 * them (`utils/lineColumns.ts`) with a copy for Excel, the
 * amounts down to the balance still due, withholding tax, the documents the
 * lines were copied from, the journal SAP posted (or, for a draft, the
 * reconstruction), and the attachments — the document's own and its base
 * documents', downloadable only with the download right.
 */
import { Copy, TriangleAlert } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SAP_DOCUMENTS_DOWNLOAD_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { StatusPill, type StatusTone } from '@/shared/components/page';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { buildTsv, copyToClipboard } from '@/shared/utils';

import { type DocumentDetail, type DocumentTypeInfo, useDocumentDetail } from '../api';
import { type BaseDocumentOpener, useBaseDocumentOpener } from '../hooks/useBaseDocumentOpener';
import { cleanAddress, money, sapDate } from '../utils/format';
import { LAYOUT_TITLES, type LineColumn, lineColumns, lineLayout, linesToClipboardRows } from '../utils/lineColumns';
import { AttachmentList } from './AttachmentList';
import { JournalEntryTable } from './JournalEntryTable';

const STATUS: Record<string, { tone: StatusTone; label: string }> = {
  open: { tone: 'info', label: 'Open' },
  closed: { tone: 'done', label: 'Closed' },
  cancelled: { tone: 'blocked', label: 'Cancelled' },
};

function present(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '' && value !== -1 && value !== '-1';
}

function Fact({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  if (!present(value)) return null;
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-words text-sm ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function AmountRow({ label, value, tone }: { label: string; value: number | null | undefined; tone?: string }) {
  if (value === null || value === undefined || value === 0) return null;
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${tone ?? ''}`}>{money(value)}</span>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Hero({ doc }: { doc: DocumentDetail }) {
  const { header, totals } = doc;
  const vendor = header.party_role === 'vendor';
  const cancelled = header.status === 'cancelled';
  const total = totals.total ?? null;
  const paid = totals.paid_to_date ?? null;
  const due = totals.balance_due ?? null;
  const status = header.status ? STATUS[header.status] : undefined;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
      <div className="min-w-0 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {doc.kind === 'transfer' ? 'Route' : vendor ? 'Vendor' : 'Customer'}
        </div>
        <div className="text-lg font-semibold leading-tight">
          {doc.kind === 'transfer'
            ? `${header.from_warehouse || '?'} → ${header.to_warehouse || '?'}`
            : header.card_name || header.card_code || '-'}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground">
          {header.card_code && <span>{header.card_code}</span>}
          {header.party_gstin && <span>GSTIN {header.party_gstin}</span>}
          {header.party_pan && <span>PAN {header.party_pan}</span>}
          {header.party_state && <span>{header.party_state}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
          {!cancelled && due !== null && due <= 0 && (total ?? 0) > 0 && <StatusPill tone="done">Paid</StatusPill>}
          {!cancelled && due !== null && due > 0 && (paid ?? 0) > 0 && <StatusPill tone="warn">Part paid</StatusPill>}
          {header.subtype && <StatusPill>{header.subtype}</StatusPill>}
          {header.object_label && <StatusPill tone="progress">Draft of {header.object_label}</StatusPill>}
          {header.approval_status && <StatusPill tone="progress">{header.approval_status}</StatusPill>}
          {doc.posted_as && (
            <StatusPill tone="done">
              Added as {doc.posted_as.type_label} #{doc.posted_as.doc_num ?? doc.posted_as.doc_entry}
            </StatusPill>
          )}
          {!!header.draft_key && <StatusPill>From draft {header.draft_key}</StatusPill>}
          {!!doc.attachment_entry && <StatusPill tone="info">Attachment</StatusPill>}
        </div>
      </div>
      {total !== null && (
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document total</div>
          <div className="text-2xl font-semibold tabular-nums">{money(total)}</div>
          <div className="text-xs text-muted-foreground">{totals.currency || header.currency || 'INR'}</div>
          {!cancelled && due !== null && (
            <div className={`mt-1 text-xs tabular-nums ${due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {due > 0 ? `Due ${money(due)}` : 'Settled'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentFacts({ doc }: { doc: DocumentDetail }) {
  const { header } = doc;
  const vendor = header.party_role === 'vendor';
  const shipFrom = doc.ship_from?.[0];
  const created = [sapDate(header.created_on ?? null), header.created_time].filter((v) => v && v !== '-').join(' ');

  if (doc.kind === 'journal') {
    return (
      <Grid>
        <Fact label="Entry No" value={header.doc_num ?? header.doc_entry} mono />
        <Fact label="Posting Date" value={header.doc_date ? sapDate(header.doc_date) : ''} mono />
        <Fact label="Due Date" value={header.due_date ? sapDate(header.due_date) : ''} mono />
        <Fact label="Document Date" value={header.tax_date ? sapDate(header.tax_date) : ''} mono />
        <Fact label="Memo" value={header.memo} />
        <Fact label="Reference" value={header.reference} mono />
        <Fact label="Reference 2" value={header.reference2} mono />
        <Fact label="Reference 3" value={header.reference3} mono />
        <Fact label="Reversal Date" value={header.reversal_date ? sapDate(header.reversal_date) : ''} mono />
        <Fact label="Transaction Code" value={header.transaction_code} />
        <Fact label="Project" value={header.project} />
      </Grid>
    );
  }

  return (
    <Grid>
      <Fact label="Document No" value={header.doc_num ?? header.doc_entry} mono />
      <Fact label="Posting Date" value={header.doc_date ? sapDate(header.doc_date) : ''} mono />
      <Fact label="Document Date" value={header.tax_date ? sapDate(header.tax_date) : ''} mono />
      <Fact label="Due Date" value={header.due_date ? sapDate(header.due_date) : ''} mono />
      <Fact label={vendor ? 'Vendor Ref No' : 'Customer Ref No'} value={header.num_at_card} />
      <Fact label="Original Ref. No." value={header.original_ref_no} />
      <Fact label="Original Ref. Date" value={header.original_ref_date ? sapDate(header.original_ref_date) : ''} mono />
      <Fact label={vendor ? 'Buyer' : 'Sales Employee'} value={header.sales_person} />
      <Fact label="Payment Terms" value={header.payment_terms} />
      <Fact label="Shipping Type" value={header.shipping_type} />
      <Fact label="Branch" value={header.branch_name} />
      <Fact label="Branch GSTIN" value={header.branch_gstin} mono />
      <Fact label="Control Account" value={header.control_account} mono />
      <Fact label="Ship From" value={shipFrom ? [shipFrom.name, shipFrom.code].filter(Boolean).join(' · ') : ''} />
      <Fact label="Ship To" value={header.ship_to_code} />
      <Fact
        label="From Warehouse"
        value={[header.from_warehouse, header.from_warehouse_name].filter(Boolean).join(' — ')}
      />
      <Fact label="To Warehouse" value={[header.to_warehouse, header.to_warehouse_name].filter(Boolean).join(' — ')} />
      <Fact label="Reference" value={header.reference} mono />
      <Fact label="Period" value={header.period} mono />
      <Fact label="Project" value={header.project} />
      <Fact label="Created" value={created} mono />
    </Grid>
  );
}

function Amounts({ doc }: { doc: DocumentDetail }) {
  const { totals } = doc;
  if (totals.total === null || totals.total === undefined) return null;
  const due = totals.balance_due ?? null;
  return (
    <Section title="Amounts">
      <div className="rounded-lg border px-3">
        <AmountRow label="Net amount" value={totals.net} />
        <AmountRow label="Discount" value={totals.discount} />
        <AmountRow label="Tax (GST)" value={totals.tax} />
        <AmountRow label="TDS / withholding" value={totals.withholding} />
        <AmountRow label="Down payment" value={totals.down_payment} />
        <AmountRow label="Rounding" value={totals.rounding} />
        <div className="flex justify-between gap-4 border-b py-2 text-sm font-semibold last:border-0">
          <span>Document total ({totals.currency || 'INR'})</span>
          <span className="tabular-nums">{money(totals.total)}</span>
        </div>
        <AmountRow label="Paid to date" value={totals.paid_to_date} tone="text-emerald-600" />
        {doc.header.status !== 'cancelled' && due !== null && due > 0 && (
          <AmountRow label="Balance due" value={due} tone="text-amber-600" />
        )}
      </div>
    </Section>
  );
}

function Remarks({ doc }: { doc: DocumentDetail }) {
  const { header } = doc;
  const billTo = cleanAddress(header.bill_to);
  const shipTo = cleanAddress(header.ship_to);
  const notes = [header.comments, header.journal_memo !== header.comments ? header.journal_memo : ''].filter(Boolean);
  if (!billTo && !shipTo && !notes.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {billTo && (
        <Section title="Bill to">
          <p className="whitespace-pre-line rounded-lg border bg-muted/20 p-3 text-sm">{billTo}</p>
        </Section>
      )}
      {shipTo && shipTo !== billTo && (
        <Section title="Ship to">
          <p className="whitespace-pre-line rounded-lg border bg-muted/20 p-3 text-sm">{shipTo}</p>
        </Section>
      )}
      {notes.length > 0 && (
        <Section title="Remarks">
          {notes.map((note) => (
            <p key={note} className="rounded-lg border-l-4 border-l-primary/40 bg-muted/20 p-3 text-sm">
              {note}
            </p>
          ))}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

// Every layer is opaque (card body, muted heading, background on hover), so
// the pinned line number never shows the columns scrolling under it.
const PINNED = 'sticky left-0 z-10 shadow-[inset_-1px_0_0_hsl(var(--border))]';

function cellClass(column: LineColumn, pinned: boolean): string {
  return [
    'whitespace-nowrap px-3 py-1.5',
    column.align === 'right' ? 'text-right tabular-nums' : 'text-left',
    pinned ? PINNED : '',
  ].join(' ');
}

/** Whether a sideways-scrolling frame has more to show on its right. */
function useMoreToTheRight(ref: RefObject<HTMLDivElement | null>): boolean {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const update = () => setMore(frame.scrollLeft + frame.clientWidth < frame.scrollWidth - 1);
    update();
    frame.addEventListener('scroll', update, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(frame);
    return () => {
      frame.removeEventListener('scroll', update);
      resize?.disconnect();
    };
  }, [ref]);
  return more;
}

/**
 * One column per field, as the portal's approvals showed them; the copy is what
 * the table shows. The table is as wide as its columns and scrolls inside its
 * own frame, so the sheet or dialog around it never scrolls sideways; a fade on
 * the right says there are more columns, since touchpads and phones hide the
 * scrollbar until you scroll. Cells stay on one line, long text wraps past
 * 20rem, so a row stays one line high.
 */
function Lines({ doc }: { doc: DocumentDetail }) {
  if (!doc.lines.length) return null;
  return <LinesTable doc={doc} />;
}

function LinesTable({ doc }: { doc: DocumentDetail }) {
  const frame = useRef<HTMLDivElement>(null);
  const more = useMoreToTheRight(frame);
  const layout = lineLayout(doc.kind, doc.lines);
  const columns = lineColumns(layout, doc.lines);
  const count = doc.lines.length;

  const copyLines = async () => {
    const copied = await copyToClipboard(buildTsv(linesToClipboardRows(columns, doc.lines)));
    if (!copied) {
      toast.error('The browser would not let us reach the clipboard.');
      return;
    }
    toast.success(`${count} line${count === 1 ? '' : 's'} copied with the headings — paste into your sheet.`);
  };

  return (
    <Section
      title={`${LAYOUT_TITLES[layout]} (${count})`}
      action={
        <Button variant="outline" size="sm" onClick={copyLines}>
          <Copy className="mr-2 h-4 w-4" /> Copy for Excel
        </Button>
      }
    >
      <div className="relative">
        <div ref={frame} className="max-w-full overflow-x-auto rounded-lg border [scrollbar-width:thin]">
          <table className="w-max min-w-full bg-card text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                {columns.map((column, i) => (
                  <th key={column.label} className={`${cellClass(column, i === 0)} bg-muted font-medium`}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((line, index) => (
                <tr key={line.line_num ?? index} className="group border-b align-top last:border-0">
                  {columns.map((column, i) => {
                    const text = column.text(line, index);
                    return (
                      <td
                        key={column.label}
                        className={`${cellClass(column, i === 0)} bg-card group-hover:bg-background`}
                      >
                        {!text ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : column.wrap ? (
                          <div className="min-w-32 max-w-xs whitespace-normal">{text}</div>
                        ) : (
                          text
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {more && (
          <div className="pointer-events-none absolute inset-y-px right-px w-10 rounded-r-lg bg-gradient-to-l from-card to-transparent" />
        )}
      </div>
    </Section>
  );
}

function Withholding({ doc }: { doc: DocumentDetail }) {
  if (!doc.tds.length) return null;
  return (
    <Section title={`TDS / withholding${doc.tds_section ? ` — ${doc.tds_section}` : ''}`}>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Code</th>
              <th className="px-3 py-1.5 text-left font-medium">Section</th>
              <th className="px-3 py-1.5 text-right font-medium">Rate %</th>
              <th className="px-3 py-1.5 text-right font-medium">Taxable</th>
              <th className="px-3 py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.tds.map((row) => (
              <tr key={`${row.code}-${row.amount}`} className="border-t">
                <td className="px-3 py-1.5">
                  {row.code}
                  {row.name && <span className="text-muted-foreground"> — {row.name}</span>}
                </td>
                <td className="px-3 py-1.5">{row.section}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.rate ?? ''}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(row.taxable)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function BaseDocuments({ doc, opener }: { doc: DocumentDetail; opener?: BaseDocumentOpener }) {
  if (!doc.base_documents.length) return null;
  return (
    <Section title="Copied from">
      <ul className="flex flex-wrap gap-2 text-sm">
        {doc.base_documents.map((base) => {
          const label = (
            <>
              {base.type_label} #{base.doc_num ?? base.base_entry}
              {base.doc_date && <span className="ml-1 text-muted-foreground">· {sapDate(base.doc_date)}</span>}
            </>
          );
          return (
            <li key={`${base.base_type}-${base.base_entry}`}>
              {opener?.canOpen(base) ? (
                <button
                  type="button"
                  onClick={() => opener.open(base)}
                  className="rounded-lg border bg-muted/20 px-3 py-1.5 text-primary hover:bg-muted"
                  title="Open this document"
                >
                  {label}
                </button>
              ) : (
                <span className="block rounded-lg border bg-muted/20 px-3 py-1.5">{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

function Payment({ doc }: { doc: DocumentDetail }) {
  const payment = doc.payment;
  if (!payment) return null;
  const means = [
    ['Bank transfer', payment.transfer_account, payment.transfer_sum, payment.transfer_reference],
    ['Cash', payment.cash_account, payment.cash_sum, ''],
    ['Cheques', payment.check_account, payment.check_sum, ''],
    ['Credit card', '', payment.credit_sum, ''],
    ['TDS withheld', payment.wt_account, payment.wt_amount, payment.wt_rate ? `${payment.wt_rate}%` : ''],
  ].filter(([, , amount]) => !!amount) as [string, string, number, string][];

  return (
    <>
      <Grid>
        <Fact label="Payment mode" value={payment.payment_mode} />
        <Fact label="Transfer date" value={payment.transfer_date ? sapDate(payment.transfer_date) : ''} mono />
        <Fact label="Counter reference" value={payment.counter_reference} />
        <Fact label="On account" value={payment.on_account_sum ? money(payment.on_account_sum) : ''} mono />
      </Grid>
      {means.length > 0 && (
        <Section title="Paid by">
          <div className="rounded-lg border px-3">
            {means.map(([label, account, amount, note]) => (
              <div key={label} className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">
                  {label}
                  {account && <span className="ml-1 font-mono">{account}</span>}
                  {note && <span className="ml-1">· {note}</span>}
                </span>
                <span className="tabular-nums">{money(amount)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {payment.accounts.length > 0 && (
        <Section title="G/L accounts">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Account</th>
                  <th className="px-3 py-1.5 text-left font-medium">Description</th>
                  <th className="px-3 py-1.5 text-left font-medium">Cost centres</th>
                  <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payment.accounts.map((row, index) => (
                  <tr key={`${row.account_code}-${index}`} className="border-t">
                    <td className="px-3 py-1.5">
                      {row.account_code}
                      {row.account_name && <span className="text-muted-foreground"> — {row.account_name}</span>}
                    </td>
                    <td className="px-3 py-1.5">{row.description}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.cost_centers.filter(Boolean).join(' · ')}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(row.sum_paid ?? row.gross_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {payment.invoices.length > 0 && (
        <Section title="Documents settled">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Document</th>
                  <th className="px-3 py-1.5 text-left font-medium">Date</th>
                  <th className="px-3 py-1.5 text-right font-medium">Document total</th>
                  <th className="px-3 py-1.5 text-right font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {payment.invoices.map((row, index) => (
                  <tr key={`${row.doc_entry}-${index}`} className="border-t">
                    <td className="px-3 py-1.5">
                      {row.invoice_type} #{row.doc_num ?? row.doc_entry}
                    </td>
                    <td className="px-3 py-1.5">{sapDate(row.doc_date)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(row.doc_total)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(row.sum_applied)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {payment.checks.length > 0 && (
        <Section title="Cheques">
          <ul className="space-y-1 text-sm">
            {payment.checks.map((check, index) => (
              <li key={`${check.check_number}-${index}`} className="flex justify-between rounded-lg border px-3 py-1.5">
                <span>
                  No. {check.check_number} · {check.bank_code} · due {sapDate(check.due_date)}
                </span>
                <span className="tabular-nums">{money(check.check_sum)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Attachments and journals
// ---------------------------------------------------------------------------

function Attachments({ doc, canDownload }: { doc: DocumentDetail; canDownload: boolean }) {
  if (doc.kind === 'journal') return null;
  const sources: { entry: number; title: string }[] = [];
  if (doc.attachment_entry) sources.push({ entry: doc.attachment_entry, title: 'Attachments' });
  for (const base of doc.base_documents) {
    if (!base.attachment_entry || sources.some((s) => s.entry === base.attachment_entry)) continue;
    sources.push({
      entry: base.attachment_entry,
      title: `${base.type_label} #${base.base_ref || base.doc_num || base.base_entry} — attachments`,
    });
  }
  if (!sources.length) {
    return (
      <Section title="Attachments">
        <p className="text-xs text-muted-foreground">This document has no attachment in SAP.</p>
      </Section>
    );
  }
  return (
    <>
      {sources.map((source) => (
        <AttachmentList key={source.entry} absEntry={source.entry} title={source.title} canDownload={canDownload} />
      ))}
      {!canDownload && (
        <p className="text-xs text-muted-foreground">
          Opening the files needs the SAP attachments right; ask an administrator.
        </p>
      )}
    </>
  );
}

function Journals({ doc }: { doc: DocumentDetail }) {
  return (
    <>
      {doc.journal_entry && (
        <JournalEntryTable
          entry={doc.journal_entry}
          title={doc.kind === 'journal' ? 'Lines' : doc.posted_as ? 'Journal entry of the added document' : 'Journal entry'}
        />
      )}
      {doc.in_transit_journal_entries.map((entry) => (
        <JournalEntryTable key={entry.trans_id} entry={entry} title={`In transit — ${entry.trans_type_label}`} />
      ))}
      {doc.journal_preview && <JournalEntryTable entry={doc.journal_preview} title="Journal preview" />}
    </>
  );
}

// ---------------------------------------------------------------------------
// The document, for the dialog here and for the approvals inbox
// ---------------------------------------------------------------------------

/**
 * Every section of one shaped document. `attachments` replaces the
 * attachments section: the approvals inbox serves a request's files through
 * its own endpoints, on its own right, rather than the document browser's.
 */
export function DocumentDetailBody({
  doc,
  attachments,
  opener,
}: {
  doc: DocumentDetail;
  attachments: ReactNode;
  /** Makes "Copied from" documents openable (`useBaseDocumentOpener`). */
  opener?: BaseDocumentOpener;
}) {
  return (
    <>
      {doc.warnings.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <ul>
            {doc.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {doc.kind !== 'journal' && <Hero doc={doc} />}
      <DocumentFacts doc={doc} />
      <Remarks doc={doc} />
      <Lines doc={doc} />
      <Payment doc={doc} />
      <Amounts doc={doc} />
      <Withholding doc={doc} />
      <BaseDocuments doc={doc} opener={opener} />
      <Journals doc={doc} />
      {attachments}
      {opener?.target && (
        <DocumentDetailDialog type={opener.target.type} docEntry={opener.target.entry} onClose={opener.close} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------

export function DocumentDetailDialog({
  type,
  docEntry,
  onClose,
}: {
  type: DocumentTypeInfo | undefined;
  docEntry: number | null;
  onClose: () => void;
}) {
  const { hasAllPermissions } = usePermission();
  const canDownload = hasAllPermissions(SAP_DOCUMENTS_DOWNLOAD_ACCESS);
  // Whoever has this dialog open can browse documents already.
  const opener = useBaseDocumentOpener(true);
  const query = useDocumentDetail(type?.key ?? '', docEntry);
  const doc = query.data;
  const number = doc?.header.doc_num ?? doc?.header.doc_entry ?? docEntry;

  return (
    <Dialog open={docEntry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[92vh] max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {type?.label ?? 'Document'} #{number}
          </DialogTitle>
          <DialogDescription>Read live from SAP. Nothing here changes SAP.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {query.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Reading the document from SAP…</p>
          ) : query.isError || !doc ? (
            <p className="py-10 text-center text-sm text-destructive">
              {(query.error as { message?: string } | null)?.message || 'The document could not be read from SAP.'}
            </p>
          ) : (
            <DocumentDetailBody
              doc={doc}
              attachments={<Attachments doc={doc} canDownload={canDownload} />}
              opener={opener}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
