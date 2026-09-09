import { ArrowLeft, FileText, Loader2, PackageCheck, Paperclip, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent, Label } from '@/shared/components/ui';
import { cn, resolveFileUrl } from '@/shared/utils';

import {
  type GoodsReturnDetail,
  useGoodsReturn,
  useReceiveGoodsReturn,
  useReturnWarehouses,
} from '../api';
import { GoodsReturnPrintButton } from '../components/GoodsReturnPrintButton';
import {
  APPROVAL_BADGE_CLASS,
  APPROVAL_LABELS,
  BASIS_LABELS,
  formatDate,
  formatDateTime,
  invoiceNumbersByRef,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from '../utils';

export default function GoodsReturnDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);
  const { data: detail, isLoading } = useGoodsReturn(id);
  const invoiceNumbers = invoiceNumbersByRef(detail?.invoice_refs ?? []);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{detail.entry_no}</h2>
            <Badge className={cn('border-0', STATUS_BADGE_CLASS[detail.status])}>
              {STATUS_LABELS[detail.status]}
            </Badge>
            {detail.requires_approval && (
              <Badge className={cn('border-0', APPROVAL_BADGE_CLASS[detail.approval_status])}>
                {APPROVAL_LABELS[detail.approval_status]}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{BASIS_LABELS[detail.basis]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* One button per posted document: a return booked against two invoices
              posts two A/R Returns, and each is its own Return Note. Only a
              posted return has any — a DN/LP return closes as RECEIVED with no
              document behind it. */}
          {printableDocuments(detail).map((document) => (
            <GoodsReturnPrintButton
              key={document.docEntry ?? document.docNum}
              id={id}
              docNum={document.docNum}
              docEntry={document.docEntry}
              label={document.label}
            />
          ))}
          {/* The gate is waiting for this truck until it marks it in, and until
              then the customer can still send a different one. */}
          {!detail.gated_in_at && detail.status === 'AWAITING_ARRIVAL' && (
            <Button
              variant="outline"
              onClick={() => navigate(`/returns/customer/edit/${id}/vehicle`)}
            >
              <Truck className="mr-2 h-4 w-4" /> Change Vehicle
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/returns/customer')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Customer" value={detail.customer_name || detail.customer_code || '-'} />
          <Field label="Company" value={detail.company_name} />
          <Field label="Vehicle" value={detail.vehicle_no || '-'} />
          <Field label="Driver" value={detail.driver_name || '-'} />
          <Field label="Expected Arrival" value={formatDate(detail.expected_arrival_at)} />
          <Field label="Gated In" value={formatDateTime(detail.gated_in_at)} />
          {detail.received_at && (
            <Field label="Received" value={formatDateTime(detail.received_at)} />
          )}
          {detail.invoice_refs.length > 0 && (
            <Field
              label="Invoices"
              value={detail.invoice_refs.map((ref) => ref.sap_invoice_doc_num).join(', ')}
            />
          )}
          {/* One document per invoice, so this is a list. The per-invoice table
              below says which document answers for which bill. */}
          {(detail.sap_gr_doc_nums ?? []).length > 0 && (
            <Field
              label={detail.sap_gr_doc_nums.length > 1 ? 'SAP Return Docs' : 'SAP Return Doc'}
              value={detail.sap_gr_doc_nums.join(', ')}
            />
          )}
          {detail.sap_return_warehouse && (
            <Field label="Return Warehouse" value={detail.sap_return_warehouse} />
          )}
          {detail.approval_status === 'REJECTED' && detail.approval_remarks && (
            <Field label="Rejection Reason" value={detail.approval_remarks} />
          )}
          {detail.remarks && <Field label="Remarks" value={detail.remarks} />}
        </CardContent>
      </Card>

      {(detail.status === 'ARRIVED' || detail.status === 'PARTIALLY_POSTED') && (
        <ReceivePanel id={id} detail={detail} />
      )}

      <SapDocumentsCard detail={detail} />

      <Card>
        <CardContent className="space-y-3 p-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Returning Items ({detail.lines.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Item</th>
                  {/* Which bill the line came off — and therefore which of the
                      return's SAP documents it landed on. */}
                  {detail.invoice_refs.length > 0 && <th className="px-2 py-2">Invoice</th>}
                  <th className="px-2 py-2">Invoice Qty</th>
                  <th className="px-2 py-2">Return Qty</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2">Condition</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="px-2 py-2">
                      <p className="font-medium">{line.item_name || line.item_code}</p>
                      <p className="text-xs text-muted-foreground">{line.item_code}</p>
                    </td>
                    {detail.invoice_refs.length > 0 && (
                      <td className="px-2 py-2 text-muted-foreground">
                        {line.invoice_ref ? (invoiceNumbers[line.invoice_ref] ?? '-') : '-'}
                      </td>
                    )}
                    <td className="px-2 py-2 text-muted-foreground">
                      {Number(line.invoice_quantity) || '-'} {line.uom}
                    </td>
                    <td className="px-2 py-2 font-medium">
                      {Number(line.return_quantity)} {line.uom}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{line.reason || '-'}</td>
                    <td className="px-2 py-2">{line.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {detail.attachments.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Paperclip className="h-4 w-4" /> Documents ({detail.attachments.length})
            </h4>
            <div className="space-y-2">
              {detail.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={resolveFileUrl(attachment.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted/40"
                >
                  <span className="truncate">
                    {attachment.original_filename || attachment.attachment_type}
                  </span>
                  <Badge variant="outline">{attachment.attachment_type}</Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReceivePanel({ id, detail }: { id: number; detail: GoodsReturnDetail }) {
  const awaitingApproval =
    detail.requires_approval && detail.approval_status === 'PENDING';
  const approvalRejected =
    detail.requires_approval && detail.approval_status === 'REJECTED';
  const blocked = awaitingApproval || approvalRejected;

  const receive = useReceiveGoodsReturn(id);
  // Every basis posts standalone A/R Returns, so every basis needs a warehouse
  // to post them into.
  const { data: warehouses = [], isLoading: warehousesLoading } =
    useReturnWarehouses(!blocked);
  // A retry has to use the warehouse the first run posted into — the stock
  // already in SAP went there — so it is fixed rather than asked for again.
  const retry = detail.status === 'PARTIALLY_POSTED';
  const [warehouseCode, setWarehouseCode] = useState(
    retry ? detail.sap_return_warehouse : '',
  );
  const owed = detail.invoice_refs.filter((ref) => ref.sap_gr_doc_entry === null);

  if (blocked) {
    return (
      <Card className={cn('border', awaitingApproval ? 'border-amber-300' : 'border-rose-300')}>
        <CardContent className="space-y-1 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4" /> Confirm Receipt
          </div>
          <p className="text-sm text-muted-foreground">
            {awaitingApproval
              ? 'This return is flagged “coming on approval” and is awaiting an admin decision. It can be received once approved.'
              : `Approval was rejected${detail.approval_remarks ? ` — ${detail.approval_remarks}` : ''}. This return cannot be received.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleReceive() {
    if (!warehouseCode) {
      toast.error('Select the goods-return warehouse.');
      return;
    }
    try {
      const updated = await receive.mutateAsync(warehouseCode);
      // `detail` is only set when SAP refused some of the return's invoices; the
      // rest posted and stand, so this is a warning, not a failure.
      if (updated.detail) {
        toast.warning(updated.detail);
        return;
      }
      const posted = updated.sap_gr_doc_nums ?? [];
      toast.success(
        posted.length > 1
          ? `Received — ${posted.length} SAP Returns posted (${posted.join(', ')})`
          : posted.length === 1
            ? `Received — SAP Return ${posted[0]} posted`
            : 'Goods return received',
      );
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(message || 'Could not receive the goods return.');
    }
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PackageCheck className="h-4 w-4 text-primary" />{' '}
          {retry ? 'Post the Remaining Invoices' : 'Confirm Receipt'}
        </div>
        <p className="text-sm text-muted-foreground">
          {retry
            ? `SAP refused ${owed.length} of this return's invoices${
                owed.length ? ` (${owed.map((ref) => ref.sap_invoice_doc_num).join(', ')})` : ''
              }. The documents it accepted stand — a posted return cannot be withdrawn — so this
               retries only the refused ones, into the same warehouse.`
            : `The vehicle is marked in at the gate. Confirm the goods physically arrived — this
               posts one A/R Return per invoice to SAP and brings the stock into the warehouse
               below.`}
        </p>

        <div className="space-y-2 sm:max-w-sm">
          <Label>Goods-Return Warehouse *</Label>
          <select
            value={warehouseCode}
            onChange={(event) => setWarehouseCode(event.target.value)}
            disabled={warehousesLoading || retry}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{warehousesLoading ? 'Loading…' : 'Select warehouse'}</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.warehouse_code} value={warehouse.warehouse_code}>
                {warehouse.warehouse_code} — {warehouse.warehouse_name}
              </option>
            ))}
          </select>
          {!warehousesLoading && warehouses.length === 0 && (
            <p className="text-xs text-destructive">
              No goods-return warehouse is configured for this company. SAP cannot take the
              return without one.
            </p>
          )}
        </div>

        <Button onClick={handleReceive} disabled={receive.isPending}>
          {receive.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="mr-2 h-4 w-4" />
          )}
          {retry ? 'Retry the Refused Invoices' : 'Confirm Receipt & Post to SAP'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Which invoice got which A/R Return, and what SAP said about the ones it
 *  refused. Only shown once something has been posted or refused: before that
 *  there is nothing to say that the summary above does not. */
function SapDocumentsCard({ detail }: { detail: GoodsReturnDetail }) {
  const refs = detail.invoice_refs;
  const anything = refs.some((ref) => ref.sap_gr_doc_entry !== null || ref.sap_post_error);
  if (refs.length === 0 || !anything) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" /> SAP Returns ({refs.length})
        </h4>
        <p className="text-xs text-muted-foreground">
          One A/R Return per invoice — the credit note that follows is raised against the
          invoice, and each bill carries its own place of supply.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-2 py-2">Invoice</th>
                <th className="px-2 py-2">SAP Return</th>
                <th className="px-2 py-2">Posted</th>
                <th className="px-2 py-2">Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((ref) => (
                <tr key={ref.id} className="border-b align-top">
                  <td className="px-2 py-2 font-medium">
                    {ref.sap_invoice_doc_num || ref.sap_invoice_doc_entry}
                  </td>
                  <td className="px-2 py-2">
                    {ref.sap_gr_doc_num ? (
                      <span className="font-medium">{ref.sap_gr_doc_num}</span>
                    ) : (
                      <span className="text-destructive">
                        {ref.sap_post_error || 'Not posted'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {formatDateTime(ref.posted_at)}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {ref.sap_return_warehouse || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** The return's printable documents, one per posted invoice.
 *
 *  A debit-note or letter-pad return has no invoice ref to hang its document on,
 *  so the header's own number is the only one there is. */
function printableDocuments(detail: GoodsReturnDetail) {
  const fromInvoices = detail.invoice_refs
    .filter((ref) => ref.sap_gr_doc_entry !== null)
    .map((ref) => ({
      docEntry: ref.sap_gr_doc_entry,
      docNum: ref.sap_gr_doc_num,
      label:
        detail.invoice_refs.length > 1
          ? `Print Return Note (Inv ${ref.sap_invoice_doc_num || ref.sap_invoice_doc_entry})`
          : 'Print Return Note',
    }));
  if (fromInvoices.length > 0) return fromInvoices;
  return detail.sap_gr_doc_num
    ? [{ docEntry: null, docNum: detail.sap_gr_doc_num, label: 'Print Return Note' }]
    : [];
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
