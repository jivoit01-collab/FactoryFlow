import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

import type { ExpenseClaim } from '@/modules/accounts/api';
import { useExpenseClaims } from '@/modules/accounts/api';
import { ExpenseFormDialog } from '@/modules/accounts/components/ExpenseFormDialog';
import { expenseMoney } from '@/modules/accounts/components/expenseStatus';
import { ExpenseStatusBadge } from '@/modules/accounts/components/ExpenseStatusBadge';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

const MINE = { by_me: true } as const;

/**
 * Expense Entry — the expenses you have put in, newest first, and where each
 * has got to. "New expense" opens the form for another; clicking one opens the
 * same form filled in, to change until it is approved.
 */
export default function ExpenseEntryPage() {
  // 'new' for a blank form, an expense to open it filled in, null when shut.
  const [open, setOpen] = useState<ExpenseClaim | 'new' | null>(null);
  const { data, isLoading } = useExpenseClaims(MINE);
  const rows = data?.results ?? [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Expense Entry"
        primaryAction={{
          label: 'New expense',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => setOpen('new'),
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">You have not sent any expenses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
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
                  <tr
                    key={row.id}
                    tabIndex={0}
                    title={row.status === 'APPROVED' ? 'Approved' : 'Click to change'}
                    className="cursor-pointer border-b align-top hover:bg-muted/40"
                    onClick={() => setOpen(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setOpen(row);
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateTimeShort(row.submitted_at)}
                    </td>
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
                      <ExpenseStatusBadge status={row.status} />
                      {row.decided_at && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDateTimeShort(row.decided_at)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <ExpenseFormDialog
          claim={open === 'new' ? null : open}
          onOpenChange={(next) => !next && setOpen(null)}
        />
      )}
    </div>
  );
}
