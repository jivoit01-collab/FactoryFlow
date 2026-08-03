import { CheckCircle2, ClipboardCheck, Loader2, ShieldQuestion, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ADMIN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type DockingPartialScanRequest,
  type DockingPartialScanStatus,
  useApproveDockingPartialScanRequest,
  useDockingPartialScanRequests,
  useRejectDockingPartialScanRequest,
} from '@/modules/admin/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

type StatusFilter = DockingPartialScanStatus | 'ALL';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

type ReviewMode = 'approve' | 'reject';

export default function DockingPartialScanApprovalsPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const { data: requests = [], isLoading } = useDockingPartialScanRequests(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
  );

  const approveRequest = useApproveDockingPartialScanRequest();
  const rejectRequest = useRejectDockingPartialScanRequest();

  const [reviewTarget, setReviewTarget] = useState<DockingPartialScanRequest | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [reviewError, setReviewError] = useState('');

  const isSaving = approveRequest.isPending || rejectRequest.isPending;

  const openReview = (request: DockingPartialScanRequest, mode: 'approve' | 'reject') => {
    setReviewTarget(request);
    setReviewMode(mode);
    setNotes('');
    setReviewError('');
  };

  const closeReview = () => {
    if (isSaving) return;
    setReviewTarget(null);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    const trimmed = notes.trim();
    if (reviewMode === 'reject' && !trimmed) {
      setReviewError('A note is required when rejecting a request.');
      return;
    }
    setReviewError('');
    try {
      if (reviewMode === 'approve') {
        await approveRequest.mutateAsync({ id: reviewTarget.id, data: { notes: trimmed } });
        toast.success('Partial dispatch approved');
      } else {
        await rejectRequest.mutateAsync({ id: reviewTarget.id, data: { notes: trimmed } });
        toast.success('Partial dispatch rejected');
      }
      setReviewTarget(null);
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Unable to save this review'));
    }
  };

  const emptyLabel = statusFilter === 'ALL' ? '' : statusFilter.toLowerCase();

  return (
    <div className="space-y-4 pb-6 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Docking — Partial Dispatch Approvals
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Review operator requests to dispatch a docking with only some of its boxes scanned.
          Approving lets the load proceed to gatepass with the partial scan.
        </p>
      </div>

      {/* Filter tabs sit outside the card on a phone so the list starts higher up. */}
      <div className="grid grid-cols-4 gap-2 sm:hidden">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ---- Phone: one card per request, no horizontal scrolling ---- */}
      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
            <ShieldQuestion className="h-8 w-8" />
            <p>No {emptyLabel} partial dispatch requests.</p>
          </div>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              canApprove={canApprove}
              isSaving={isSaving}
              onReview={openReview}
            />
          ))
        )}
      </div>

      <Card className="hidden sm:block">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="h-5 w-5" />
              Requests
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === tab.value ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <ShieldQuestion className="h-8 w-8" />
              <p>No {emptyLabel} partial dispatch requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Docking Entry</th>
                    <th className="p-3 text-left font-medium">Vehicle</th>
                    <th className="p-3 text-left font-medium">Customer / Doc</th>
                    <th className="p-3 text-left font-medium">Scanned</th>
                    <th className="p-3 text-left font-medium">Reason</th>
                    <th className="p-3 text-left font-medium">Requested By</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b align-top last:border-b-0">
                      <td className="p-3">
                        <div className="font-medium">
                          {request.entry_no || `#${request.sales_dispatch}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{request.document_type}</div>
                      </td>
                      <td className="p-3">{request.vehicle_no || '-'}</td>
                      <td className="p-3">
                        <div className="font-medium">{request.customer_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.sap_doc_num || '-'}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium">
                        {request.scanned_boxes} / {request.expected_boxes || '?'}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[240px] whitespace-pre-wrap break-words">
                          {request.reason}
                        </div>
                        {request.review_notes ? (
                          <div className="mt-1 max-w-[240px] whitespace-pre-wrap break-words text-xs text-muted-foreground">
                            Note: {request.review_notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{request.requested_by_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(request.requested_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={request.status} />
                        {request.reviewed_by_name ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            by {request.reviewed_by_name}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-right">
                        {request.status === 'PENDING' && canApprove ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => openReview(request, 'approve')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              disabled={isSaving}
                              onClick={() => openReview(request, 'reject')}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {request.status === 'PENDING' ? 'Awaiting approver' : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => (!open ? closeReview() : null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-base sm:text-lg">
              {reviewMode === 'approve' ? 'Approve Partial Dispatch' : 'Reject Partial Dispatch'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {reviewMode === 'approve'
                ? 'The operator will be able to continue to gatepass with the boxes scanned so far.'
                : 'The operator will be required to scan the remaining boxes. Explain why this request is rejected.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="partial-scan-review-notes">
              {reviewMode === 'approve' ? 'Note (optional)' : 'Reason for rejection'}
            </Label>
            <Textarea
              id="partial-scan-review-notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setReviewError('');
              }}
              placeholder={
                reviewMode === 'approve'
                  ? 'Add an optional note for the audit trail'
                  : 'Why is this request rejected?'
              }
            />
            {reviewError ? <p className="text-sm text-destructive">{reviewError}</p> : null}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={closeReview}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewMode === 'reject' ? 'destructive' : 'default'}
              className="w-full sm:w-auto"
              onClick={() => void submitReview()}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {reviewMode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RequestCardProps {
  request: DockingPartialScanRequest;
  canApprove: boolean;
  isSaving: boolean;
  onReview: (request: DockingPartialScanRequest, mode: ReviewMode) => void;
}

/**
 * Phone layout for one request. The scanned-vs-expected count is the number the
 * approver actually decides on, so it gets its own line rather than a column
 * that would sit off-screen in the table.
 */
function RequestCard({ request, canApprove, isSaving, onReview }: RequestCardProps) {
  const isPending = request.status === 'PENDING';

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">
            {request.entry_no || `#${request.sales_dispatch}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {request.document_type} · {request.vehicle_no || 'no vehicle'}
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-2 space-y-0.5 text-sm">
        <div className="break-words font-medium">{request.customer_name || '-'}</div>
        <div className="text-xs text-muted-foreground">
          {request.sap_doc_num || '-'} · {request.requested_by_name || '-'} ·{' '}
          {formatTimestamp(request.requested_at)}
        </div>
      </div>

      <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
        <div className="font-medium">
          Scanned{' '}
          <span className="tabular-nums">
            {request.scanned_boxes} / {request.expected_boxes || '?'}
          </span>{' '}
          boxes
        </div>
        <div className="mt-1 break-words">
          <span className="text-muted-foreground">Reason: </span>
          {request.reason || '-'}
        </div>
      </div>

      {request.review_notes ? (
        <p className="mt-2 break-words text-xs text-muted-foreground">
          Note: {request.review_notes}
        </p>
      ) : null}
      {request.reviewed_by_name ? (
        <p className="mt-1 text-xs text-muted-foreground">by {request.reviewed_by_name}</p>
      ) : null}

      {isPending && canApprove ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="h-11"
            disabled={isSaving}
            onClick={() => onReview(request, 'approve')}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-red-200 text-red-700 hover:bg-red-50"
            disabled={isSaving}
            onClick={() => onReview(request, 'reject')}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {isPending ? 'Awaiting approver' : 'Reviewed'}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DockingPartialScanStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0',
        status === 'PENDING' && 'border-amber-200 bg-amber-50 text-amber-700',
        status === 'APPROVED' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        status === 'REJECTED' && 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {status}
    </Badge>
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
