import { AlertCircle, CheckCircle2, ChevronRight, FileText, RefreshCw, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import { usePostSubmittedAPInvoice, useTransporterInvoiceHistory } from '../api';
import type {
  TransporterAPInvoiceLine,
  TransporterAPInvoicePosting,
  TransporterAPInvoicePostResponse,
  TransporterAPInvoiceStatus,
} from '../types';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS: Record<TransporterAPInvoiceStatus, string> = {
  PENDING: 'Pending',
  POSTED: 'Posted',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const statusClass = (status: TransporterAPInvoiceStatus) => {
  switch (status) {
    case 'POSTED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatCurrency = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export default function TransporterInvoiceQueuePage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading, error, refetch } = useTransporterInvoiceHistory();
  const postMutation = usePostSubmittedAPInvoice();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [docDate, setDocDate] = useState(today());
  const [docDueDate, setDocDueDate] = useState(today());
  const [taxDate, setTaxDate] = useState(today());
  const [comments, setComments] = useState('');
  const [formError, setFormError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [successResult, setSuccessResult] = useState<TransporterAPInvoicePostResponse | null>(null);

  const apiError = error as ApiError | null;
  const queue = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 'FAILED'),
    [invoices],
  );
  const selectedInvoice = useMemo(
    () => queue.find((invoice) => invoice.id === selectedId) || queue[0] || null,
    [queue, selectedId],
  );

  const handlePostClick = () => {
    setFormError('');
    if (!selectedInvoice) {
      setFormError('Select a submitted invoice to post.');
      return;
    }
    if (selectedInvoice.attachments.length === 0) {
      setFormError('At least one invoice attachment is required before SAP posting.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmPost = async () => {
    setFormError('');
    if (!selectedInvoice) {
      setFormError('Select a submitted invoice to post.');
      setShowConfirm(false);
      return;
    }

    try {
      const result = await postMutation.mutateAsync({
        postingId: selectedInvoice.id,
        data: {
          doc_date: docDate || undefined,
          doc_due_date: docDueDate || undefined,
          tax_date: taxDate || undefined,
          comments: comments || undefined,
        },
      });
      toast.success(result.message || 'A/P Invoice posted to SAP');
      setSelectedId(null);
      setComments('');
      setShowConfirm(false);
      setSuccessResult(result);
      await refetch();
    } catch (err) {
      const postError = err as ApiError;
      setShowConfirm(false);
      setFormError(
        postError.response?.data?.detail ||
          postError.detail ||
          postError.message ||
          'SAP posting failed.',
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pending A/P Invoice</h2>
          <p className="text-muted-foreground">
            Review submitted transporter invoices and post them to SAP
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => navigate('/dispatch/transporter-invoices')}>
            <FileText className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/dispatch/open-bilties')}>
            <FileText className="mr-2 h-4 w-4" />
            Open Bilties
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{apiError.message || 'Failed to load A/P invoices.'}</span>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-3 rounded-md border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4">
              <h3 className="font-semibold">Submitted Invoices</h3>
              <p className="text-sm text-muted-foreground">
                Pending and failed invoices waiting for SAP A/P posting
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : queue.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No submitted invoices are waiting for SAP posting.
              </div>
            ) : (
              <div className="divide-y">
                {queue.map((invoice) => (
                  <InvoiceQueueRow
                    key={invoice.id}
                    invoice={invoice}
                    selected={selectedInvoice?.id === invoice.id}
                    onSelect={() => {
                      setSelectedId(invoice.id);
                      setFormError('');
                    }}
                    onDetail={() =>
                      navigate(`/dispatch/transporter-invoices/history/${invoice.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="font-semibold">Post to SAP</h3>
              <p className="text-sm text-muted-foreground">
                Creates the SAP A/P Invoice from selected GRPO base lines
              </p>
            </div>

            {selectedInvoice ? (
              <>
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                      <p className="truncate text-muted-foreground">
                        {selectedInvoice.vendor_name || selectedInvoice.vendor_code}
                      </p>
                    </div>
                    <Badge className={statusClass(selectedInvoice.status)}>
                      {STATUS_LABELS[selectedInvoice.status]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Summary
                    label="Invoice Amount"
                    value={formatCurrency(selectedInvoice.invoice_amount)}
                  />
                  <Summary
                    label="GRPO Total"
                    value={formatCurrency(selectedInvoice.selected_grpo_total)}
                  />
                  <Summary label="Branch" value={selectedInvoice.branch_id} />
                  <Summary label="Bilty Lines" value={selectedInvoice.lines.length} />
                </div>

                {selectedInvoice.error_message && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {selectedInvoice.error_message}
                  </div>
                )}

                <div className="grid gap-3">
                  <DateInput label="Doc Date" value={docDate} onChange={setDocDate} />
                  <DateInput label="Due Date" value={docDueDate} onChange={setDocDueDate} />
                  <DateInput label="Tax Date" value={taxDate} onChange={setTaxDate} />
                  <div className="space-y-1">
                    <Label className="text-xs">SAP Posting Comments</Label>
                    <Textarea
                      value={comments}
                      onChange={(event) => setComments(event.target.value)}
                      className="min-h-20"
                      placeholder="Optional remarks for SAP"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handlePostClick}
                  disabled={postMutation.isPending || selectedInvoice.attachments.length === 0}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {postMutation.isPending ? 'Posting to SAP...' : 'Review & Post A/P Invoice'}
                </Button>
              </>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select a submitted invoice from the queue.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirm} onOpenChange={() => setShowConfirm(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm A/P Invoice Posting</DialogTitle>
            <DialogDescription>Review the details below before posting to SAP.</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-medium">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Vendor</span>
                <span className="text-right font-medium">
                  {selectedInvoice.vendor_name || selectedInvoice.vendor_code}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{selectedInvoice.branch_id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">GRPO Lines</span>
                <span className="font-medium">{selectedInvoice.lines.length}</span>
              </div>
              <BaseLineSummary lines={selectedInvoice.lines} />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Attachments</span>
                <span className="font-medium">{selectedInvoice.attachments.length} file(s)</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Doc Date</span>
                <span className="font-medium">{docDate || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax Date</span>
                <span className="font-medium">{taxDate || '-'}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3">
                <span className="font-semibold">Invoice Amount</span>
                <span className="font-semibold">
                  {formatCurrency(selectedInvoice.invoice_amount)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPost} disabled={postMutation.isPending}>
              {postMutation.isPending ? 'Posting...' : 'Confirm Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!successResult} onOpenChange={() => setSuccessResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Success
            </DialogTitle>
            <DialogDescription>A/P Invoice posted successfully to SAP.</DialogDescription>
          </DialogHeader>
          {successResult && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">SAP Document Number</span>
                <span className="font-semibold">{successResult.sap_doc_num}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">SAP DocEntry</span>
                <span className="font-semibold">{successResult.sap_doc_entry}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-semibold">
                  {formatCurrency(successResult.sap_doc_total || 0)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (successResult) {
                  navigate(
                    `/dispatch/transporter-invoices/history/${successResult.transporter_ap_invoice_posting_id}`,
                  );
                }
              }}
            >
              View Detail
            </Button>
            <Button className="w-full" onClick={() => setSuccessResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function BaseLineSummary({ lines }: { lines: TransporterAPInvoiceLine[] }) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        SAP GRPO Base Lines
      </div>
      <div className="max-h-44 overflow-auto">
        <table className="w-full min-w-[520px]">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium">Bilty</th>
              <th className="px-3 py-2 text-left text-xs font-medium">Bilty / Doc No.</th>
              <th className="px-3 py-2 text-left text-xs font-medium">DocEntry</th>
              <th className="px-3 py-2 text-left text-xs font-medium">Line</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-3 py-2 text-xs">{line.bilty_no || '-'}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium">Bilty #{line.bilty_no || '-'}</div>
                  <div className="text-muted-foreground">SAP {line.base_doc_num || '-'}</div>
                </td>
                <td className="px-3 py-2 text-xs">{line.base_entry}</td>
                <td className="px-3 py-2 text-xs">{line.base_line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceQueueRow({
  invoice,
  selected,
  onSelect,
  onDetail,
}: {
  invoice: TransporterAPInvoicePosting;
  selected: boolean;
  onSelect: () => void;
  onDetail: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 p-4 transition-colors ${
        selected ? 'bg-primary/5' : 'hover:bg-muted/40'
      }`}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{invoice.invoice_number}</span>
          <Badge className={statusClass(invoice.status)}>{STATUS_LABELS[invoice.status]}</Badge>
          {invoice.attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {invoice.attachments.length} attachment(s)
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {invoice.vendor_name || invoice.vendor_code} / {invoice.lines.length} bilty line(s)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Submitted {formatDateTime(invoice.created_at)}
        </p>
      </button>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-medium">{formatCurrency(invoice.invoice_amount)}</p>
          <p className="text-xs text-muted-foreground">Branch {invoice.branch_id}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDetail}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
