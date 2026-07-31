import { ArrowLeft, FileText, Loader2, Paperclip } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useGoodsReturn } from '../api';
import { BASIS_LABELS, formatDate, formatDateTime, STATUS_BADGE_CLASS, STATUS_LABELS } from '../utils';

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
          {detail.invoice_refs.length > 0 && (
            <Field
              label="Invoices"
              value={detail.invoice_refs.map((ref) => ref.sap_invoice_doc_num).join(', ')}
            />
          )}
          {detail.sap_gr_doc_num && <Field label="SAP GR Doc" value={detail.sap_gr_doc_num} />}
          {detail.remarks && <Field label="Remarks" value={detail.remarks} />}
        </CardContent>
      </Card>

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
                  href={attachment.file_url}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
