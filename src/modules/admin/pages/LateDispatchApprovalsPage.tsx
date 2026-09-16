import { CheckCircle2, ClipboardCheck, Loader2, Moon, ShieldQuestion, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type LateDispatchApproval,
  type LateDispatchApprovalStatus,
  useApproveLateDispatchApproval,
  useLateDispatchApprovals,
  useRejectLateDispatchApproval,
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

type StatusFilter = LateDispatchApprovalStatus | 'ALL';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

type ReviewMode = 'approve' | 'reject';

/**
 * Trucks dispatch wants let in to load after the evening cutoff.
 *
 * Raised from Dispatch > Vehicle Linking, normally while the truck is still on the
 * road -- so these are usually decisions about tonight rather than about a driver
 * already standing outside. Until one is approved the gate cannot start the entry.
 *
 * Read across every company the approver belongs to: the gate is one physical
 * place, and a truck's request is filed under whichever company's bills it is
 * booked to carry — company-scoping the queue would leave requests sitting where
 * nobody is watching while the driver waits outside.
 */
export default function LateDispatchApprovalsPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(GATE_PERMISSIONS.LATE_DISPATCH_GATE_IN.APPROVE);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const { data: requests = [], isLoading } = useLateDispatchApprovals({
    all_companies: true,
    ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
  });

  const approveRequest = useApproveLateDispatchApproval();
  const rejectRequest = useRejectLateDispatchApproval();

  const [reviewTarget, setReviewTarget] = useState<LateDispatchApproval | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('approve');
  const [notes, setNotes] = useState('');
  const [reviewError, setReviewError] = useState('');

  const isSaving = approveRequest.isPending || rejectRequest.isPending;

  const openReview = (request: LateDispatchApproval, mode: ReviewMode) => {
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
        toast.success(`${reviewTarget.vehicle_no} cleared for a late gate-in`);
      } else {
        await rejectRequest.mutateAsync({ id: reviewTarget.id, data: { notes: trimmed } });
        toast.success(`${reviewTarget.vehicle_no} refused a late gate-in`);
      }
      setReviewTarget(null);
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Unable to save this review'));
    }
  };

  const emptyLabel = statusFilter === 'ALL' ? '' : `${statusFilter.toLowerCase()} `;

  return (
    <div className="space-y-4 pb-6 sm:space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Moon className="h-6 w-6" />
          Late Dispatch Gate-In Approvals
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Trucks dispatch wants to load after the evening cutoff. Approving lets the gate
          start the empty-vehicle entry for that truck; rejecting keeps it outside.
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
            <p>No {emptyLabel}late gate-in requests.</p>
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
              <p>No {emptyLabel}late gate-in requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Vehicle</th>
                    <th className="p-3 text-left font-medium">Arriving</th>
                    <th className="p-3 text-left font-medium">Load</th>
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
                        <div className="font-medium">{request.vehicle_no || `#${request.vehicle}`}</div>
                        <div className="text-xs text-muted-foreground">
                          {[request.transporter_name, request.company_name]
                            .filter(Boolean)
                            .join(' · ') || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-3">
                        <div>{request.gate_in_date}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatArrival(request.in_time)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[240px] break-words font-medium">
                          {request.bill_doc_nums || 'No booked bill'}
                        </div>
                        <div className="max-w-[240px] break-words text-xs text-muted-foreground">
                          {request.customer_names || '-'}
                          {request.bill_count > 0
                            ? ` · ${request.bill_count} bill${request.bill_count === 1 ? '' : 's'}`
                            : ''}
                        </div>
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
                        {request.gate_in_entry_no ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Used on {request.gate_in_entry_no}
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
                              className="border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/25"
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
              {reviewMode === 'approve' ? 'Allow the late gate-in' : 'Refuse the late gate-in'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {reviewMode === 'approve'
                ? `${reviewTarget?.vehicle_no ?? 'The truck'} can be gated in for dispatch and loaded tonight. The clearance is good for one entry on ${reviewTarget?.gate_in_date ?? 'this date'}.`
                : `${reviewTarget?.vehicle_no ?? 'The truck'} stays outside. Say why, so the gate can tell the driver.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="late-dispatch-review-notes">
              {reviewMode === 'approve' ? 'Note (optional)' : 'Reason for rejection'}
            </Label>
            <Textarea
              id="late-dispatch-review-notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setReviewError('');
              }}
              placeholder={
                reviewMode === 'approve'
                  ? 'Add an optional note for the audit trail'
                  : 'Why is this truck not being let in?'
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
  request: LateDispatchApproval;
  canApprove: boolean;
  isSaving: boolean;
  onReview: (request: LateDispatchApproval, mode: ReviewMode) => void;
}

/**
 * Phone layout for one request — the approver is often not at a desk when the
 * truck is at the gate. Stacked in reading order, actions full-width at the end.
 */
function RequestCard({ request, canApprove, isSaving, onReview }: RequestCardProps) {
  const isPending = request.status === 'PENDING';

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">
            {request.vehicle_no || `#${request.vehicle}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {request.gate_in_date} · {formatArrival(request.in_time)}
            {request.company_name ? ` · ${request.company_name}` : ''}
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-2 space-y-0.5 text-sm">
        <div className="break-words font-medium">{request.bill_doc_nums || 'No booked bill'}</div>
        <div className="break-words text-xs text-muted-foreground">
          {request.customer_names || '-'}
        </div>
        <div className="text-xs text-muted-foreground">
          {request.requested_by_name || '-'} · {formatTimestamp(request.requested_at)}
        </div>
      </div>

      <div className="mt-2 break-words rounded-md bg-muted/50 p-2 text-sm">
        <span className="text-muted-foreground">Reason: </span>
        {request.reason || '-'}
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
            className="h-11 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/25"
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

function StatusBadge({ status }: { status: LateDispatchApprovalStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0',
        status === 'PENDING' && 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
        status === 'APPROVED' && 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        status === 'REJECTED' && 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
      )}
    >
      {status}
    </Badge>
  );
}

/**
 * The arrival hour, which a request does not have until it is used.
 *
 * Dispatch raises these before the truck reaches the gate, so there is no arrival
 * to show while the decision is still open -- saying so beats a bare dash, which
 * reads as missing data rather than as "it has not happened yet".
 */
function formatArrival(value?: string | null) {
  return value ? `In at ${value.slice(0, 5)}` : 'Not arrived yet';
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
