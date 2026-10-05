/**
 * Admin > Freight Approvals: trucks dispatch linked at a freight over the
 * benchmark for where they are going, or to a slab with no benchmark at all.
 *
 * Raised by Vehicle Linking the moment the freight is entered, usually before
 * the truck has arrived. Until one is approved the gate refuses the truck's
 * dispatch gate-in; a refusal sends dispatch back to enter a freight that can be
 * cleared. Everything shown is as it stood at linking — the rate, the capacity,
 * the bills — so a decision still reads as it was made after the benchmarks
 * move.
 *
 * Read across every company the approver belongs to, for the same reason the
 * late gate-in queue is: a truck's request is filed under whichever company's
 * bills it carries, and a queue scoped to one header leaves the others unseen.
 */
import { CheckCircle2, IndianRupee, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  type DispatchFreightApproval,
  type FreightApprovalStatus,
  useFreightApprovals,
  useReviewFreightApproval,
} from '@/modules/dispatch/api/freightApproval.api';
import { formatRupees } from '@/modules/dispatch/components/freight-approval/useTruckFreight';
import { EmptyPanel, PageHeader, StatusPill } from '@/shared/components';
import type { StatusTone } from '@/shared/components/page/StatusPill';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

type Filter = FreightApprovalStatus | 'ALL';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Refused' },
  { value: 'WITHIN_BENCHMARK', label: 'Within benchmark' },
  { value: 'ALL', label: 'All' },
];

const STATUS: Record<FreightApprovalStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Pending', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'done' },
  REJECTED: { label: 'Refused', tone: 'blocked' },
  WITHIN_BENCHMARK: { label: 'Within benchmark', tone: 'done' },
  SUPERSEDED: { label: 'Superseded', tone: 'neutral' },
};

const KG = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function benchmarkDetail(approval: DispatchFreightApproval): string {
  if (approval.benchmark_freight === null) return `No benchmark on ${approval.slab_label}`;
  if (approval.rate_basis === 'PER_KG' && approval.rate_amount !== null && approval.load_kg) {
    return `${formatRupees(approval.rate_amount)}/kg × ${KG.format(approval.load_kg)} kg`;
  }
  return approval.slab_label;
}

function Figure({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-base font-semibold tabular-nums',
          tone === 'warn' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ApprovalCard({
  approval,
  canDecide,
  onDecide,
}: {
  approval: DispatchFreightApproval;
  canDecide: boolean;
  onDecide: (approval: DispatchFreightApproval, approve: boolean) => void;
}) {
  const status = STATUS[approval.status];
  const overPct =
    approval.excess !== null && approval.benchmark_freight
      ? (approval.excess / approval.benchmark_freight) * 100
      : null;
  const slabChanged = approval.suggested_slab !== null && approval.suggested_slab !== approval.slab;

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-semibold">{approval.vehicle_no}</span>
            <Badge variant="outline">{approval.company_code}</Badge>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </p>
          <p className="text-sm text-muted-foreground">
            {approval.transporter_name || 'No transporter'} · to{' '}
            <span className="font-medium text-foreground">{approval.destination_label}</span>
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {approval.requested_by_name || 'Dispatch'}
          <br />
          {formatDateTimeShort(approval.requested_at)}
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Figure
          label="Benchmark"
          value={
            approval.benchmark_freight !== null ? formatRupees(approval.benchmark_freight) : '—'
          }
          sub={benchmarkDetail(approval)}
        />
        <Figure label="Actual freight" value={formatRupees(approval.actual_freight)} />
        <Figure
          label="Over by"
          value={approval.excess !== null ? formatRupees(approval.excess) : 'No benchmark'}
          sub={overPct !== null ? `${overPct.toFixed(1)}% over` : undefined}
          tone={approval.excess === null || approval.excess > 0 ? 'warn' : undefined}
        />
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Slab</dt>
        <dd>
          {approval.slab_label}
          {slabChanged && (
            <span className="ml-1 text-amber-700 dark:text-amber-400">
              (capacity puts it in {approval.suggested_slab_label})
            </span>
          )}
        </dd>
        <dt className="text-muted-foreground">Capacity</dt>
        <dd className="tabular-nums">
          {approval.vehicle_capacity_kg !== null
            ? `${KG.format(approval.vehicle_capacity_kg)} kg`
            : 'Not on the vehicle master'}
        </dd>
        <dt className="text-muted-foreground">Bills</dt>
        <dd className="min-w-0">
          <span className="tabular-nums">{approval.bill_count}</span>
          {approval.bill_doc_nums && (
            <span className="text-muted-foreground"> · {approval.bill_doc_nums}</span>
          )}
        </dd>
        {approval.customer_names && (
          <>
            <dt className="text-muted-foreground">Customers</dt>
            <dd className="min-w-0 break-words">{approval.customer_names}</dd>
          </>
        )}
      </dl>

      {approval.reason && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">Dispatch: </span>
          {approval.reason}
        </p>
      )}

      {approval.reviewed_at && (
        <p className="text-sm text-muted-foreground">
          {status.label} by {approval.reviewed_by_name || 'an approver'} on{' '}
          {formatDateTimeShort(approval.reviewed_at)}
          {approval.review_notes ? ` — ${approval.review_notes}` : ''}
        </p>
      )}

      {canDecide && approval.status === 'PENDING' && (
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button
            variant="outline"
            className="text-rose-700 hover:text-rose-800 dark:text-rose-400"
            onClick={() => onDecide(approval, false)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Refuse
          </Button>
          <Button onClick={() => onDecide(approval, true)}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
        </div>
      )}
    </article>
  );
}

export default function FreightApprovalsPage() {
  const { hasPermission } = usePermission();
  const canDecide = hasPermission(DISPATCH_PERMISSIONS.APPROVE_FREIGHT_APPROVALS);

  const [filter, setFilter] = useState<Filter>('PENDING');
  const { data = [], isLoading, isError, error } = useFreightApprovals(filter);
  const review = useReviewFreightApproval();

  const [target, setTarget] = useState<DispatchFreightApproval | null>(null);
  const [approve, setApprove] = useState(true);
  const [notes, setNotes] = useState('');
  const [problem, setProblem] = useState('');

  function openDecision(approval: DispatchFreightApproval, approving: boolean) {
    setTarget(approval);
    setApprove(approving);
    setNotes('');
    setProblem('');
  }

  async function decide() {
    if (!target) return;
    const trimmed = notes.trim();
    if (!approve && !trimmed) {
      setProblem('Say why it is refused — dispatch reads it and has to re-enter the freight.');
      return;
    }
    try {
      await review.mutateAsync({ id: target.id, approve, notes: trimmed });
      toast.success(
        approve
          ? `${target.vehicle_no} cleared at ${formatRupees(target.actual_freight)}`
          : `${target.vehicle_no}'s freight refused`,
      );
      setTarget(null);
    } catch (err) {
      setProblem(getErrorMessage(err, 'Could not save the decision.'));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Freight Approvals" icon={IndianRupee} accent="amber" />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            role="tab"
            aria-selected={filter === option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <EmptyPanel loading message="Reading the freight approvals…" />
      ) : isError ? (
        <EmptyPanel
          message="The freight approvals could not be read"
          hint={getErrorMessage(error, 'Try again in a moment.')}
        />
      ) : data.length === 0 ? (
        <EmptyPanel
          icon={IndianRupee}
          message={
            filter === 'PENDING' ? 'No freight is waiting for approval' : 'Nothing to show here'
          }
          hint={
            filter === 'PENDING' ? 'A truck linked over its benchmark shows up here.' : undefined
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              canDecide={canDecide}
              onDecide={openDecision}
            />
          ))}
        </div>
      )}

      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && !review.isPending && setTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approve ? 'Approve' : 'Refuse'} {target?.vehicle_no}&apos;s freight
            </DialogTitle>
            <DialogDescription>
              {target &&
                `${formatRupees(target.actual_freight)} to ${target.destination_label}${
                  target.benchmark_freight !== null
                    ? ` against a ${formatRupees(target.benchmark_freight)} benchmark.`
                    : ', with no benchmark on that slab.'
                }`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="freight-review-notes">
              {approve ? 'Note (optional)' : 'Why is it refused?'}
            </Label>
            <Textarea
              id="freight-review-notes"
              rows={3}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setProblem('');
              }}
              autoFocus
            />
            {problem && <p className="text-sm text-rose-600">{problem}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={review.isPending}>
              Cancel
            </Button>
            <Button
              variant={approve ? 'default' : 'destructive'}
              onClick={decide}
              disabled={review.isPending}
            >
              {review.isPending ? 'Saving…' : approve ? 'Approve' : 'Refuse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
