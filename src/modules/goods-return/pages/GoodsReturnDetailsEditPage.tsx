import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { StepHeader } from '@/modules/gate/components';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';

import {
  type GoodsReturnDetail,
  useAddInvoiceRef,
  useDeleteAttachment,
  useGoodsReturn,
  useRemoveInvoiceRef,
  useUpdateGoodsReturnHeader,
  useUploadAttachment,
} from '../api';
import { ATTACHMENT_TYPE_BY_BASIS, BASIS_LABELS } from '../utils';

export default function GoodsReturnDetailsEditPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);
  const { data: detail, isLoading } = useGoodsReturn(id);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return <DetailsEditForm key={detail.id} id={id} detail={detail} />;
}

function DetailsEditForm({ id, detail }: { id: number; detail: GoodsReturnDetail }) {
  const navigate = useNavigate();
  const isInvoiceBasis = detail.basis === 'INVOICE';

  const addInvoice = useAddInvoiceRef(id);
  const removeInvoice = useRemoveInvoiceRef(id);
  const uploadAttachment = useUploadAttachment(id);
  const deleteAttachment = useDeleteAttachment(id);
  const updateHeader = useUpdateGoodsReturnHeader(id);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState(detail.customer_name);
  const [customerCode, setCustomerCode] = useState(detail.customer_code);
  const [error, setError] = useState<string | null>(null);

  async function handleAddInvoice() {
    const number = invoiceNumber.trim();
    if (!number) {
      setError('Enter the SAP invoice number.');
      return;
    }
    setError(null);
    try {
      await addInvoice.mutateAsync(number);
      setInvoiceNumber('');
      toast.success(`Invoice ${number} added`);
    } catch (err) {
      setError(readError(err, `No SAP invoice found for ${number}.`));
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    try {
      for (const file of Array.from(fileList)) {
        await uploadAttachment.mutateAsync({
          file,
          attachmentType: ATTACHMENT_TYPE_BY_BASIS[detail.basis],
        });
      }
      toast.success('Document uploaded');
    } catch (err) {
      setError(readError(err, 'Could not upload the document.'));
    }
  }

  async function handleContinue() {
    setError(null);
    if (isInvoiceBasis && detail.invoice_refs.length === 0) {
      setError('Add at least one invoice.');
      return;
    }
    if (!isInvoiceBasis && !customerName.trim()) {
      setError('Enter the customer name.');
      return;
    }
    if (detail.attachments.length === 0) {
      setError('Upload at least one supporting document.');
      return;
    }
    try {
      if (!isInvoiceBasis) {
        await updateHeader.mutateAsync({
          customer_name: customerName.trim(),
          customer_code: customerCode.trim(),
        });
      }
      navigate(`/goods-return/edit/${id}/items`);
    } catch (err) {
      setError(readError(err, 'Could not save the details.'));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StepHeader currentStep={1} totalSteps={3} title="Goods Return" error={error} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{detail.entry_no}</span>
        <Badge variant="outline">{BASIS_LABELS[detail.basis]}</Badge>
      </div>

      {/* Source */}
      {isInvoiceBasis ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <SectionTitle icon={<ReceiptText className="h-4 w-4" />} title="Source Invoice(s)" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddInvoice();
                  }
                }}
                placeholder="Enter SAP invoice number"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddInvoice}
                disabled={addInvoice.isPending}
              >
                {addInvoice.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Invoice
              </Button>
            </div>

            {detail.customer_name && (
              <p className="text-sm text-muted-foreground">
                Customer: <span className="font-medium text-foreground">{detail.customer_name}</span>{' '}
                ({detail.customer_code})
              </p>
            )}

            {detail.invoice_refs.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Search and add the invoice(s) this return is booked against.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.invoice_refs.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <p className="font-medium">Invoice {ref.sap_invoice_doc_num}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeInvoice.mutate(ref.id)}
                      disabled={removeInvoice.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <SectionTitle icon={<ReceiptText className="h-4 w-4" />} title="Customer" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Code</Label>
                <Input
                  value={customerCode}
                  onChange={(event) => setCustomerCode(event.target.value)}
                  placeholder="SAP business-partner code (optional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionTitle
            icon={<FileText className="h-4 w-4" />}
            title={`${isInvoiceBasis ? 'Invoice' : BASIS_LABELS[detail.basis]} Documents *`}
          />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
            {uploadAttachment.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
            <span>Click to upload documents (required)</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
          </label>
          {detail.attachments.length > 0 && (
            <div className="space-y-2">
              {detail.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline"
                  >
                    {attachment.original_filename || attachment.attachment_type}
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteAttachment.mutate(attachment.id)}
                    disabled={deleteAttachment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/goods-return')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <Button onClick={handleContinue} disabled={updateHeader.isPending}>
          {updateHeader.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </div>
  );
}

function readError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback;
}
