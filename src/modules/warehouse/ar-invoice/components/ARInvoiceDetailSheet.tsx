import { FileText, RefreshCw, Send, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { formatCurrency, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useArInvoiceAction } from '../api/ar-invoice.queries';
import type { ARInvoicePosting } from '../types';
import { ARInvoicePrintButton } from './ARInvoicePrintButton';
import { ARInvoiceStatusBadge } from './ARInvoiceStatusBadge';

function amount(value?: string | null) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  return Number.isNaN(n) ? value : formatCurrency(n);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value ?? '-'}</dd>
    </div>
  );
}

/**
 * Detail of one locally raised A/R invoice with its lifecycle actions: retry
 * the SAP post (PENDING/FAILED), re-read the approval state
 * (PENDING_APPROVAL/APPROVED), and — once approved on the warehouse Invoice
 * Approval page — allocate batches and add the draft as the real invoice.
 */
export function ARInvoiceDetailSheet({
  posting,
  open,
  onOpenChange,
  canAct,
}: {
  posting: ARInvoicePosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAct: boolean;
}) {
  const postAction = useArInvoiceAction('post');
  const refreshAction = useArInvoiceAction('refresh');
  const postDraftAction = useArInvoiceAction('postDraft');
  const cancelAction = useArInvoiceAction('cancel');
  const busy =
    postAction.isPending ||
    refreshAction.isPending ||
    postDraftAction.isPending ||
    cancelAction.isPending;

  const run = async (
    action: typeof postAction,
    id: number,
    successMessage: (p: ARInvoicePosting) => string,
    fallback: string,
  ) => {
    try {
      const updated = await action.mutateAsync(id);
      toast.success(successMessage(updated));
    } catch (error) {
      toast.error(getErrorMessage(error, fallback));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl">
        {posting ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="truncate">{posting.customer_name || posting.customer_code}</span>
                <ARInvoiceStatusBadge status={posting.status} />
              </SheetTitle>
              <SheetDescription>
                AR invoice #{posting.id}
                {` · raised ${formatDateTimeShort(posting.created_at)}`}
                {posting.created_by_name ? ` by ${posting.created_by_name}` : ''}
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Customer"
                value={`${posting.customer_name} (${posting.customer_code})`}
              />
              <Field label="Customer ref" value={posting.customer_ref || '-'} />
              <Field label="Selected lines (pre-tax)" value={amount(posting.selected_total)} />
              <Field label="Posting date" value={posting.doc_date || '-'} />
              <Field label="SAP draft" value={posting.sap_draft_entry ?? '-'} />
              <Field
                label="SAP invoice"
                value={
                  posting.sap_doc_num
                    ? `${posting.sap_doc_num} (${amount(posting.sap_doc_total)})`
                    : '-'
                }
              />
            </dl>

            {/* Printing is a read of a document SAP already holds, so it sits
                outside the `canAct` block: anyone who may see the record may
                print the bill. It appears only once there is a document — an
                approval draft has no number, tax or date to print. */}
            {posting.sap_doc_entry ? (
              <div className="flex">
                <ARInvoicePrintButton posting={posting} />
              </div>
            ) : null}

            {posting.error_message ? (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300">
                <span className="font-medium">Error:</span> {posting.error_message}
              </div>
            ) : null}
            {posting.approval_remarks ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <span className="font-medium">Approver remarks:</span> {posting.approval_remarks}
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Sales Order lines</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">SO</th>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Warehouse</th>
                      <th className="px-3 py-2 text-right font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posting.lines.map((line) => (
                      <tr key={line.id} className="border-t align-top">
                        <td className="px-3 py-2 tabular-nums">
                          {line.base_doc_num ?? line.base_entry}/{line.base_line}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{line.item_code}</span>
                          {line.description ? (
                            <span className="block text-xs text-muted-foreground">
                              {line.description}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{line.quantity ?? '-'}</td>
                        <td className="px-3 py-2">{line.warehouse_code || '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {amount(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {posting.attachments.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
                <ul className="space-y-1">
                  {posting.attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {att.file_url ? (
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-primary underline-offset-2 hover:underline"
                        >
                          {att.original_filename}
                        </a>
                      ) : (
                        <span className="truncate">{att.original_filename}</span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {att.sap_attachment_status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {canAct ? (
              <>
                <Separator />
                <div className="mt-auto flex flex-col gap-2 border-t pt-4 sm:flex-row">
                  {['PENDING', 'FAILED'].includes(posting.status) ? (
                    <Button
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        run(
                          postAction,
                          posting.id,
                          (p) =>
                            p.status === 'PENDING_APPROVAL'
                              ? `Sent to SAP — awaiting approval (draft ${p.sap_draft_entry}).`
                              : `Posted to SAP as ${p.sap_doc_num}.`,
                          'Failed to post the invoice to SAP',
                        )
                      }
                    >
                      <Upload className="mr-1 h-4 w-4" /> Post to SAP
                    </Button>
                  ) : null}
                  {['PENDING_APPROVAL', 'APPROVED'].includes(posting.status) ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        run(
                          refreshAction,
                          posting.id,
                          (p) => `Status: ${p.status_display}`,
                          'Failed to refresh from SAP',
                        )
                      }
                    >
                      <RefreshCw className="mr-1 h-4 w-4" /> Refresh status
                    </Button>
                  ) : null}
                  {posting.status === 'APPROVED' ? (
                    <Button
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        run(
                          postDraftAction,
                          posting.id,
                          (p) => `Invoice posted to SAP as ${p.sap_doc_num}.`,
                          'Failed to post the approved draft',
                        )
                      }
                    >
                      <Send className="mr-1 h-4 w-4" /> Post approved draft
                    </Button>
                  ) : null}
                  {['PENDING', 'FAILED'].includes(posting.status) ? (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        run(
                          cancelAction,
                          posting.id,
                          () => 'Invoice cancelled — its SO lines are available again.',
                          'Failed to cancel the invoice',
                        )
                      }
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Cancel & release lines
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
