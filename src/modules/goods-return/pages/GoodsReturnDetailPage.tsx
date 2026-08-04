import { ArrowLeft, FileText, Loader2, PackageCheck, Paperclip } from 'lucide-react';
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
import {
  APPROVAL_BADGE_CLASS,
  APPROVAL_LABELS,
  BASIS_LABELS,
  formatDate,
  formatDateTime,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from '../utils';

export default function GoodsReturnDetailPage() {
  const navigate = useNavigate();
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
        <Button variant="outline" onClick={() => navigate('/goods-return')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
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
          {detail.sap_gr_doc_num && <Field label="SAP Return Doc" value={detail.sap_gr_doc_num} />}
          {detail.sap_return_warehouse && (
            <Field label="Return Warehouse" value={detail.sap_return_warehouse} />
          )}
          {detail.approval_status === 'REJECTED' && detail.approval_remarks && (
            <Field label="Rejection Reason" value={detail.approval_remarks} />
          )}
          {detail.remarks && <Field label="Remarks" value={detail.remarks} />}
        </CardContent>
      </Card>

      {detail.status === 'ARRIVED' && <ReceivePanel id={id} detail={detail} />}

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
  const isInvoiceBasis = detail.basis === 'INVOICE';
  const awaitingApproval =
    detail.requires_approval && detail.approval_status === 'PENDING';
  const approvalRejected =
    detail.requires_approval && detail.approval_status === 'REJECTED';
  const blocked = awaitingApproval || approvalRejected;

  const receive = useReceiveGoodsReturn(id);
  const { data: warehouses = [], isLoading: warehousesLoading } = useReturnWarehouses(
    isInvoiceBasis && !blocked,
  );
  const [warehouseCode, setWarehouseCode] = useState('');

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
    if (isInvoiceBasis && !warehouseCode) {
      toast.error('Select the goods-return warehouse.');
      return;
    }
    try {
      const updated = await receive.mutateAsync(isInvoiceBasis ? warehouseCode : undefined);
      toast.success(
        updated.sap_gr_doc_num
          ? `Received — SAP Return ${updated.sap_gr_doc_num} posted`
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
          <PackageCheck className="h-4 w-4 text-primary" /> Confirm Receipt
        </div>
        <p className="text-sm text-muted-foreground">
          The vehicle is marked in at the gate. Confirm the goods physically arrived
          {isInvoiceBasis
            ? ' — this posts an A/R Returns document to SAP for the returned stock.'
            : '. No SAP posting is done for non-invoice returns.'}
        </p>

        {isInvoiceBasis && (
          <div className="space-y-2 sm:max-w-sm">
            <Label>Goods-Return Warehouse *</Label>
            <select
              value={warehouseCode}
              onChange={(event) => setWarehouseCode(event.target.value)}
              disabled={warehousesLoading}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{warehousesLoading ? 'Loading…' : 'Select warehouse'}</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.warehouse_code} value={warehouse.warehouse_code}>
                  {warehouse.warehouse_code} — {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button onClick={handleReceive} disabled={receive.isPending}>
          {receive.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="mr-2 h-4 w-4" />
          )}
          {isInvoiceBasis ? 'Confirm Receipt & Post to SAP' : 'Confirm Receipt'}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
