/**
 * My leave — what I have asked for, and where each one got to.
 *
 * The column that earns its place is **Waiting on**. The first thing anybody
 * asks about a pending request is who is sitting on it, and the reporting tree
 * already knows; the server sends it on every row so the answer is on screen
 * rather than in somebody's head.
 *
 * Withdraw is offered from `can_withdraw` on the row, not from a permission.
 * Whether you may take a request back depends on whether it is still pending
 * and whether it is yours — both of which the server has already decided.
 */
import { CalendarPlus, History, Undo2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LEAVE_APPLY_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Button, Card, CardContent, NativeSelect, SelectOption } from '@/shared/components/ui';

import { useLeaveRequests, useWithdrawLeave } from '../api';
import type { LeaveRequest, LeaveRequestStatus } from '../api/leave.api';
import { ApplyLeaveDialog } from '../components/ApplyLeaveDialog';
import { BalanceCards } from '../components/BalanceCards';
import { CancelLeaveDialog } from '../components/CancelLeaveDialog';
import { LeaveHistoryDialog } from '../components/LeaveHistoryDialog';
import { LeaveStatusBadge } from '../components/LeaveStatusBadge';
import { formatRange, portionLabel } from '../components/statusBits';

const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function MyLeavePage() {
  const { hasAnyPermission } = usePermission();
  const canApply = hasAnyPermission(LEAVE_APPLY_ACCESS);

  const [status, setStatus] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<LeaveRequest | null>(null);
  const [cancelFor, setCancelFor] = useState<LeaveRequest | null>(null);

  const { data: requests = [], isLoading } = useLeaveRequests({
    mine: true,
    status: (status || undefined) as LeaveRequestStatus | undefined,
  });
  const withdraw = useWithdrawLeave();

  function onWithdraw(id: number) {
    withdraw.mutate(
      { id },
      {
        onSuccess: () => toast.success('Request withdrawn.'),
        onError: () => undefined,
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My leave</h1>
          <p className="text-sm text-muted-foreground">
            What you have applied for, and who it is with.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-40"
            aria-label="Filter by status"
          >
            {FILTERS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>
          {canApply ? (
            <Button onClick={() => setApplyOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Apply
            </Button>
          ) : null}
        </div>
      </div>

      <BalanceCards />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Waiting on</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nothing here yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatRange(request.from_date, request.to_date)}
                        {request.portion !== 'FULL' ? (
                          <div className="text-xs text-muted-foreground">
                            {portionLabel(request.portion)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{request.leave_type_name}</td>
                      <td className="px-4 py-3">{request.total_days}</td>
                      <td className="px-4 py-3">
                        <LeaveStatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.status === 'PENDING'
                          ? request.responsible_manager_name || '—'
                          : request.decided_by_name || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryFor(request)}
                            title="History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {request.can_withdraw ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onWithdraw(request.id)}
                              disabled={withdraw.isPending}
                            >
                              <Undo2 className="mr-1 h-4 w-4" />
                              Withdraw
                            </Button>
                          ) : null}
                          {request.can_cancel ? (
                            <Button variant="ghost" size="sm" onClick={() => setCancelFor(request)}>
                              <XCircle className="mr-1 h-4 w-4" />
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} />
      <LeaveHistoryDialog request={historyFor} onClose={() => setHistoryFor(null)} />
      <CancelLeaveDialog request={cancelFor} onClose={() => setCancelFor(null)} />
    </div>
  );
}
