import { Check, ClipboardList, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { ExpenseClaim, ExpenseListParams } from '@/modules/accounts/api';
import { useDecideExpense, useExpenseClaims } from '@/modules/accounts/api';
import { expenseMoney } from '@/modules/accounts/components/expenseStatus';
import { ExpenseStatusBadge } from '@/modules/accounts/components/ExpenseStatusBadge';
import { confirmDialog, promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, NativeSelect, SelectOption } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

const VIEWS: Record<string, { label: string; params: ExpenseListParams }> = {
  waiting: { label: 'Waiting for me', params: { status: 'PENDING_APPROVAL', for_me: true } },
  mine: { label: 'All sent to me', params: { for_me: true } },
  all: { label: 'All expenses', params: {} },
};

/**
 * Expense Approval — whoever an expense was sent to decides it here.
 *
 * Opens on the expenses waiting for you, each with Approve and Reject. A
 * rejection needs a reason, which goes back to whoever put it in. "All sent to
 * me" shows what you already decided. Cash book approvers also get "All
 * expenses": every one put in, across all companies.
 */
export default function ExpenseApprovalPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const seesAll = hasPermission(CASH_BOOK_PERMISSIONS.APPROVE);
  const views = Object.entries(VIEWS).filter(([key]) => key !== 'all' || seesAll);
  const [view, setView] = useState('waiting');
  const { data, isLoading } = useExpenseClaims(VIEWS[view].params);
  const decide = useDecideExpense();
  const rows = data?.results ?? [];

  const waitsOnMe = (claim: ExpenseClaim) =>
    claim.status === 'PENDING_APPROVAL' && claim.approver === user?.id;

  async function approve(claim: ExpenseClaim) {
    const ok = await confirmDialog({
      title: `Approve ${expenseMoney(claim.amount)}?`,
      description: `${claim.submitted_by_name ?? 'Unknown'}: ${claim.comment}`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    try {
      await decide.mutateAsync({ id: claim.id, approve: true });
      toast.success('Approved');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That expense could not be approved.'));
    }
  }

  async function reject(claim: ExpenseClaim) {
    const note = await promptDialog({
      title: `Reject ${expenseMoney(claim.amount)}?`,
      description: 'The reason goes back to whoever put it in.',
      label: 'Why?',
      placeholder: 'No bill attached',
      confirmLabel: 'Reject',
      destructive: true,
      required: true,
      multiline: true,
    });
    if (note === null) return;
    try {
      await decide.mutateAsync({ id: claim.id, approve: false, note });
      toast.success('Rejected');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That expense could not be rejected.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Expense Approval">
        <NativeSelect
          aria-label="Which expenses to show"
          className="w-[220px]"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          {views.map(([key, row]) => (
            <SelectOption key={key} value={key}>
              {row.label}
              {key === 'waiting' && data && view === 'waiting'
                ? ` (${data.counts.PENDING_APPROVAL})`
                : ''}
            </SelectOption>
          ))}
        </NativeSelect>
      </DashboardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {view === 'waiting' ? 'Nothing is waiting for your approval.' : 'No expenses here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">By</th>
                  <th className="px-3 py-2 font-medium">Branch</th>
                  <th className="px-3 py-2 font-medium">Budget</th>
                  <th className="px-3 py-2 font-medium">G/L account</th>
                  <th className="px-3 py-2 font-medium">Comment</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Approval goes to</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateTimeShort(row.submitted_at)}
                    </td>
                    <td className="px-3 py-2">{row.submitted_by_name ?? '—'}</td>
                    <td className="px-3 py-2">{row.company_name}</td>
                    <td className="px-3 py-2">{row.budget_name}</td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs">{row.gl_account_code}</p>
                      <p className="text-xs text-muted-foreground">{row.gl_account_name}</p>
                    </td>
                    <td className="max-w-[320px] px-3 py-2">
                      {row.comment}
                      {row.status === 'REJECTED' && row.decision_note && (
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                          {row.decision_note}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {expenseMoney(row.amount)}
                    </td>
                    <td className="px-3 py-2">{row.approver_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {waitsOnMe(row) ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approve(row)}
                            disabled={decide.isPending}
                          >
                            <Check className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reject(row)}
                            disabled={decide.isPending}
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <>
                          <ExpenseStatusBadge status={row.status} />
                          {row.decided_at && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {formatDateTimeShort(row.decided_at)}
                            </p>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
