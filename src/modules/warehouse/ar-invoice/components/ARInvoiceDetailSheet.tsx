import { BadgeIndianRupee, FileText, RefreshCw, Send, Upload, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AR_INVOICE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmSapPost, type SapPostConfirmOptions } from '@/shared/components';
import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { formatCurrency, formatDate, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useArInvoiceAction } from '../api/ar-invoice.queries';
import type { ARInvoicePosting } from '../types';
import { billTotals, lineInclTax } from '../utils/tax';
import { ARInvoicePrintButton } from './ARInvoicePrintButton';
import { ARInvoiceStatusBadge } from './ARInvoiceStatusBadge';
import { ARPaymentBadge, ARPaymentDialog } from './ARPaymentControls';

function amount(value?: string | null) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  return Number.isNaN(n) ? value : formatCurrency(n);
}

/**
 * The bill's money: before tax, the tax, and the total the customer pays.
 * Until SAP posts the bill there is no total of SAP's to show, so the tax is
 * worked out from the lines' tax codes and marked as an estimate — showing
 * only the pre-tax figure read as the bill being short (₹304.76 for two ₹160
 * pouches).
 */
function BillTotals({ posting }: { posting: ARInvoicePosting }) {
  const totals = billTotals(posting.lines);
  const sapTotal = posting.sap_doc_total ? Number(posting.sap_doc_total) : null;
  const total = sapTotal ?? totals.inclTax;
  const tax = sapTotal != null ? sapTotal - totals.beforeTax : totals.tax;
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Before tax</dt>
          <dd className="tabular-nums">{formatCurrency(totals.beforeTax)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">GST{sapTotal == null ? ' (estimated)' : ''}</dt>
          <dd className="tabular-nums">{tax == null ? '-' : formatCurrency(tax)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1 text-base font-semibold">
          <dt>Total incl. tax</dt>
          <dd className="tabular-nums">
            {total == null ? '-' : `${sapTotal == null ? '≈ ' : ''}${formatCurrency(total)}`}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {sapTotal != null
          ? `SAP's total on invoice ${posting.sap_doc_num ?? ''}.`
          : total == null
            ? 'A line has no tax rate in its tax code, so the tax is not estimated. SAP adds it when it posts the bill.'
            : 'Worked out from the tax codes. SAP adds the tax when it posts the bill, and its total is final.'}
      </p>
    </div>
  );
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
 *
 * A bill raised from a warehouse its raiser does not manage shows who it is
 * waiting on (AWAITING_MANAGER); it can be cancelled until then, and posts
 * itself to SAP when the last of those managers approves it.
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
  const { hasPermission } = usePermission();
  const canMarkPayment = hasPermission(AR_INVOICE_PERMISSIONS.MARK_PAYMENT);
  const [payOpen, setPayOpen] = useState(false);
  const postAction = useArInvoiceAction('post');
  const refreshAction = useArInvoiceAction('refresh');
  const postDraftAction = useArInvoiceAction('postDraft');
  const cancelAction = useArInvoiceAction('cancel');
  const hasSoLines = posting?.lines.some((line) => line.base_entry != null) ?? false;
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
    /** Omitted by the actions that only read SAP, like refreshing a status. */
    warning?: SapPostConfirmOptions,
  ) => {
    if (warning && !(await confirmSapPost(warning))) return;
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
              <Field label="Posting date" value={posting.doc_date || '-'} />
              <Field label="SAP draft" value={posting.sap_draft_entry ?? '-'} />
              <Field label="SAP invoice" value={posting.sap_doc_num ?? '-'} />
            </dl>

            <BillTotals posting={posting} />

            {/* Printing is a read of a document SAP already holds, so it sits
                outside the `canAct` block: anyone who may see the record may
                print the bill. It appears only once there is a document — an
                approval draft has no number, tax or date to print. */}
            {posting.sap_doc_entry ? (
              <div className="flex">
                <ARInvoicePrintButton posting={posting} />
              </div>
            ) : null}

            {/* Whether the money came in — this app's own book, not SAP's.
                Only once there is a bill: nothing collects against a draft. */}
            {posting.sap_doc_entry ? (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Payment
                    </p>
                    <p className="mt-1 text-sm">
                      {posting.payment ? (
                        <>
                          {posting.payment.status_display}
                          {posting.payment.received_on
                            ? ` on ${formatDate(posting.payment.received_on)}`
                            : ''}
                          {posting.payment.amount
                            ? ` · ${amount(posting.payment.amount)}`
                            : ''}
                          {posting.payment.mode_display
                            ? ` · ${posting.payment.mode_display}`
                            : ''}
                          {posting.payment.reference
                            ? ` · ref ${posting.payment.reference}`
                            : ''}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Nobody has recorded whether this bill was paid.
                        </span>
                      )}
                    </p>
                    {posting.payment?.remarks ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {posting.payment.remarks}
                      </p>
                    ) : null}
                    {posting.payment?.marked_by_name ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Marked by {posting.payment.marked_by_name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ARPaymentBadge payment={posting.payment} />
                    {canMarkPayment ? (
                      <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
                        <BadgeIndianRupee className="mr-1 h-4 w-4" />
                        {posting.payment ? 'Update' : 'Mark'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {posting.sap_doc_entry ? (
              <ARPaymentDialog
                open={payOpen}
                onOpenChange={setPayOpen}
                docEntry={posting.sap_doc_entry}
                docNum={posting.sap_doc_num}
                docTotal={posting.sap_doc_total ? Number(posting.sap_doc_total) : null}
                customerName={posting.customer_name || posting.customer_code}
                payment={posting.payment}
              />
            ) : null}

            {posting.error_message ? (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                <span className="font-medium">Error:</span> {posting.error_message}
              </div>
            ) : null}
            {posting.approval_remarks ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <span className="font-medium">Approver remarks:</span> {posting.approval_remarks}
              </div>
            ) : null}

            {posting.warehouse_approvals.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Warehouse approval</h3>
                <ul className="space-y-2">
                  {posting.warehouse_approvals.map((approval) => (
                    <li
                      key={approval.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{approval.warehouse_code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {approval.status === 'PENDING'
                            ? approval.approvers.length > 0
                              ? `Waiting on ${approval.approvers.join(', ')}`
                              : 'No manager who can approve is set for this warehouse — ask an administrator'
                            : `${approval.status_display} by ${approval.decided_by_name ?? 'unknown'}${
                                approval.decided_at
                                  ? ` · ${formatDateTimeShort(approval.decided_at)}`
                                  : ''
                              }`}
                        </span>
                        {approval.remarks ? (
                          <span className="block text-xs text-muted-foreground">
                            {approval.remarks}
                          </span>
                        ) : null}
                      </span>
                      <ARInvoiceStatusBadge status={approval.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              {/* A counter sale has no Sales Order, so no SO column to fill. */}
              <h3 className="mb-2 text-sm font-semibold">
                {hasSoLines ? 'Sales Order lines' : 'Lines'}
              </h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {hasSoLines ? <th className="px-3 py-2 font-medium">SO</th> : null}
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit price</th>
                      <th className="px-3 py-2 text-right font-medium">Before tax</th>
                      <th className="px-3 py-2 text-right font-medium">Incl. tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posting.lines.map((line) => {
                      const gross = lineInclTax(Number(line.line_total), line.tax_code);
                      return (
                        <tr key={line.id} className="border-t align-top">
                          {hasSoLines ? (
                            <td className="px-3 py-2 tabular-nums">
                              {line.base_entry != null
                                ? `${line.base_doc_num ?? line.base_entry}/${line.base_line}`
                                : '-'}
                            </td>
                          ) : null}
                          <td className="px-3 py-2">
                            <span className="font-medium">{line.item_code}</span>
                            {line.description ? (
                              <span className="block text-xs text-muted-foreground">
                                {line.description}
                              </span>
                            ) : null}
                            <span className="block text-xs text-muted-foreground">
                              {[line.warehouse_code, line.tax_code].filter(Boolean).join(' · ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {line.quantity == null ? '-' : Number(line.quantity)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {amount(line.price)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {amount(line.line_total)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {gross == null ? '-' : formatCurrency(gross)}
                          </td>
                        </tr>
                      );
                    })}
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
                          {
                            title: 'Post this invoice to SAP?',
                            details: [
                              { label: 'Creates', value: 'A/R invoice' },
                              {
                                label: 'Customer',
                                value: posting.customer_name || posting.customer_code,
                              },
                              {
                                label: 'Value before tax',
                                value: amount(posting.selected_total),
                              },
                              {
                                label: 'Total incl. tax (est.)',
                                value: (() => {
                                  const { inclTax } = billTotals(posting.lines);
                                  return inclTax == null ? '-' : formatCurrency(inclTax);
                                })(),
                              },
                            ],
                          },
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
                          {
                            title: 'Turn this approved draft into a real invoice?',
                            details: [
                              { label: 'Creates', value: 'A/R invoice from the approved draft' },
                              { label: 'SAP draft', value: posting.sap_draft_entry },
                              { label: 'Batches', value: 'Allocated onto the draft first' },
                            ],
                            confirmLabel: 'Post the invoice',
                          },
                        )
                      }
                    >
                      <Send className="mr-1 h-4 w-4" /> Post approved draft
                    </Button>
                  ) : null}
                  {['PENDING', 'AWAITING_MANAGER', 'FAILED'].includes(posting.status) ? (
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
