import { FileText, Loader2, PackageX, Plus, ReceiptText, Search, Trash2, Upload, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { StepHeader } from '@/modules/gate/components';
import { Button, Card, CardContent, Input, Label, Textarea } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { goodsReturnApi, type GoodsReturnBasis, useCreateGoodsReturn, useInvoiceSearch } from '../api';
import { ATTACHMENT_TYPE_BY_BASIS, BASIS_LABELS } from '../utils';

interface AddedInvoice {
  doc_num: string;
  card_code: string;
  card_name: string;
  line_count: number;
  total_quantity: number;
}

const BASIS_OPTIONS: { value: GoodsReturnBasis; description: string }[] = [
  { value: 'INVOICE', description: 'Return booked against one or more SAP invoices we dispatched.' },
  { value: 'DEBIT_NOTE', description: 'Return against a customer debit note (upload the document).' },
  { value: 'LETTER_PAD', description: 'Return against a customer letter pad (upload the document).' },
];

export default function GoodsReturnStep1Page() {
  const navigate = useNavigate();
  const createReturn = useCreateGoodsReturn();
  const invoiceSearch = useInvoiceSearch();

  const [basis, setBasis] = useState<GoodsReturnBasis>('INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [addedInvoices, setAddedInvoices] = useState<AddedInvoice[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isInvoiceBasis = basis === 'INVOICE';
  const derivedCustomer = addedInvoices[0];

  function resetBasis(next: GoodsReturnBasis) {
    setBasis(next);
    setError(null);
    setAddedInvoices([]);
    setInvoiceNumber('');
    setCustomerCode('');
    setCustomerName('');
  }

  async function handleSearchInvoice() {
    const number = invoiceNumber.trim();
    if (!number) {
      setError('Enter the SAP invoice number.');
      return;
    }
    if (addedInvoices.some((inv) => inv.doc_num === number)) {
      setError('That invoice is already added.');
      return;
    }
    setError(null);
    try {
      const result = await invoiceSearch.mutateAsync(number);
      if (
        addedInvoices.length > 0 &&
        derivedCustomer &&
        result.card_code &&
        result.card_code !== derivedCustomer.card_code
      ) {
        setError('All invoices on a return must be for the same customer.');
        return;
      }
      setAddedInvoices((prev) => [
        ...prev,
        {
          doc_num: result.doc_num || number,
          card_code: result.card_code,
          card_name: result.card_name,
          line_count: result.line_count,
          total_quantity: result.total_quantity,
        },
      ]);
      setInvoiceNumber('');
      toast.success(`Invoice ${result.doc_num || number} added`);
    } catch {
      setError(`No SAP invoice found for ${number}.`);
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  async function handleContinue() {
    setError(null);
    if (isInvoiceBasis && addedInvoices.length === 0) {
      setError('Add at least one invoice.');
      return;
    }
    if (!isInvoiceBasis && !customerName.trim()) {
      setError('Enter the customer name.');
      return;
    }
    if (files.length === 0) {
      setError('Upload at least one supporting document.');
      return;
    }

    try {
      const created = await createReturn.mutateAsync({
        basis,
        invoice_numbers: isInvoiceBasis ? addedInvoices.map((inv) => inv.doc_num) : undefined,
        customer_code: isInvoiceBasis ? undefined : customerCode.trim(),
        customer_name: isInvoiceBasis ? undefined : customerName.trim(),
        remarks: remarks.trim(),
      });

      // Upload staged documents against the freshly-created draft.
      for (const file of files) {
        await goodsReturnApi.uploadAttachment(created.id, file, ATTACHMENT_TYPE_BY_BASIS[basis]);
      }

      navigate(`/goods-return/edit/${created.id}/items`);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not create the goods return.';
      setError(detail);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StepHeader currentStep={1} totalSteps={3} title="Goods Return" error={error} />

      {/* Basis */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionTitle icon={<PackageX className="h-4 w-4" />} title="Return Basis" />
          <div className="grid gap-3 sm:grid-cols-3">
            {BASIS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => resetBasis(option.value)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  basis === option.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/50',
                )}
              >
                <p className="font-medium">{BASIS_LABELS[option.value]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
                    handleSearchInvoice();
                  }
                }}
                placeholder="Enter SAP invoice number"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchInvoice}
                disabled={invoiceSearch.isPending}
              >
                {invoiceSearch.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Add Invoice
              </Button>
            </div>

            {derivedCustomer && (
              <p className="text-sm text-muted-foreground">
                Customer: <span className="font-medium text-foreground">{derivedCustomer.card_name}</span>{' '}
                ({derivedCustomer.card_code})
              </p>
            )}

            {addedInvoices.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Search and add the invoice(s) this return is booked against.
              </p>
            ) : (
              <div className="space-y-2">
                {addedInvoices.map((inv) => (
                  <div
                    key={inv.doc_num}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">Invoice {inv.doc_num}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.line_count} items · qty {inv.total_quantity}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setAddedInvoices((prev) => prev.filter((item) => item.doc_num !== inv.doc_num))
                      }
                    >
                      <X className="h-4 w-4" />
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
            title={`${isInvoiceBasis ? 'Invoice' : BASIS_LABELS[basis]} Documents *`}
          />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
            <Upload className="h-6 w-6" />
            <span>Click to upload documents (required)</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent className="space-y-2 p-6">
          <Label>Remarks</Label>
          <Textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Any notes about this return"
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/goods-return')}>
          Cancel
        </Button>
        <Button onClick={handleContinue} disabled={createReturn.isPending}>
          {createReturn.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
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
