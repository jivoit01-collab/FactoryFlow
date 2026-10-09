import { ExternalLink, FileCheck2, FileText, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AP_INVOICE_DRAFT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { PageHeader } from '@/shared/components/page';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort, formatDay, getErrorMessage, resolveFileUrl } from '@/shared/utils';

import { useAPInvoiceDraft, useSendToSap } from '../api';
import { SapDraftPill } from '../components/SapDraftPill';

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

/** One bill: its GRPO and the A/P invoice draft SAP holds for it. */
export default function APInvoiceDraftDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId) || null;
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(AP_INVOICE_DRAFT_PERMISSIONS.CREATE);

  const { data: entry, isLoading, isError } = useAPInvoiceDraft(id);
  const sendToSap = useSendToSap();

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !entry) {
    return <p className="p-6 text-sm text-destructive">This entry could not be loaded.</p>;
  }

  const fileUrl = resolveFileUrl(entry.invoice_file_url);
  const retry = () =>
    sendToSap.mutate(entry.id, {
      onSuccess: (result) =>
        toast.success(
          result.sap_status === 'CREATED'
            ? `Draft ${result.sap_draft_entry} is in SAP`
            : 'SAP did not take it',
        ),
      onError: (error) => toast.error(getErrorMessage(error, 'That did not work. Try again.')),
    });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={entry.entry_no}
        description={`${entry.vendor_name} · GRPO ${entry.grpo_doc_num}`}
        icon={FileCheck2}
        accent="teal"
        backTo="/warehouse/ap-invoice-drafts"
        backLabel="A/P Invoice Drafts"
      />

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
          {entry.sap_status === 'FAILED' && (
            <>
              <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">
                {entry.sap_error}
              </p>
              {canCreate && (
                <Button size="sm" onClick={retry} disabled={sendToSap.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {sendToSap.isPending ? 'Sending…' : 'Create in SAP'}
                </Button>
              )}
            </>
          )}
          {entry.sap_attachment_error && !entry.sap_attachment_entry && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The bill could not be attached in SAP ({entry.sap_attachment_error}). Attach it to the
              draft by hand.
            </p>
          )}
        </Panel>

        <Panel title="The bill">
          {fileUrl ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">No file.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
