import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  PackageCheck,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
// Imported by direct path, not through the module barrels. The components barrel
// re-exports ReturnableForm, which pulls in @/modules/gate/components and its
// driver/vehicle zod schemas; bundled for production those became side-effect
// imports evaluated when this page's chunk loads, and the page died before it
// rendered. Dev never showed it because unbundled modules load in isolation.
import {
  useApproveReturnable,
  useRejectReturnable,
  useReturnableGatePasses,
  useReturnablePendingApproval,
} from '@/modules/maintenance/api/returnableGatePass.queries';
import { ReturnableStatusBadge } from '@/modules/maintenance/components/returnable/ReturnableStatusBadge';
import { ReturnableTypeBadge } from '@/modules/maintenance/components/returnable/ReturnableTypeBadge';
import type { ReturnableGatePassListItem } from '@/modules/maintenance/types';
import {
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

type QueueTab = 'PENDING_APPROVAL' | 'PENDING_GATE_OUT';
type ReviewMode = 'approve' | 'reject';

const TABS: { value: QueueTab; label: string; shortLabel: string }[] = [
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', shortLabel: 'Pending' },
  { value: 'PENDING_GATE_OUT', label: 'Approved — At Gate', shortLabel: 'At Gate' },
];

/** Items shown on a phone card before the "+N more" toggle. */
const MOBILE_ITEM_PREVIEW = 2;

/**
 * Admin-side mirror of the returnable / non-returnable approval step. The pass is
 * still raised and closed inside Maintenance; this page only exists so approvers
 * find every queue waiting on them in one place instead of hunting through the
 * department's own register.
 */
export default function ReturnableApprovalsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(RETURNABLE_PERMISSIONS.APPROVE_GATEPASS);

  const [tab, setTab] = useState<QueueTab>('PENDING_APPROVAL');

  const pendingApproval = useReturnablePendingApproval(tab === 'PENDING_APPROVAL');
  // The approved-and-waiting list is read-only context: it shows the approver what
  // has already been handed to the gate but not yet gone out.
  const pendingGateOut = useReturnableGatePasses(
    { status: 'PENDING_GATE_OUT' },
    tab === 'PENDING_GATE_OUT',
  );

  const { data: passes = [], isLoading } =
    tab === 'PENDING_APPROVAL' ? pendingApproval : pendingGateOut;

  const approvePass = useApproveReturnable();
  const rejectPass = useRejectReturnable();

  const [reviewTarget, setReviewTarget] = useState<ReturnableGatePassListItem | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [reviewError, setReviewError] = useState('');

  const isSaving = approvePass.isPending || rejectPass.isPending;

  const openReview = (pass: ReturnableGatePassListItem, mode: 'approve' | 'reject') => {
    setReviewTarget(pass);
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
      setReviewError('A reason is required when sending a pass back.');
      return;
    }
    setReviewError('');
    try {
      if (reviewMode === 'approve') {
        await approvePass.mutateAsync({
          passId: reviewTarget.id,
          payload: { remarks: trimmed },
        });
        toast.success(`${reviewTarget.pass_no} approved and sent to the gate`);
      } else {
        await rejectPass.mutateAsync({
          passId: reviewTarget.id,
          payload: { reason: trimmed },
        });
        toast.success(`${reviewTarget.pass_no} sent back to the department`);
      }
      setReviewTarget(null);
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Unable to save this decision'));
    }
  };

  const emptyLabel = TABS.find((t) => t.value === tab)?.label.toLowerCase();

  return (
    <div className="space-y-4 pb-6 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Returnable / Non-returnable Approvals
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Sign off on material leaving the gate for repair, exchange or job work. Approving releases
          the pass to the gate; sending it back returns it to the department as a draft.
        </p>
      </div>

      {/* Filter tabs sit outside the card on a phone so the list starts higher up. */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {TABS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={tab === item.value ? 'default' : 'outline'}
            onClick={() => setTab(item.value)}
          >
            {item.shortLabel}
          </Button>
        ))}
      </div>

      {/* ---- Phone: one card per pass, no horizontal scrolling ---- */}
      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading gate passes...
          </div>
        ) : passes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
            <ShieldQuestion className="h-8 w-8" />
            <p>No {emptyLabel} gate passes.</p>
          </div>
        ) : (
          passes.map((pass) => (
            <PassCard
              key={pass.id}
              pass={pass}
              canApprove={canApprove}
              isSaving={isSaving}
              onReview={openReview}
              onOpenDetail={() => navigate(`/maintenance/returnable/${pass.id}`)}
            />
          ))
        )}
      </div>

      <Card className="hidden sm:block">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <PackageCheck className="h-5 w-5" />
              Gate Passes
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {TABS.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={tab === item.value ? 'default' : 'outline'}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading gate passes...
            </div>
          ) : passes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <ShieldQuestion className="h-8 w-8" />
              <p>No {emptyLabel} gate passes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Pass No</th>
                    <th className="p-3 text-left font-medium">Purpose / Dept</th>
                    <th className="p-3 text-left font-medium">Going To</th>
                    <th className="p-3 text-left font-medium">Items</th>
                    <th className="p-3 text-left font-medium">Expected Back</th>
                    <th className="p-3 text-left font-medium">Raised By</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((pass) => (
                    <tr key={pass.id} className="border-b align-top last:border-b-0">
                      <td className="p-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:underline"
                          onClick={() => navigate(`/maintenance/returnable/${pass.id}`)}
                        >
                          {pass.pass_no}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ReturnableTypeBadge isReturnable={pass.is_returnable} />
                          <ReturnableStatusBadge
                            status={pass.status}
                            isOverdue={pass.is_overdue}
                            daysOverdue={pass.days_overdue}
                          />
                        </div>
                        {pass.material_indent_no ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Indent {pass.material_indent_no}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{pass.purpose_display || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {pass.department_name || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] whitespace-pre-wrap break-words">
                          {pass.destination || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[260px] whitespace-pre-wrap break-words">
                          {pass.item_names || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pass.item_count} item{pass.item_count === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="p-3">{formatDate(pass.expected_return_date)}</td>
                      <td className="p-3">
                        <div className="font-medium">{pass.created_by_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(pass.created_at)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {pass.status === 'PENDING_APPROVAL' && canApprove ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => openReview(pass, 'approve')}
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
                              onClick={() => openReview(pass, 'reject')}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {pass.status === 'PENDING_APPROVAL' ? 'Awaiting approver' : 'With gate'}
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
              {reviewMode === 'approve' ? 'Approve Gate Pass' : 'Send Back to Department'}
              {reviewTarget ? ` — ${reviewTarget.pass_no}` : ''}
            </DialogTitle>
            <DialogDescription className="text-left">
              {reviewMode === 'approve'
                ? 'The pass moves to the gate, which will record the vehicle and let the material out.'
                : 'The pass returns to the department as a draft. Explain what needs to change.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="returnable-decision-remarks">
              {reviewMode === 'approve' ? 'Remarks (optional)' : 'Reason for sending back'}
            </Label>
            <Textarea
              id="returnable-decision-remarks"
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
                setReviewError('');
              }}
              placeholder={
                reviewMode === 'approve'
                  ? 'Add an optional note for the gate pass timeline'
                  : 'Why is this pass being sent back?'
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

interface PassCardProps {
  pass: ReturnableGatePassListItem;
  canApprove: boolean;
  isSaving: boolean;
  onReview: (pass: ReturnableGatePassListItem, mode: ReviewMode) => void;
  onOpenDetail: () => void;
}

/**
 * Phone layout for one gate pass. The item list is the only unbounded field, so
 * it collapses behind a "+N more" toggle — that keeps Approve/Reject within
 * thumb reach no matter how many lines the pass carries.
 */
function PassCard({ pass, canApprove, isSaving, onReview, onOpenDetail }: PassCardProps) {
  const [expanded, setExpanded] = useState(false);

  // The list endpoint sends the item names comma-joined, not as an array.
  const items = pass.item_names ? pass.item_names.split(',').map((name) => name.trim()) : [];
  const hidden = Math.max(0, items.length - MOBILE_ITEM_PREVIEW);
  const visibleItems = expanded ? items : items.slice(0, MOBILE_ITEM_PREVIEW);
  const isPending = pass.status === 'PENDING_APPROVAL';

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1 text-left"
          onClick={onOpenDetail}
        >
          <span className="truncate font-semibold">{pass.pass_no}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
        <ReturnableStatusBadge
          status={pass.status}
          isOverdue={pass.is_overdue}
          daysOverdue={pass.days_overdue}
        />
      </div>

      <div className="mt-1.5">
        <ReturnableTypeBadge isReturnable={pass.is_returnable} />
      </div>

      <div className="mt-2 space-y-0.5 text-sm">
        <div className="break-words font-medium">{pass.purpose_display || '-'}</div>
        <div className="break-words text-xs text-muted-foreground">
          To {pass.destination || '-'} · {pass.department_name || '-'}
        </div>
        <div className="text-xs text-muted-foreground">
          {pass.created_by_name || '-'} · Back by {formatDate(pass.expected_return_date)}
        </div>
      </div>

      <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
        <div className="space-y-1">
          {visibleItems.map((name, index) => (
            <div key={`${name}-${index}`} className="break-words">
              {name}
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

      {pass.material_indent_no ? (
        <p className="mt-2 text-xs text-muted-foreground">Indent {pass.material_indent_no}</p>
      ) : null}

      {isPending && canApprove ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="h-11"
            disabled={isSaving}
            onClick={() => onReview(pass, 'approve')}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-red-200 text-red-700 hover:bg-red-50"
            disabled={isSaving}
            onClick={() => onReview(pass, 'reject')}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {isPending ? 'Awaiting approver' : 'With gate'}
        </p>
      )}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
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
