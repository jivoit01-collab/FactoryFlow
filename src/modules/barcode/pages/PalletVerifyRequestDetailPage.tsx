import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { BARCODE_PERMISSIONS } from '@/config/permissions/barcode.permissions';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import {
  useCancelVerifyRequest,
  useResolveVerifyRequest,
  useStartVerifyRequest,
  useVerifyRequest,
} from '../api';
import PalletVerifyPanel from '../components/verify/PalletVerifyPanel';
import type { PalletVerifyRequestStatus } from '../types';
import { toastBarcodeError } from '../utils/errors';

const STATUS_COLORS: Record<PalletVerifyRequestStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const CLOSED = new Set<PalletVerifyRequestStatus>(['RESOLVED', 'CANCELLED']);

export default function PalletVerifyRequestDetailPage() {
  const { requestId } = useParams();
  const id = requestId ? Number(requestId) : null;
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const isTeam = hasPermission(BARCODE_PERMISSIONS.VIEW_PALLET);

  const { data: request, isLoading } = useVerifyRequest(id);
  const startMutation = useStartVerifyRequest();
  const resolveMutation = useResolveVerifyRequest();
  const cancelMutation = useCancelVerifyRequest();

  const [resolutionNote, setResolutionNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const startedRef = useRef(false);

  // A team member opening an untouched request moves it to In Progress.
  useEffect(() => {
    if (isTeam && request?.status === 'OPEN' && id && !startedRef.current) {
      startedRef.current = true;
      startMutation.mutate(id);
    }
  }, [isTeam, request?.status, id, startMutation]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading request...</div>;
  }
  if (!request) {
    return <div className="p-8 text-center text-muted-foreground">Request not found</div>;
  }

  const findings = request.findings;
  const closed = CLOSED.has(request.status);

  const handleResolve = async () => {
    if (!id) return;
    try {
      await resolveMutation.mutateAsync({ requestId: id, data: { resolution_note: resolutionNote } });
      toast.success('Request resolved.');
    } catch (err) {
      toastBarcodeError(err, 'Unable to resolve the request.');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const confirmed = await confirmDialog({
      title: 'Cancel this request?',
      confirmLabel: 'Cancel request',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await cancelMutation.mutateAsync({ requestId: id, data: { reason: cancelReason } });
      toast.success('Request cancelled.');
    } catch (err) {
      toastBarcodeError(err, 'Unable to cancel the request.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Verify Request #${request.id}`}
        description={`Pallet ${request.pallet_code} — ${request.item_name || request.item_code}`}
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/barcode/verify')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
      </Button>

      {/* Request meta */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className={STATUS_COLORS[request.status]}>{request.status}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Raised by</p>
            <p>{request.requested_by_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Raised at</p>
            <p>{new Date(request.requested_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p>
              {request.source}
              {request.source_reference ? ` · ${request.source_reference}` : ''}
            </p>
          </div>
          {request.reason && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-muted-foreground">Reason</p>
              <p>{request.reason}</p>
            </div>
          )}
          {closed && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-muted-foreground">
                {request.status === 'RESOLVED' ? 'Resolved' : 'Cancelled'} by{' '}
                {request.resolved_by_name || '-'}
                {request.resolved_at ? ` · ${new Date(request.resolved_at).toLocaleString()}` : ''}
              </p>
              {request.resolution_note && <p>{request.resolution_note}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requester's captured findings snapshot */}
      {findings && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Reported findings (at submit)</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{findings.expected_count}</p>
                <p className="text-xs text-muted-foreground">Expected</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-amber-600">{findings.missing.length}</p>
                <p className="text-xs text-muted-foreground">Missing</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-purple-600">{findings.foreign.length}</p>
                <p className="text-xs text-muted-foreground">Foreign</p>
              </div>
            </div>
            {findings.missing.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Missing: {findings.missing.map((b) => b.box_barcode).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live re-verify + reconcile (barcode team) */}
      {!closed && (
        <div>
          <h3 className="font-semibold mb-2">Re-scan &amp; reconcile</h3>
          <PalletVerifyPanel palletId={request.pallet} allowApply={isTeam} />
        </div>
      )}

      {/* Resolve / cancel controls */}
      {!closed && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {isTeam && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Resolution note (optional)
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="What did you do to resolve this?"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
                <Button onClick={() => void handleResolve()} disabled={resolveMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {resolveMutation.isPending ? 'Resolving...' : 'Mark resolved'}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-muted-foreground">
                  Cancel reason (optional)
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <Button
                variant="destructive"
                onClick={() => void handleCancel()}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
