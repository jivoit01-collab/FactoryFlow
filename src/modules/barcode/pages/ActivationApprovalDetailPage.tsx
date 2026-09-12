import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { BARCODE_PERMISSIONS } from '@/config/permissions/barcode.permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Textarea } from '@/shared/components/ui';

import {
  useActivationRequest,
  useApproveActivationRequest,
  useCancelActivationRequest,
  useRejectActivationRequest,
} from '../api';
import { toastBarcodeError } from '../utils/errors';

export default function ActivationApprovalDetailPage() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const id = requestId ? Number(requestId) : null;
  const { hasPermission } = usePermission();
  const canDecide = hasPermission(BARCODE_PERMISSIONS.APPROVE_ACTIVATION);

  const { data: request, isLoading } = useActivationRequest(id);
  const approve = useApproveActivationRequest();
  const reject = useRejectActivationRequest();
  const cancel = useCancelActivationRequest();
  const [note, setNote] = useState('');

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!request) return <p className="text-sm text-muted-foreground">Request not found.</p>;

  const open = request.status === 'OPEN';
  const pendingLines = request.lines.filter((line) => line.status === 'PENDING');

  const run = async (
    action: 'approve' | 'reject' | 'cancel',
  ): Promise<void> => {
    if (!id) return;
    try {
      if (action === 'approve') {
        const result = await approve.mutateAsync({ requestId: id, note });
        toast.success(`${result.activated_count} label(s) activated.`);
      } else if (action === 'reject') {
        await reject.mutateAsync({ requestId: id, note });
        toast.success('Request rejected — the labels stay inactive.');
      } else {
        await cancel.mutateAsync({ requestId: id, note });
        toast.success('Request withdrawn.');
      }
      navigate('/barcode/activation-approvals');
    } catch (error) {
      toastBarcodeError(error, 'Could not record the decision.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Activation Request #${request.id}`}
        description={request.reason}
      />

      <Button variant="outline" size="sm" onClick={() => navigate('/barcode/activation-approvals')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Warehouse</p>
            <p className="font-mono text-sm">{request.warehouse || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pallet</p>
            <p className="font-mono text-sm">{request.pallet_code || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Labels</p>
            <p className="text-sm font-medium">{request.box_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Requested by</p>
            <p className="text-sm">{request.requested_by_name || '—'}</p>
          </div>
          {request.decided_at ? (
            <div className="md:col-span-4">
              <p className="text-xs text-muted-foreground">
                {request.status} by {request.decided_by_name || '—'}
              </p>
              <p className="text-sm">{request.decision_note || '—'}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {open ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Approving activates {pendingLines.length} label(s) with no physical scan
              behind them. Labels the gate has already taken are skipped automatically.
            </p>
            <Textarea
              placeholder="Note (what you checked before deciding)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {canDecide ? (
                <>
                  <Button
                    onClick={() => void run('approve')}
                    disabled={approve.isPending || pendingLines.length === 0}
                  >
                    Approve &amp; activate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void run('reject')}
                    disabled={reject.isPending}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => void run('cancel')}
                disabled={cancel.isPending}
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Barcode</th>
                  <th className="p-2 text-left font-medium">Item</th>
                  <th className="p-2 text-left font-medium">Batch</th>
                  <th className="p-2 text-right font-medium">Qty</th>
                  <th className="p-2 text-left font-medium">Warehouse</th>
                  <th className="p-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {request.lines.map((line) => (
                  <tr key={line.box_id} className="border-b">
                    <td className="p-2 font-mono text-xs">{line.box_barcode}</td>
                    <td className="p-2">{line.item_name || line.item_code}</td>
                    <td className="p-2">{line.batch_number}</td>
                    <td className="p-2 text-right">{line.qty}</td>
                    <td className="p-2 font-mono text-xs">{line.warehouse}</td>
                    <td className="p-2">
                      <Badge
                        className={
                          line.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }
                      >
                        {line.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
