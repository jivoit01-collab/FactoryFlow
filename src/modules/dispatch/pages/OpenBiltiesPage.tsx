import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Paperclip,
  RefreshCw,
  ScrollText,
  Send,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { PageHeader } from '@/shared/components/page';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import { useOpenBilties, usePreviewTransporterInvoice, useSubmitTransporterInvoice } from '../api';
import type { OpenBilty, TransporterAPInvoicePreview } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const parseAmount = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value?: string | number | null) =>
  parseAmount(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

const selectionKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',');

export default function OpenBiltiesPage() {
  const { data: openBilties = [], isLoading, isFetching, error, refetch } = useOpenBilties();
  const previewMutation = usePreviewTransporterInvoice();
  const submitMutation = useSubmitTransporterInvoice();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<TransporterAPInvoicePreview | null>(null);
  const [previewKey, setPreviewKey] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formError, setFormError] = useState('');

  const apiError = error as ApiError | null;
  const selectedBilties = useMemo(
    () => openBilties.filter((bilty) => selectedIds.has(bilty.service_grpo_posting_id)),
    [openBilties, selectedIds],
  );
  const selectedIdList = useMemo(
    () => selectedBilties.map((bilty) => bilty.service_grpo_posting_id),
    [selectedBilties],
  );
  const currentSelectionKey = selectionKey(selectedIdList);

  const selectedTotals = selectedBilties.reduce(
    (sum, bilty) => sum + parseAmount(bilty.grpo_doc_total),
    0,
  );
  const vendorCodes = new Set(selectedBilties.map((bilty) => bilty.vendor_code));
  const branchIds = new Set(
    selectedBilties
      .map((bilty) => bilty.branch_id)
      .filter((branchId): branchId is number => branchId != null),
  );
  const hasMixedSelection = vendorCodes.size > 1 || branchIds.size > 1;
  const isPreviewFresh = !!preview && previewKey === currentSelectionKey;
  const attachmentError = formError.toLowerCase().includes('attach');

  const toggleBilty = (bilty: OpenBilty) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(bilty.service_grpo_posting_id)) {
        next.delete(bilty.service_grpo_posting_id);
      } else {
        next.add(bilty.service_grpo_posting_id);
      }
      return next;
    });
    setPreview(null);
    setPreviewKey('');
    setFormError('');
  };

  const handlePreview = async () => {
    setFormError('');
    if (selectedIdList.length === 0) {
      setFormError('Select at least one open bilty.');
      return;
    }
    if (hasMixedSelection) {
      setFormError('Selected bilties must have the same transporter and branch.');
      return;
    }

    const first = selectedBilties[0];
    try {
      const result = await previewMutation.mutateAsync({
        service_grpo_posting_ids: selectedIdList,
        vendor_code: first.vendor_code,
        branch_id: first.branch_id,
      });
      setPreview(result);
      setPreviewKey(currentSelectionKey);
      if (!invoiceAmount) {
        setInvoiceAmount(String(parseAmount(result.selected_grpo_total)));
      }
      toast.success('SAP GRPO lines validated');
    } catch (err) {
      setPreview(null);
      setPreviewKey('');
      setFormError((err as ApiError).message || 'Preview failed.');
    }
  };

  const addAttachments = (files: FileList) => {
    setAttachments((current) => [...current, ...Array.from(files)]);
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!isPreviewFresh || !preview) {
      setFormError('Preview the selected SAP GRPO lines before submitting.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError('Transporter invoice number is required.');
      return;
    }
    if (parseAmount(invoiceAmount) <= 0) {
      setFormError('Transporter invoice amount must be greater than zero.');
      return;
    }
    if (attachments.length === 0) {
      setFormError('Attach the transporter invoice file before submitting.');
      return;
    }

    try {
      const result = await submitMutation.mutateAsync({
        service_grpo_posting_ids: selectedIdList,
        vendor_code: preview.vendor_code,
        branch_id: preview.branch_id,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate || undefined,
        invoice_amount: parseAmount(invoiceAmount),
        comments: comments || undefined,
        attachments,
      });
      toast.success(result.message || 'Transporter invoice submitted');
      setSelectedIds(new Set());
      setPreview(null);
      setPreviewKey('');
      setInvoiceNumber('');
      setInvoiceAmount('');
      setInvoiceDate(today());
      setComments('');
      setAttachments([]);
      await refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Submission failed.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Open Bilties"
        description="Select open bilty GRPOs and submit the transporter invoice for A/P posting"
        icon={ScrollText}
        accent="amber"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      {apiError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{apiError.message || 'Failed to load open bilties.'}</span>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-3 rounded-md border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="font-semibold">Available Bilties</h3>
                <p className="text-sm text-muted-foreground">
                  Posted service GRPOs not yet submitted for transporter invoicing
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{selectedIds.size} selected</p>
                <p className="text-muted-foreground">{formatCurrency(selectedTotals)}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : openBilties.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No open bilties are available for invoicing.
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="w-10 p-3" aria-label="Select" />
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Bilty
                      </th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Dispatch Bill
                      </th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Bilty / SAP GRPO
                      </th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Transporter
                      </th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Vehicle
                      </th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Branch
                      </th>
                      <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        GRPO Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openBilties.map((bilty) => {
                      const checked = selectedIds.has(bilty.service_grpo_posting_id);
                      return (
                        <tr
                          key={bilty.service_grpo_posting_id}
                          className="border-t transition-colors hover:bg-muted/40"
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleBilty(bilty)}
                              aria-label={`Select bilty ${bilty.bilty_no || bilty.grpo_doc_num}`}
                            />
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">{bilty.bilty_no || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(bilty.bilty_date)}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {bilty.sap_invoice_doc_num || bilty.sap_invoice_doc_entry}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">Bilty #{bilty.bilty_no || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              SAP {bilty.grpo_doc_num || '-'} / DocEntry {bilty.grpo_doc_entry}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">
                              {bilty.transporter_name || bilty.vendor_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{bilty.vendor_code}</div>
                          </td>
                          <td className="p-3 text-sm">
                            <div>{bilty.vehicle_no || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {bilty.driver_name || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-sm">{bilty.branch_id ?? '-'}</td>
                          <td className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {formatCurrency(bilty.grpo_doc_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="font-semibold">Submit Transporter Invoice</h3>
              <p className="text-sm text-muted-foreground">
                Creates a pending A/P Invoice record for finance posting
              </p>
            </div>

            {hasMixedSelection && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Selection contains mixed transporter or branch values.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Summary label="Vendor" value={selectedBilties[0]?.vendor_code || '-'} />
              <Summary label="Branch" value={selectedBilties[0]?.branch_id ?? '-'} />
              <Summary label="Selected GRPOs" value={selectedBilties.length} />
              <Summary label="Local Total" value={formatCurrency(selectedTotals)} />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePreview}
              disabled={previewMutation.isPending || selectedIds.size === 0}
            >
              <Eye className="mr-2 h-4 w-4" />
              {previewMutation.isPending ? 'Previewing...' : 'Preview SAP Lines'}
            </Button>

            {isPreviewFresh && preview && (
              <div className="rounded-md border bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
                <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium">SAP lines validated</p>
                    <p>
                      {preview.lines.length} line(s), total{' '}
                      {formatCurrency(preview.selected_grpo_total)}
                    </p>
                    <p className="text-xs">
                      Bilty No.{' '}
                      {preview.lines
                        .map((line) => line.bilty_no || line.grpo_doc_num || line.grpo_doc_entry)
                        .filter((value, index, values) => values.indexOf(value) === index)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="Transporter invoice number"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={invoiceAmount}
                    onChange={(event) => setInvoiceAmount(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comments</Label>
                <Textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  className="min-h-20"
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium">
                Invoice Attachment <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Required. Upload the transporter invoice before submitting.
              </p>
              <Button
                type="button"
                variant={attachmentError ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';
                  input.onchange = (event) => {
                    const files = (event.target as HTMLInputElement).files;
                    if (files?.length) addAttachments(files);
                  };
                  input.click();
                }}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Choose Files
              </Button>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded border bg-muted/30 p-2 text-sm"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-muted"
                        onClick={() =>
                          setAttachments((current) =>
                            current.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachmentError && (
                <p className="text-xs text-destructive">Invoice attachment is required.</p>
              )}
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit Invoice'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {isPreviewFresh && preview && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4">
              <h3 className="font-semibold">Previewed SAP Lines</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Bilty
                    </th>
                    <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Bilty / SAP GRPO
                    </th>
                    <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Line
                    </th>
                    <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </th>
                    <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Tax
                    </th>
                    <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Line Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((line) => (
                    <tr key={`${line.grpo_doc_entry}-${line.grpo_line_num}`} className="border-t">
                      <td className="p-3 text-sm">{line.bilty_no || '-'}</td>
                      <td className="p-3 text-sm">
                        <div className="font-medium">Bilty #{line.bilty_no || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          SAP {line.grpo_doc_num || '-'} / DocEntry {line.grpo_doc_entry}
                        </div>
                      </td>
                      <td className="p-3 text-sm">{line.grpo_line_num}</td>
                      <td className="p-3 text-sm">{line.service_description}</td>
                      <td className="p-3 text-sm">{line.tax_code || '-'}</td>
                      <td className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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
