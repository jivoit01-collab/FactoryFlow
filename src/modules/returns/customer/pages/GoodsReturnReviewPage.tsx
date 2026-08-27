import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { StepHeader } from '@/modules/gate/components';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useGoodsReturn, useSubmitGoodsReturn } from '../api';
import { BASIS_LABELS, formatDate } from '../utils';

export default function GoodsReturnReviewPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);

  const { data: detail, isLoading } = useGoodsReturn(id);
  const submit = useSubmitGoodsReturn(id);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await submit.mutateAsync();
      toast.success('Goods return submitted — awaiting gate arrival');
      navigate(`/returns/customer/${id}`);
    } catch (err) {
      const detailMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detailMsg || 'Could not submit the goods return.');
    }
  }

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StepHeader currentStep={3} totalSteps={3} title="Goods Return" error={error} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{detail.entry_no}</h3>
            <Badge variant="outline">{BASIS_LABELS[detail.basis]}</Badge>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Customer" value={detail.customer_name || detail.customer_code || '-'} />
            <Field label="Vehicle" value={detail.vehicle_no || '-'} />
            <Field label="Driver" value={detail.driver_name || '-'} />
            <Field label="Expected Arrival" value={formatDate(detail.expected_arrival_at)} />
            <Field label="Invoices" value={String(detail.invoice_refs.length || '-')} />
            <Field label="Attachments" value={String(detail.attachments.length)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h4 className="text-sm font-semibold">Returning Items ({detail.lines.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Item</th>
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
                    <td className="px-2 py-2">
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

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/returns/customer/edit/${id}/vehicle`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSubmit} disabled={submit.isPending}>
          {submit.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Submit Goods Return
        </Button>
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        On submit the vehicle joins the gate's return queue. SAP is posted later, when the
        goods are confirmed received.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
