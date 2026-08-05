import { CheckCircle2, ExternalLink, Loader2, ShieldQuestion, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { GOODS_RETURN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type GoodsReturnListItem,
  useApproveGoodsReturn,
  useGoodsReturns,
  useRejectGoodsReturn,
} from '@/modules/goods-return/api';
import {
  APPROVAL_BADGE_CLASS,
  APPROVAL_LABELS,
  BASIS_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from '@/modules/goods-return/utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

type ReviewMode = 'approve' | 'reject';

/**
 * Admin queue for goods returns. Shows ALL returns for the admin's companies, but
 * an approve/reject action only appears on those the GR creator flagged "coming on
 * approval" and that are still pending. Approval is what unlocks receiving (the SAP
 * A/R Returns post).
 */
export default function GoodsReturnApprovalsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(GOODS_RETURN_PERMISSIONS.APPROVE);

  const { data: returns = [], isLoading } = useGoodsReturns({ all_companies: true });
  const approve = useApproveGoodsReturn();
  const reject = useRejectGoodsReturn();

  const [search, setSearch] = useState('');
  const [reviewTarget, setReviewTarget] = useState<GoodsReturnListItem | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('approve');
  const [remarks, setRemarks] = useState('');

  const isSaving = approve.isPending || reject.isPending;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return returns;
    return returns.filter((entry) =>
      [entry.entry_no, entry.customer_name, entry.customer_code, entry.company_name]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [returns, search]);

  const pendingCount = returns.filter(
    (entry) => entry.requires_approval && entry.approval_status === 'PENDING',
  ).length;

  function openReview(entry: GoodsReturnListItem, mode: ReviewMode) {
    setReviewTarget(entry);
    setReviewMode(mode);
    setRemarks('');
  }

  async function submitReview() {
    if (!reviewTarget) return;
    const mutation = reviewMode === 'approve' ? approve : reject;
    try {
      await mutation.mutateAsync({ id: reviewTarget.id, remarks: remarks.trim() });
      toast.success(
        reviewMode === 'approve'
          ? `${reviewTarget.entry_no} approved`
          : `${reviewTarget.entry_no} rejected`,
      );
      setReviewTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ShieldQuestion className="h-7 w-7 text-amber-600" />
            Goods Return Approvals
          </h2>
          <p className="text-muted-foreground">
            {pendingCount} return{pendingCount === 1 ? '' : 's'} awaiting your approval.
          </p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search entry, customer, company"
          />
        </div>
      </div>

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : filtered.length === 0 ? (
        <EmptyState text="No goods returns found" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Entry No.</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Basis</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Approval</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const isPending =
                      entry.requires_approval && entry.approval_status === 'PENDING';
                    return (
                      <tr key={entry.id} className="border-b transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="flex items-center gap-1 font-medium hover:underline"
                            onClick={() => navigate(`/goods-return/${entry.id}`)}
                          >
                            {entry.entry_no}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.company_name}</td>
                        <td className="px-4 py-3">
                          {entry.customer_name || entry.customer_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {BASIS_LABELS[entry.basis]}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('border-0', STATUS_BADGE_CLASS[entry.status])}>
                            {STATUS_LABELS[entry.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {entry.requires_approval ? (
                            <Badge
                              className={cn('border-0', APPROVAL_BADGE_CLASS[entry.approval_status])}
                            >
                              {APPROVAL_LABELS[entry.approval_status]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending && canApprove ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReview(entry, 'approve')}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-600" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReview(entry, 'reject')}
                              >
                                <XCircle className="mr-1 h-4 w-4 text-rose-600" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="text-right text-xs text-muted-foreground">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={reviewTarget !== null} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewMode === 'approve' ? 'Approve' : 'Reject'} {reviewTarget?.entry_no}
            </DialogTitle>
            <DialogDescription>
              {reviewMode === 'approve'
                ? 'Approving unlocks receiving this return (its SAP posting).'
                : 'Rejecting blocks this return from being received.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Remarks {reviewMode === 'reject' ? '(recommended)' : '(optional)'}</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Add a note for the returns team"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewTarget(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewMode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ShieldQuestion className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
