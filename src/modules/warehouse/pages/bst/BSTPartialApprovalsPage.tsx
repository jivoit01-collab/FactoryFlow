import { CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Textarea } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  BST_LIVE_POLL_MS,
  useApproveBSTPartialTransfer,
  useBSTPartialTransfers,
  useRejectBSTPartialTransfer,
} from '../../api';
import type { BSTPartialTransferRequest } from '../../types';

const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: '', label: 'All' },
] as const;

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function StatusBadge({ status }: { status: BSTPartialTransferRequest['status'] }) {
  if (status === 'APPROVED')
    return (
      <Badge variant="success">
        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approved
      </Badge>
    );
  if (status === 'REJECTED')
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        <XCircle className="mr-1 h-3.5 w-3.5" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
      <Clock className="mr-1 h-3.5 w-3.5" /> Pending
    </Badge>
  );
}

function RequestRow({ req }: { req: BSTPartialTransferRequest }) {
  const approveMut = useApproveBSTPartialTransfer();
  const rejectMut = useRejectBSTPartialTransfer();
  const [notes, setNotes] = useState('');
  const busy = approveMut.isPending || rejectMut.isPending;

  const short = Number(req.expected_qty) - Number(req.scanned_qty);

  const handleApprove = async () => {
    try {
      await approveMut.mutateAsync({ requestId: req.id, reviewNotes: notes.trim() });
      toast.success(`Approved — ${req.transfer_entry_no} can be sealed short`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve'));
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error('Add a note explaining the rejection');
      return;
    }
    try {
      await rejectMut.mutateAsync({ requestId: req.id, reviewNotes: notes.trim() });
      toast.success(`Rejected — ${req.transfer_entry_no} stays locked`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reject'));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-3 pt-4 sm:p-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{req.transfer_entry_no}</div>
            <div className="text-xs text-muted-foreground sm:text-sm">
              Requested by {req.requested_by_name || '—'} · {formatWhen(req.requested_at)}
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span>
            <span className="text-muted-foreground">Scanned:</span>{' '}
            <span className="font-medium tabular-nums">{req.scanned_qty}</span> of{' '}
            <span className="font-medium tabular-nums">{req.expected_qty}</span> pcs
          </span>
          <span className={cn(short > 0 && 'text-amber-700')}>
            <span className="text-muted-foreground">Short by:</span>{' '}
            <span className="font-medium tabular-nums">{short}</span> pcs
          </span>
        </div>

        <div className="break-words rounded-md border bg-muted/30 p-2 text-sm">
          <span className="text-muted-foreground">Reason: </span>
          {req.reason || '—'}
        </div>

        {req.status === 'PENDING' ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Review note (required to reject)…"
              rows={2}
            />
            {/* Full-width thumb targets on a phone; compact and right-aligned above it. */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button
                className="h-11 sm:h-9"
                variant="outline"
                onClick={handleReject}
                disabled={busy}
              >
                {rejectMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-1 h-4 w-4" />
                )}
                Reject
              </Button>
              <Button className="h-11 sm:h-9" onClick={handleApprove} disabled={busy}>
                {approveMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                )}
                Approve
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Reviewed by {req.reviewed_by_name || '—'} · {formatWhen(req.reviewed_at)}
            {req.review_notes ? ` — ${req.review_notes}` : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BSTPartialApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const { data, isLoading } = useBSTPartialTransfers(
    statusFilter ? { status: statusFilter } : undefined,
    { refetchInterval: BST_LIVE_POLL_MS },
  );
  const requests = data ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        title="BST Partial-Transfer Approvals"
        description="Review requests to seal a branch transfer whose scanned quantity is short of the bill."
      />

      <div className="grid grid-cols-2 gap-2 sm:flex">
        {FILTERS.map((f) => (
          <Button
            key={f.key || 'all'}
            size="sm"
            variant={statusFilter === f.key ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {statusFilter === 'PENDING'
              ? 'No pending partial-transfer requests.'
              : 'No partial-transfer requests yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestRow key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}
