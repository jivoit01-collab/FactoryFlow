/**
 * The approver's queue.
 *
 * Every row here is one the server has already decided this person may act on
 * — `/leave/pending/` is scoped by the reporting tree, not merely by the
 * permission. So the page never asks "am I allowed?"; it asks the row, through
 * `can_decide`, and shows `my_authority` so a skip-level or HR decision is
 * visibly that rather than looking like an ordinary one.
 *
 * Approving here writes the day onto the attendance sheet. The banner says so,
 * because an approver who does not realise that will not understand why the
 * sheet changed underneath them.
 */
import { CalendarCheck, Check, History, X } from 'lucide-react';
import { useState } from 'react';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { usePendingLeave } from '../api';
import type { LeaveRequest } from '../api/leave.api';
import { DecisionDialog } from '../components/DecisionDialog';
import { LeaveHistoryDialog } from '../components/LeaveHistoryDialog';
import { authorityLabel, formatRange, portionLabel } from '../components/statusBits';

export default function LeaveApprovalsPage() {
  const { data: requests = [], isLoading } = usePendingLeave();
  const [target, setTarget] = useState<LeaveRequest | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [historyFor, setHistoryFor] = useState<LeaveRequest | null>(null);

  function open(request: LeaveRequest, nextMode: 'approve' | 'reject') {
    setTarget(request);
    setMode(nextMode);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Leave approvals</h1>
        <p className="text-sm text-muted-foreground">
          Requests from people who report to you. Approving one marks those days as leave on the
          attendance sheet — the punch machine&apos;s own reading is kept beside it, untouched.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <CalendarCheck className="mx-auto mb-2 h-6 w-6 opacity-40" />
                      Nothing waiting on you.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{request.employee_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.employee_code}
                          {request.department_name ? ` · ${request.department_name}` : ''}
                        </div>
                        {request.my_authority && request.my_authority !== 'manager' ? (
                          <div className="mt-1 text-xs text-amber-700">
                            {authorityLabel(request.my_authority)}
                          </div>
                        ) : null}
                      </td>
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
                      <td className="px-4 py-3 max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </td>
                      <td className="px-4 py-3">
                        {request.can_decide ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryFor(request)}
                              title="History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => open(request, 'approve')}>
                              <Check className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => open(request, 'reject')}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DecisionDialog request={target} mode={mode} onClose={() => setTarget(null)} />
      <LeaveHistoryDialog request={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}
