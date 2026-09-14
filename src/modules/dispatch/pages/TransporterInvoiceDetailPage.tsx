import { AlertCircle, ArrowLeft, CheckCircle2, FileText, RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

import { usePostSubmittedAPInvoice, useTransporterInvoiceDetail } from '../api';
import type {
  TransporterAPInvoiceLine,
  TransporterAPInvoicePostResponse,
  TransporterAPInvoiceStatus,
} from '../types';

const today = () => new Date().toISOString().slice(0, 10);

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

const formatCurrency = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

export default function TransporterInvoiceDetailPage() {
  const navigate = useNavigate();
  const { postingId } = useParams<{ postingId: string }>();
  const id = postingId ? parseInt(postingId, 10) : null;
  const { data: posting, isLoading, error, refetch } = useTransporterInvoiceDetail(id);
  const postMutation = usePostSubmittedAPInvoice();
  const [docDate, setDocDate] = useState(today());
  const [docDueDate, setDocDueDate] = useState(today());
  const [taxDate, setTaxDate] = useState(today());
  const [comments, setComments] = useState('');
  const [postingError, setPostingError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [successResult, setSuccessResult] = useState<TransporterAPInvoicePostResponse | null>(null);
  const apiError = error as ApiError | null;
  const canPostToSap = posting?.status === 'PENDING' || posting?.status === 'FAILED';

  const handlePostClick = () => {
    if (!posting) return;
    setPostingError('');

    if (posting.attachments.length === 0) {
      setPostingError('At least one invoice attachment is required before SAP posting.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmPost = async () => {
    if (!posting) return;
    setPostingError('');

    try {
      const result = await postMutation.mutateAsync({
        postingId: posting.id,
        data: {
          doc_date: docDate || undefined,
          doc_due_date: docDueDate || undefined,
          tax_date: taxDate || undefined,
          comments: comments || undefined,
        },
      });
      toast.success(result.message || 'A/P Invoice posted to SAP');
      setComments('');
      setShowConfirm(false);
      setSuccessResult(result);
      await refetch();
    } catch (err) {
      const postError = err as ApiError;
      setShowConfirm(false);
      setPostingError(
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
          <div className="mb-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/transporter-invoices/history')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">
              {posting?.invoice_number || 'A/P Invoice'}
            </h2>
          </div>
          <p className="text-muted-foreground">A/P Invoice posting detail</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{apiError.message || 'Failed to load A/P Invoice detail.'}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && posting && (
        <>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClass(posting.status)}>{posting.status}</Badge>
                {posting.sap_doc_num && (
                  <span className="text-sm text-muted-foreground">
                    SAP A/P Invoice #{posting.sap_doc_num}
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Fact
                  label="Vendor"
                  value={`${posting.vendor_name || '-'} (${posting.vendor_code})`}
                />
                <Fact label="Invoice Amount" value={formatCurrency(posting.invoice_amount)} />
                <Fact label="GRPO Total" value={formatCurrency(posting.selected_grpo_total)} />
                <Fact label="Difference" value={formatCurrency(posting.amount_difference)} />
                <Fact label="Branch" value={posting.branch_id} />
                <Fact label="SAP A/P DocEntry" value={posting.sap_doc_entry || '-'} />
                <Fact label="Invoice Date" value={posting.invoice_date || '-'} />
                <Fact label="Posted At" value={formatDateTime(posting.posted_at)} />
                <Fact label="Created At" value={formatDateTime(posting.created_at)} />
              </div>
              {posting.error_message && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {posting.error_message}
                </div>
              )}
              {posting.comments && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-1 font-medium">Comments</p>
                  <p className="text-muted-foreground">{posting.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {canPostToSap && (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Post to SAP</h3>
                    <p className="text-sm text-muted-foreground">
                      Creates one SAP A/P Invoice from the selected bilty GRPO base lines.
                    </p>
                  </div>
                  <Badge variant="outline">{posting.lines.length} GRPO line(s)</Badge>
                </div>

                {posting.attachments.length > 0 ? (
                  <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{posting.attachments.length} invoice attachment(s) ready for SAP.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>Invoice attachment is required before posting to SAP.</span>
                  </div>
                )}

                {postingError && (
                  <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{postingError}</span>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  <DateInput label="Doc Date" value={docDate} onChange={setDocDate} />
                  <DateInput label="Due Date" value={docDueDate} onChange={setDocDueDate} />
                  <DateInput label="Tax Date" value={taxDate} onChange={setTaxDate} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">SAP Posting Comments</Label>
                  <Textarea
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    className="min-h-20"
                    placeholder="Optional remarks for SAP"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handlePostClick}
                  disabled={postMutation.isPending || posting.attachments.length === 0}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {postMutation.isPending ? 'Posting to SAP...' : 'Review & Post A/P Invoice'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="border-b p-4">
                <h3 className="font-semibold">Bilty GRPO Lines</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Bilty</th>
                      <th className="p-3 text-left text-sm font-medium">Bilty / GRPO Doc No.</th>
                      <th className="p-3 text-left text-sm font-medium">GRPO DocEntry</th>
                      <th className="p-3 text-left text-sm font-medium">Line</th>
                      <th className="p-3 text-left text-sm font-medium">Description</th>
                      <th className="p-3 text-left text-sm font-medium">Tax</th>
                      <th className="p-3 text-right text-sm font-medium">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posting.lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="p-3 text-sm">{line.bilty_no || '-'}</td>
                        <td className="p-3 text-sm">
                          <div className="font-medium">Bilty #{line.bilty_no || '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            SAP {line.base_doc_num || '-'}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{line.base_entry}</td>
                        <td className="p-3 text-sm">{line.base_line}</td>
                        <td className="p-3 text-sm">{line.service_description}</td>
                        <td className="p-3 text-sm">{line.tax_code || '-'}</td>
                        <td className="p-3 text-right text-sm font-medium">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <h3 className="font-semibold">Attachments</h3>
              {posting.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments recorded.</p>
              ) : (
                posting.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{attachment.original_filename}</span>
                    </span>
                    <Badge variant="outline">{attachment.sap_attachment_status}</Badge>
                  </a>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showConfirm} onOpenChange={() => setShowConfirm(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm A/P Invoice Posting</DialogTitle>
            <DialogDescription>Review the details below before posting to SAP.</DialogDescription>
          </DialogHeader>
          {posting && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-medium">{posting.invoice_number}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Vendor</span>
                <span className="text-right font-medium">
                  {posting.vendor_name || posting.vendor_code}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{posting.branch_id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">GRPO Lines</span>
                <span className="font-medium">{posting.lines.length}</span>
              </div>
              <BaseLineSummary lines={posting.lines} />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Attachments</span>
                <span className="font-medium">{posting.attachments.length} file(s)</span>
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
                <span className="font-semibold">{formatCurrency(posting.invoice_amount)}</span>
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
          <DialogFooter>
            <Button className="w-full" onClick={() => setSuccessResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
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
