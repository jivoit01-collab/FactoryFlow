import { Check, ClipboardList, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth/hooks/useAuth';
import type { ExpenseClaim, ExpenseClaimStatus } from '@/modules/accounts/api';
import { useDecideExpense, useExpenseClaims } from '@/modules/accounts/api';
import { ExpenseAttachmentLinks } from '@/modules/accounts/components/ExpenseAttachmentLinks';
import { ExpenseGLCell } from '@/modules/accounts/components/ExpenseGLCell';
import { EXPENSE_STATUS_LABEL, expenseMoney } from '@/modules/accounts/components/expenseStatus';
import { ExpenseStatusBadge } from '@/modules/accounts/components/ExpenseStatusBadge';
import { confirmDialog, promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, NativeSelect, SelectOption } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

type Filter = ExpenseClaimStatus | 'ALL';

const STATUSES: ExpenseClaimStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

/**
 * Expense Approval — every expense put in, across all companies, for the
 * expense approvers.
 *
 * Opens on those awaiting approval, each with Approve and Reject. Any approver
 * may decide any expense but their own. A rejection needs a reason, which goes
 * back to whoever put it in.
 */
export default function ExpenseApprovalPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('PENDING_APPROVAL');
  const { data, isLoading } = useExpenseClaims(filter === 'ALL' ? {} : { status: filter });
  const decide = useDecideExpense();
  const rows = data?.results ?? [];
  const counts = data?.counts;

  const decidable = (claim: ExpenseClaim) =>
    claim.status === 'PENDING_APPROVAL' && claim.submitted_by !== user?.id;

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
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {STATUSES.map((value) => (
            <SelectOption key={value} value={value}>
              {EXPENSE_STATUS_LABEL[value]}
              {counts ? ` (${counts[value]})` : ''}
            </SelectOption>
          ))}
          <SelectOption value="ALL">All</SelectOption>
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
              {filter === 'PENDING_APPROVAL'
                ? 'Nothing is waiting for approval.'
                : 'No expenses here.'}
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
                      <ExpenseGLCell claim={row} />
                    </td>
                    <td className="max-w-[320px] px-3 py-2">
                      {row.comment}
                      <ExpenseAttachmentLinks attachments={row.attachments ?? []} />
                      {row.status === 'REJECTED' && row.decision_note && (
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                          {row.decision_note}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {expenseMoney(row.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {decidable(row) ? (
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
                          {row.status === 'PENDING_APPROVAL' && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Yours — somebody else approves it
                            </p>
                          )}
                          {row.decided_at && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {row.decided_by_name} · {formatDateTimeShort(row.decided_at)}
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
