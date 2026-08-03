import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useApproveMaterialIndent, useMaterialIndents, useRejectMaterialIndent } from '@/modules/maintenance/api';
import type { MaterialIndent, MaterialIndentStatus } from '@/modules/maintenance/types';
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

type QueueStatus = Extract<MaterialIndentStatus, 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>;

const STATUS_TABS: { value: QueueStatus; label: string; shortLabel: string }[] = [
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', shortLabel: 'Pending' },
  { value: 'APPROVED', label: 'Approved', shortLabel: 'Approved' },
  { value: 'REJECTED', label: 'Rejected', shortLabel: 'Rejected' },
];

/** Items shown on a phone card before the "+N more" toggle. */
const MOBILE_ITEM_PREVIEW = 2;

export default function MaterialIndentApprovalsPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT);

  const [statusFilter, setStatusFilter] = useState<QueueStatus>('PENDING_APPROVAL');
  const { data: indents = [], isLoading } = useMaterialIndents({ status: statusFilter });

  const approveIndent = useApproveMaterialIndent();
  const rejectIndent = useRejectMaterialIndent();

  const [reviewTarget, setReviewTarget] = useState<MaterialIndent | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [reviewError, setReviewError] = useState('');

  const isSaving = approveIndent.isPending || rejectIndent.isPending;

  const openReview = (indent: MaterialIndent, mode: 'approve' | 'reject') => {
    setReviewTarget(indent);
    setReviewMode(mode);
    setRemarks('');
    setReviewError('');
  };

  const closeReview = () => {
    if (isSaving) return;
    setReviewTarget(null);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    const trimmed = remarks.trim();
    if (reviewMode === 'reject' && !trimmed) {
      setReviewError('A reason is required when rejecting an indent.');
      return;
    }
    setReviewError('');
    try {
      if (reviewMode === 'approve') {
        await approveIndent.mutateAsync({
          indentId: reviewTarget.id,
          payload: { decision_remarks: trimmed },
        });
        toast.success(`Indent ${reviewTarget.indent_no} approved for purchase`);
      } else {
        await rejectIndent.mutateAsync({
          indentId: reviewTarget.id,
          payload: { decision_remarks: trimmed },
        });
        toast.success(`Indent ${reviewTarget.indent_no} rejected`);
      }
      setReviewTarget(null);
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Unable to save this decision'));
    }
  };

  const emptyLabel = STATUS_TABS.find((t) => t.value === statusFilter)?.label.toLowerCase();

  return (
    <div className="space-y-4 pb-6 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Material Indent — Purchase Approvals
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Review material requests raised across departments and approve them for purchase. Approving
          sends the indent to the purchaser.
        </p>
      </div>

      {/* Filter tabs sit outside the card on a phone so the list starts higher up. */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.shortLabel}
          </Button>
        ))}
      </div>

      {/* ---- Phone: one card per indent, no horizontal scrolling ---- */}
      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading indents...
          </div>
        ) : indents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
            <ShieldQuestion className="h-8 w-8" />
            <p>No {emptyLabel} indents.</p>
          </div>
        ) : (
          indents.map((indent) => (
            <IndentCard
              key={indent.id}
              indent={indent}
              canApprove={canApprove}
              isSaving={isSaving}
              onReview={openReview}
            />
          ))
        )}
      </div>

      {/* ---- Tablet and up: the full table ---- */}
      <Card className="hidden sm:block">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5" />
              Indents
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
              Loading indents...
            </div>
          ) : indents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <ShieldQuestion className="h-8 w-8" />
              <p>No {emptyLabel} indents.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Indent</th>
                    <th className="p-3 text-left font-medium">Purpose / Dept</th>
                    <th className="p-3 text-left font-medium">Items</th>
                    <th className="p-3 text-left font-medium">Requested By</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent) => (
                    <tr key={indent.id} className="border-b align-top last:border-b-0">
                      <td className="p-3">
                        <div className="font-medium">{indent.indent_no}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(indent.indent_date)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{indent.purpose || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {indent.department_name || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[300px] space-y-0.5">
                          {indent.items.map((item) => (
                            <div key={item.id} className="whitespace-pre-wrap break-words">
                              <span className="text-muted-foreground">{item.quantity} {item.unit}</span>{' '}
                              {item.particulars}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{indent.requested_by_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(indent.submitted_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={indent.status} />
                        {indent.approved_by_name ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            by {indent.approved_by_name}
                          </div>
                        ) : null}
                        {indent.decision_remarks ? (
                          <div className="mt-1 max-w-[220px] whitespace-pre-wrap break-words text-xs text-muted-foreground">
                            Note: {indent.decision_remarks}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-right">
                        {indent.status === 'PENDING_APPROVAL' && canApprove ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => openReview(indent, 'approve')}
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
                              onClick={() => openReview(indent, 'reject')}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {indent.status === 'PENDING_APPROVAL' ? 'Awaiting approver' : 'Reviewed'}
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
              {reviewMode === 'approve' ? 'Approve for Purchase' : 'Reject Indent'}
              {reviewTarget ? ` — ${reviewTarget.indent_no}` : ''}
            </DialogTitle>
            <DialogDescription className="text-left">
              {reviewMode === 'approve'
                ? 'The indent will be sent to the purchaser to buy the requested items.'
                : 'The requester will see this indent as rejected. Explain why it is rejected.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="indent-decision-remarks">
              {reviewMode === 'approve' ? 'Decision remarks (optional)' : 'Reason for rejection'}
            </Label>
            <Textarea
              id="indent-decision-remarks"
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
                setReviewError('');
              }}
              placeholder={
                reviewMode === 'approve'
                  ? 'Add an optional note for the audit trail'
                  : 'Why is this indent rejected?'
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

interface IndentCardProps {
  indent: MaterialIndent;
  canApprove: boolean;
  isSaving: boolean;
  onReview: (indent: MaterialIndent, mode: 'approve' | 'reject') => void;
}

/**
 * Phone layout for one indent. Everything the approver needs to decide fits
 * above the two full-width action buttons, so a long item list never pushes
 * Approve off the screen — the extra lines collapse behind a "+N more" toggle.
 */
function IndentCard({ indent, canApprove, isSaving, onReview }: IndentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const items = indent.items ?? [];
  const hidden = Math.max(0, items.length - MOBILE_ITEM_PREVIEW);
  const visibleItems = expanded ? items : items.slice(0, MOBILE_ITEM_PREVIEW);
  const isPending = indent.status === 'PENDING_APPROVAL';

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{indent.indent_no}</div>
          <div className="text-xs text-muted-foreground">{formatDate(indent.indent_date)}</div>
        </div>
        <StatusBadge status={indent.status} />
      </div>

      <div className="mt-2 space-y-0.5 text-sm">
        <div className="break-words font-medium">{indent.purpose || '-'}</div>
        <div className="text-xs text-muted-foreground">
          {indent.department_name || '-'} · {indent.requested_by_name || '-'}
        </div>
      </div>

      <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <div key={item.id} className="break-words">
              <span className="font-medium">
                {item.quantity} {item.unit}
              </span>{' '}
              {item.particulars}
            </div>
          ))}
          {items.length === 0 ? <span className="text-muted-foreground">No items</span> : null}
        </div>
        {hidden > 0 ? (
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Show less' : `+${hidden} more item${hidden === 1 ? '' : 's'}`}
          </button>
        ) : null}
      </div>

      {indent.decision_remarks ? (
        <p className="mt-2 break-words text-xs text-muted-foreground">
          Note: {indent.decision_remarks}
        </p>
      ) : null}
      {indent.approved_by_name ? (
        <p className="mt-1 text-xs text-muted-foreground">by {indent.approved_by_name}</p>
      ) : null}

      {isPending && canApprove ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="h-11"
            disabled={isSaving}
            onClick={() => onReview(indent, 'approve')}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-red-200 text-red-700 hover:bg-red-50"
            disabled={isSaving}
            onClick={() => onReview(indent, 'reject')}
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

function StatusBadge({ status }: { status: MaterialIndentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0',
        status === 'PENDING_APPROVAL' && 'border-amber-200 bg-amber-50 text-amber-700',
        status === 'APPROVED' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        status === 'REJECTED' && 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      {status === 'PENDING_APPROVAL'
        ? 'Pending Approval'
        : status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
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
