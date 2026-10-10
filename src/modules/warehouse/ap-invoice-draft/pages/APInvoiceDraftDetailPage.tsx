import {
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  ScanText,
  Send,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AP_INVOICE_DRAFT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { PageHeader, PageSection, StatusPill } from '@/shared/components/page';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort, formatDay, getErrorMessage, resolveFileUrl } from '@/shared/utils';

import { useAPInvoiceDraft, useReadInvoice, useRecheck, useSendToSap } from '../api';
import { AuditChecklist } from '../components/AuditChecklist';
import { SapDraftPill } from '../components/SapDraftPill';
import type { APInvoiceDraftDetail, InvoiceData } from '../types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function rupees(value: string | number | null | undefined) {
  return value == null || value === ''
    ? ''
    : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rateCheckText(marks: InvoiceData['rate_check']) {
  if (!marks?.found) return 'Stamp not found on the scan';
  if (marks.signed === false) return 'Blank';
  if (marks.signed === true) return marks.text ? `Signed — “${marks.text}”` : 'Signed';
  return 'Faint marks';
}

function BillPanel({ entry }: { entry: APInvoiceDraftDetail }) {
  const bill = entry.invoice_data ?? {};
  const fileUrl = resolveFileUrl(entry.invoice_file_url);
  const rows = bill.rows ?? [];
  return (
    <Panel title="The bill">
      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 text-sm hover:underline"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{entry.invoice_filename || 'Open the bill'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {entry.invoice_read_status === 'READING' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the bill…
        </p>
      )}
      {entry.invoice_read_status === 'PENDING' && (
        <p className="text-sm text-muted-foreground">Not read yet.</p>
      )}
      {entry.invoice_read_status === 'FAILED' && (
        <p role="alert" className="text-sm text-destructive">
          {entry.invoice_read_error || 'The bill could not be read.'}
        </p>
      )}
      {entry.invoice_read_status === 'READ' && (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="PO no(s). on the bill">{(bill.po_numbers ?? []).join(', ')}</Field>
            <Field label="Gate stamp date">{bill.gate_stamp_date}</Field>
            <Field label="Rate Check line">{rateCheckText(bill.rate_check)}</Field>
            <Field label="Pages read">{bill.pages ? String(bill.pages) : ''}</Field>
          </dl>
          {rows.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Text read off the bill ({rows.length} lines)
              </summary>
              <div className="mt-2 max-h-72 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs leading-5">
                {rows.map((row, index) => (
                  <div key={index} className="whitespace-pre-wrap break-words">
                    {row.text}
                  </div>
                ))}
              </div>
            </details>
          )}
          <p className="text-xs text-muted-foreground">
            Read by {entry.invoice_read_model || 'OCR'}
            {entry.invoice_read_at ? `, ${formatDateTimeShort(entry.invoice_read_at)}` : ''}.
            Machine reading of a scan: check anything that looks wrong against the bill.
          </p>
        </>
      )}
    </Panel>
  );
}

/** One bill: its GRPO, its SAP draft, what was read off it, and its checklist,
 *  with "Create in SAP" at the end, once the checklist is gone through. */
export default function APInvoiceDraftDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId) || null;
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(AP_INVOICE_DRAFT_PERMISSIONS.CREATE);
  const canReview = hasPermission(AP_INVOICE_DRAFT_PERMISSIONS.REVIEW);

  const { data: entry, isLoading, isError } = useAPInvoiceDraft(id);
  const readInvoice = useReadInvoice();
  const sendToSap = useSendToSap();
  const recheck = useRecheck();

  const run = (
    action: typeof readInvoice | typeof sendToSap | typeof recheck,
    done: (result: APInvoiceDraftDetail) => string,
  ) => {
    if (!entry) return;
    action.mutate(entry.id, {
      onSuccess: (result) => toast.success(done(result)),
      onError: (error) => toast.error(getErrorMessage(error, 'That did not work. Try again.')),
    });
  };

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !entry) {
    return <p className="p-6 text-sm text-destructive">This entry could not be loaded.</p>;
  }

  const reading = entry.invoice_read_status === 'READING' || readInvoice.isPending;
  const counts = entry.check_counts;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={entry.entry_no}
        description={`${entry.vendor_name} · GRPO ${entry.grpo_doc_num}`}
        icon={FileCheck2}
        accent="teal"
        backTo="/warehouse/ap-invoice-drafts"
        backLabel="A/P Invoice Drafts"
      >
        <Button
          variant="outline"
          onClick={() => run(recheck, () => 'Checks run again')}
          disabled={recheck.isPending || reading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Re-run checks
        </Button>
        {canCreate && (
          <Button
            variant="outline"
            onClick={() =>
              run(readInvoice, (result) =>
                result.invoice_read_status === 'READ' ? 'Bill read' : 'The bill could not be read',
              )
            }
            disabled={reading}
          >
            <ScanText className="mr-2 h-4 w-4" />
            {reading ? 'Reading…' : 'Read the bill again'}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="GRPO">
          <dl className="grid grid-cols-2 gap-3">
            <Field label="GRPO no.">{entry.grpo_doc_num}</Field>
            <Field label="Posting date">{formatDay(entry.grpo_date)}</Field>
            <Field label="Vendor">
              {entry.vendor_name} ({entry.vendor_code})
            </Field>
            <Field label="Bill no. on the GRPO">{entry.grpo_reference}</Field>
            <Field label="Total">{rupees(entry.grpo_total)}</Field>
            <Field label="Gate entry">{entry.gate_entry_no}</Field>
          </dl>
        </Panel>

        <Panel title="SAP draft">
          <SapDraftPill entry={entry} />
          {entry.sap_status === 'CREATED' && (
            <p className="text-sm text-muted-foreground">
              {entry.sap_draft_adopted
                ? `SAP already held A/P invoice draft ${entry.sap_draft_entry} for this GRPO, made in SAP; this entry is linked to it.`
                : `A/P invoice draft ${entry.sap_draft_entry} is in SAP${entry.sap_created_at ? ` since ${formatDateTimeShort(entry.sap_created_at)}` : ''}. Accounts adds it from SAP's drafts.`}
            </p>
          )}
          {entry.sap_status === 'CREATED' && entry.tds_note && (
            <div className="text-sm">
              <p className="font-medium">
                {entry.tds_code
                  ? `TDS ${rupees(entry.tds_amount ?? 0)} held back (code ${entry.tds_code} on ${rupees(entry.tds_taxable)})`
                  : 'No TDS on this draft'}
              </p>
              <p className="text-muted-foreground">{entry.tds_note}</p>
            </div>
          )}
          {entry.sap_status === 'PENDING' && (
            <p className="text-sm text-muted-foreground">
              Goes to SAP from the end of this page, after the audit checklist.
            </p>
          )}
          {entry.sap_status === 'FAILED' && (
            <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">
              {entry.sap_error}
            </p>
          )}
          {entry.sap_attachment_error && !entry.sap_attachment_entry && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The bill could not be attached in SAP ({entry.sap_attachment_error}). Attach it to the
              draft by hand.
            </p>
          )}
        </Panel>

        <BillPanel entry={entry} />
      </div>

      <PageSection
        title="Audit checklist"
        description={
          entry.checks_run_at ? `Checked ${formatDateTimeShort(entry.checks_run_at)}` : undefined
        }
        actions={
          <div className="flex flex-wrap gap-1">
            <StatusPill tone="done">{counts.PASS} OK</StatusPill>
            <StatusPill tone="blocked">{counts.FAIL} not OK</StatusPill>
            <StatusPill tone="warn">{counts.REVIEW} to look at</StatusPill>
            {counts.UNKNOWN > 0 && (
              <StatusPill tone="neutral">{counts.UNKNOWN} not checked</StatusPill>
            )}
          </div>
        }
      >
        <Card>
          <AuditChecklist entryId={entry.id} checks={entry.checks} canReview={canReview} />
        </Card>
      </PageSection>

      {/* The checklist is the pre-audit: the draft goes to SAP only after it. */}
      {canCreate && entry.sap_status !== 'CREATED' && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {entry.sap_status === 'FAILED'
                ? 'SAP did not take the draft (its reason is under SAP draft, above). Try again once that is sorted.'
                : "Once the checklist is gone through, create the A/P invoice draft in SAP. Accounts adds it from SAP's drafts."}
            </p>
            <Button
              className="shrink-0"
              onClick={() =>
                run(sendToSap, (result) =>
                  result.sap_status === 'CREATED'
                    ? `Draft ${result.sap_draft_entry} is in SAP`
                    : 'SAP did not take it',
                )
              }
              disabled={sendToSap.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendToSap.isPending ? 'Sending…' : 'Create in SAP'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
