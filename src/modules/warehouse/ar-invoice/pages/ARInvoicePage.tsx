import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileText, ReceiptText, RefreshCw, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AR_INVOICE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/components/ui';
import { formatCurrency, getErrorMessage } from '@/shared/utils';

import {
  AR_INVOICE_QUERY_KEYS,
  useArInvoices,
  useCreateArInvoice,
  useOpenSoLines,
} from '../api/ar-invoice.queries';
import { ARInvoiceDetailSheet } from '../components/ARInvoiceDetailSheet';
import { ARInvoiceStatusBadge } from '../components/ARInvoiceStatusBadge';
import { CustomerSelect } from '../components/CustomerSelect';
import { DirectSaleForm } from '../components/DirectSaleForm';
import type { ARInvoicePosting, OpenSOLine } from '../types';

const lineKey = (line: OpenSOLine) => `${line.so_doc_entry}:${line.line_num}`;

/**
 * New A/R invoice: pick the customer, tick their open Sales Order lines
 * (the invoice carries each line's open quantity), and post. SAP normally
 * holds the post as an approval draft — it then appears on the warehouse
 * Invoice Approval page, and approving it there posts the invoice (batches
 * allocated FIFO automatically).
 */
function CreateInvoiceTab({ onCreated }: { onCreated: () => void }) {
  const [customerCode, setCustomerCode] = useState('');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [customerRef, setCustomerRef] = useState('');
  const [docDate, setDocDate] = useState('');
  const [docDueDate, setDocDueDate] = useState('');
  const [comments, setComments] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openLines = useOpenSoLines(customerCode, search.trim() || undefined);
  const createInvoice = useCreateArInvoice();

  const lines = useMemo(() => openLines.data ?? [], [openLines.data]);
  const byKey = useMemo(() => new Map(lines.map((l) => [lineKey(l), l])), [lines]);
  const selected = useMemo(
    () => [...selectedKeys].map((k) => byKey.get(k)).filter(Boolean) as OpenSOLine[],
    [selectedKeys, byKey],
  );
  const selectedTotal = selected.reduce((sum, l) => sum + (l.open_total || 0), 0);

  // One invoice carries one SAP branch — once something is ticked, rows from
  // other branches are disabled.
  const anchor = selected[0];
  const selectable = (line: OpenSOLine) => !anchor || line.branch_id === anchor.branch_id;

  const toggle = (line: OpenSOLine, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lineKey(line));
      else next.delete(lineKey(line));
      return next;
    });
  };

  const reset = () => {
    setSelectedKeys(new Set());
    setCustomerRef('');
    setDocDate('');
    setDocDueDate('');
    setComments('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!customerCode) return toast.error('Select a customer.');
    if (selected.length === 0) return toast.error('Select at least one Sales Order line.');

    try {
      const posting = await createInvoice.mutateAsync({
        data: {
          customer_code: customerCode,
          lines: selected.map((l) => ({ so_doc_entry: l.so_doc_entry, line_num: l.line_num })),
          ...(customerRef.trim() ? { customer_ref: customerRef.trim() } : {}),
          ...(docDate ? { doc_date: docDate } : {}),
          ...(docDueDate ? { doc_due_date: docDueDate } : {}),
          ...(comments.trim() ? { comments: comments.trim() } : {}),
        },
        files,
      });
      if (posting.status === 'PENDING_APPROVAL') {
        toast.success(
          `Invoice sent to SAP — awaiting approval (draft ${posting.sap_draft_entry}). ` +
            'It will appear on the Invoice Approval page.',
        );
      } else if (posting.status === 'POSTED') {
        toast.success(`Invoice posted to SAP as ${posting.sap_doc_num}.`);
      } else {
        toast.warning(`Invoice saved with status ${posting.status_display}.`);
      }
      reset();
      onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create the A/R invoice'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-80">
          <CustomerSelect
            label="Customer"
            required
            value={customerCode}
            onChange={(customer) => {
              setCustomerCode(customer?.customer_code ?? '');
              setSelectedKeys(new Set());
            }}
          />
        </div>
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="ar-line-search">Search SO lines</Label>
          <Input
            id="ar-line-search"
            placeholder="SO no., item, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!customerCode}
          />
        </div>
      </div>

      {!customerCode ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <ReceiptText className="h-8 w-8" />
          <p className="text-sm">Select a customer to load their open Sales Order lines.</p>
        </div>
      ) : openLines.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading open SO lines…</p>
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <ReceiptText className="h-8 w-8" />
          <p className="text-sm">No open (uninvoiced) Sales Order lines for this customer.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 font-medium">SO</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Item / Description</th>
                  <th className="px-3 py-2 font-medium">Open qty</th>
                  <th className="px-3 py-2 font-medium">Warehouse</th>
                  <th className="px-3 py-2 text-right font-medium">Open value</th>
                  <th className="px-3 py-2 font-medium">Tax</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const key = lineKey(line);
                  const disabled = !selectable(line) && !selectedKeys.has(key);
                  return (
                    <tr
                      key={key}
                      className={disabled ? 'border-t opacity-40' : 'border-t'}
                      title={
                        disabled ? 'Cannot mix SAP branches on one invoice' : undefined
                      }
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedKeys.has(key)}
                          disabled={disabled}
                          onCheckedChange={(checked) => toggle(line, checked === true)}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {line.so_doc_num}/{line.line_num}
                      </td>
                      <td className="px-3 py-2">{line.so_doc_date || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{line.item_code}</span>
                        {line.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {line.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {line.open_qty} {line.uom}
                      </td>
                      <td className="px-3 py-2">{line.warehouse_code || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(line.open_total)}
                      </td>
                      <td className="px-3 py-2">{line.tax_code || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Invoice details</h3>
                <p className="text-sm text-muted-foreground">
                  {selected.length} line(s) selected ·{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(selectedTotal)}
                  </span>{' '}
                  pre-tax
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="ar-customer-ref">Customer ref / PO no.</Label>
                  <Input
                    id="ar-customer-ref"
                    placeholder="Optional — goes to NumAtCard"
                    value={customerRef}
                    onChange={(e) => setCustomerRef(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ar-doc-date">Posting date</Label>
                  <Input
                    id="ar-doc-date"
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ar-due-date">Due date</Label>
                  <Input
                    id="ar-due-date"
                    type="date"
                    value={docDueDate}
                    onChange={(e) => setDocDueDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="ar-attachments">Attachments (optional)</Label>
                  <Input
                    id="ar-attachments"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                </div>
              </div>
              {files.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Label htmlFor="ar-comments">Comments</Label>
                <Textarea
                  id="ar-comments"
                  rows={2}
                  placeholder="Optional remarks carried onto the SAP document"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <Button onClick={submit} disabled={createInvoice.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {createInvoice.isPending ? 'Posting…' : 'Create & send to SAP'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function HistoryTab({ canAct }: { canAct: boolean }) {
  const { data, isLoading, isError } = useArInvoices();
  const [selected, setSelected] = useState<ARInvoicePosting | null>(null);

  // Keep the sheet showing the fresh record after an action refetches the list.
  const current = useMemo(
    () => (selected ? ((data ?? []).find((p) => p.id === selected.id) ?? selected) : null),
    [data, selected],
  );

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading invoices…</p>;
  }
  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-red-600">
        Could not load invoices. Please try again.
      </p>
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <ReceiptText className="h-8 w-8" />
        <p className="text-sm">No A/R invoices raised yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {rows.map((posting) => (
          <Card
            key={posting.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(posting)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(posting);
              }
            }}
            className="cursor-pointer transition-colors hover:bg-muted/50"
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {posting.customer_name || posting.customer_code}
                </p>
                <p className="text-sm text-muted-foreground">
                  {posting.customer_ref ? `Ref ${posting.customer_ref} · ` : ''}
                  {posting.sap_doc_num ? `SAP ${posting.sap_doc_num}` : ''}
                  {posting.sap_draft_entry && !posting.sap_doc_num
                    ? `draft ${posting.sap_draft_entry}`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">
                  {posting.sap_doc_total
                    ? formatCurrency(Number(posting.sap_doc_total))
                    : posting.selected_total
                      ? formatCurrency(Number(posting.selected_total))
                      : '-'}
                </span>
                <ARInvoiceStatusBadge status={posting.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ARInvoiceDetailSheet
        posting={current}
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canAct={canAct}
      />
    </>
  );
}

/**
 * Sales-Order-based invoicing is built and working (backend route included),
 * but hidden for now — the factory raises direct/cash sales only. Flip this to
 * bring the "From Sales Order" tab back.
 */
const SHOW_SALES_ORDER_TAB = false;

/**
 * A/R Invoices — raise a sales invoice (a direct/cash sale, or against open
 * Sales Order lines) and follow it through SAP's approval procedure to the
 * posted OINV invoice.
 */
export default function ARInvoicePage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(AR_INVOICE_PERMISSIONS.CREATE);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'new' | 'direct' | 'history'>(
    canCreate ? (SHOW_SALES_ORDER_TAB ? 'new' : 'direct') : 'history',
  );

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="AR Invoices"
        description="Raise sales invoices and track them through SAP approval."
      >
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: AR_INVOICE_QUERY_KEYS.all })}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </DashboardHeader>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'new' | 'direct' | 'history')}>
        <TabsList>
          {canCreate && SHOW_SALES_ORDER_TAB ? (
            <TabsTrigger value="new">From Sales Order</TabsTrigger>
          ) : null}
          {canCreate ? <TabsTrigger value="direct">New Invoice</TabsTrigger> : null}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        {canCreate && SHOW_SALES_ORDER_TAB ? (
          <TabsContent value="new" className="mt-4">
            <CreateInvoiceTab onCreated={() => setTab('history')} />
          </TabsContent>
        ) : null}
        {canCreate ? (
          <TabsContent value="direct" className="mt-4">
            <DirectSaleForm onCreated={() => setTab('history')} />
          </TabsContent>
        ) : null}
        <TabsContent value="history" className="mt-4">
          <HistoryTab canAct={canCreate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
