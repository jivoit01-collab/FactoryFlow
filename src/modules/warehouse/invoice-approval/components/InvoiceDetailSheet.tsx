import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, History, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';
import { cn, formatCurrency, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import {
  useInvoiceAudit,
  useInvoiceHistory,
  useUpdateInvoiceStatus,
} from '../api/invoice-approval.queries';
import { type RejectInvoiceFormData, rejectInvoiceSchema } from '../schemas/invoice-approval.schema';
import { ACTIONABLE_TABS, type InvoiceLog, type InvoiceTab } from '../types';
import { DocumentLinesTable } from './DocumentLinesTable';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

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
 * The stateful body. Keyed by invoice id in the parent, so switching invoices (or
 * closing the sheet) remounts it and resets all transient UI — no effect needed.
 */
function InvoiceDetailBody({
  invoice,
  canApprove,
  onClose,
}: {
  invoice: InvoiceLog;
  canApprove: boolean;
  onClose: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const updateStatus = useUpdateInvoiceStatus();
  const historyQuery = useInvoiceHistory(historyOpen ? invoice.id : null);
  const auditQuery = useInvoiceAudit(auditOpen ? invoice.id : null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectInvoiceFormData>({ resolver: zodResolver(rejectInvoiceSchema) });

  const isActionable = ACTIONABLE_TABS.includes(invoice.status as InvoiceTab);
  const busy = updateStatus.isPending;
  const auditContext = {
    so_number: invoice.so_number,
    party_name: invoice.party_name,
    total_amount: invoice.total_amount,
  };

  const approve = async () => {
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { status: 'APPROVED', ...auditContext },
      });
      toast.success(`Invoice ${invoice.so_number} approved`);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve the invoice'));
    }
  };

  const reject = async (data: RejectInvoiceFormData) => {
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { status: 'REJECTED', rejection_reason: data.rejection_reason, ...auditContext },
      });
      toast.success(`Invoice ${invoice.so_number} rejected`);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject the invoice'));
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <span className="truncate">{invoice.party_name}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </SheetTitle>
        <SheetDescription>
          SO {invoice.so_number} · raised {formatDateTimeShort(invoice.created_at)}
        </SheetDescription>
      </SheetHeader>

      <dl className="grid grid-cols-2 gap-4">
        <Field label="SO Number" value={invoice.so_number} />
        <Field label="Amount" value={amount(invoice.total_amount)} />
        <Field label="Warehouse" value={invoice.warehouse || '-'} />
        <Field label="Branch" value={invoice.branch || '-'} />
      </dl>

      {invoice.rejection_reason ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <span className="font-medium">Rejection reason:</span> {invoice.rejection_reason}
        </div>
      ) : null}
      {invoice.error_message ? (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300">
          <span className="font-medium">Error:</span> {invoice.error_message}
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Line items</h3>
        <DocumentLinesTable lines={invoice.invoice_payload?.DocumentLines} />
      </div>

      <Separator />

      {/* Approval history (from OMS) */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" /> Approval history
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', historyOpen && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <ol className="space-y-2">
              {historyQuery.data.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <InvoiceStatusBadge status={record.status} />
                    <span className="text-muted-foreground">
                      {record.created_by || record.created_by_name || 'Unknown'}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeShort(record.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Local audit (who acted on the JI side) */}
      <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Factory audit
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', auditOpen && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {auditQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : auditQuery.data && auditQuery.data.length > 0 ? (
            <ol className="space-y-2">
              {auditQuery.data.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <InvoiceStatusBadge status={row.decision} />
                    <span className="text-muted-foreground">{row.acted_by_name || 'Unknown'}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeShort(row.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No local audit records.</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Actions (only on PENDING / EDITED, and only for approvers) */}
      {isActionable ? (
        <div className="mt-auto border-t pt-4">
          {!canApprove ? (
            <p className="text-sm text-muted-foreground">
              You don't have permission to approve or reject invoices.
            </p>
          ) : rejecting ? (
            <form onSubmit={handleSubmit(reject)} className="space-y-2">
              <label className="text-sm font-medium">Rejection reason</label>
              <Textarea
                autoFocus
                rows={3}
                placeholder="e.g. batch not physically available, quantity mismatch…"
                {...register('rejection_reason')}
              />
              {errors.rejection_reason ? (
                <p className="text-sm text-red-600">{errors.rejection_reason.message}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" disabled={busy}>
                  <Check className="mr-1 h-4 w-4" /> Confirm reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRejecting(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={approve}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

export function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
  canApprove,
}: {
  invoice: InvoiceLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl">
        {invoice ? (
          <InvoiceDetailBody
            key={invoice.id}
            invoice={invoice}
            canApprove={canApprove}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
