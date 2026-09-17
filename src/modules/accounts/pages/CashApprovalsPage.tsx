import { Check, ClipboardList, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { EntryApprovalStatus } from '@/modules/accounts/api';
import { useApprovalQueue, useDecideEntries } from '@/modules/accounts/api';
import { ColumnFilter } from '@/modules/accounts/components/ColumnFilter';
import { useLocalColumns } from '@/modules/accounts/components/useLocalColumns';
import { confirmDialog, promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDateTimeShort, formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => formatNumber(Number(value ?? 0));

const STATE_LABEL: Record<EntryApprovalStatus, string> = {
  NOT_REQUIRED: 'Receipt',
  PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATE_TONE: Record<EntryApprovalStatus, string> = {
  NOT_REQUIRED: 'bg-muted text-muted-foreground',
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};

/**
 * Cash approvals — the payments waiting on somebody.
 *
 * Entries, not bunches. A bunch is the bundle of paper vouchers walked to the
 * office together, and bundling them is not a decision about them; it used to
 * be the only route to approval, which meant a payment typed on Tuesday waited
 * on a batch that went on Friday.
 *
 * Approving freezes the entry for good and is what makes it count as spent at
 * the top of the register. Rejecting must say why, and unfreezes it so the
 * custodian can put it right and send it again.
 *
 * Several can be decided at once, because that is how a stack of vouchers is
 * actually gone through — but each carries its own verdict, so approving nine
 * of ten leaves the tenth exactly where it was.
 */
export default function CashApprovalsPage() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(CASH_BOOK_PERMISSIONS.APPROVE);

  const [state, setState] = useState<EntryApprovalStatus>('PENDING');
  const [selected, setSelected] = useState<number[]>([]);


  const { data, isLoading } = useApprovalQueue(state);
  const decide = useDecideEntries();

  const all = useMemo(() => data?.results ?? [], [data]);
  const counts = data?.counts;
  const deciding = state === 'PENDING' && canApprove;

  // The queue arrives whole (capped at 500), so its column filters are built
  // from the rows themselves rather than asked for.
  const { rows, column, filteredColumns, clearFilters } = useLocalColumns(
    all,
    {
      date: { value: (row) => row.entry_date },
      branch: { value: (row) => row.branch_name },
      gl: { value: (row) => row.gl_account_name },
      item: { value: (row) => row.item },
      detail: { value: (row) => row.detail },
      advance: { value: (row) => row.advance_holder_name },
      amount: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
      },
    },
    { key: 'date', direction: 'desc' },
  );

  // Scoped to the rows actually on screen: a selection surviving a filter
  // change would let somebody decide entries they can no longer see.
  const chosen = useMemo(
    () => selected.filter((id) => rows.some((row) => row.id === id)),
    [selected, rows],
  );
  const chosenTotal = rows
    .filter((row) => chosen.includes(row.id))
    .reduce((sum, row) => sum + Number(row.amount), 0);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function changeState(next: EntryApprovalStatus) {
    setState(next);
    setSelected([]);
    clearFilters();
  }

  const filtering = filteredColumns.length > 0;

  async function approve() {
    if (chosen.length === 0) return;
    const ok = await confirmDialog({
      title: `Approve ${chosen.length} ${chosen.length === 1 ? 'payment' : 'payments'}?`,
      description: `${money(chosenTotal)} in total. Your name and the time go against each one, they can no longer be corrected, and they start counting as spent at the top of the register.`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    try {
      await decide.mutateAsync({ ids: chosen, approve: true });
      setSelected([]);
      toast.success(`${chosen.length} approved`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Those could not be approved.'));
    }
  }

  async function reject() {
    if (chosen.length === 0) return;
    const note = await promptDialog({
      title: `Send ${chosen.length} ${chosen.length === 1 ? 'payment' : 'payments'} back?`,
      description:
        'They unfreeze so the custodian can correct them and send them again. The reason goes against every one you have ticked.',
      label: 'What is wrong with them?',
      placeholder: 'Bill number missing',
      confirmLabel: 'Reject',
      destructive: true,
      required: true,
    });
    if (note === null) return;
    try {
      await decide.mutateAsync({ ids: chosen, approve: false, note });
      setSelected([]);
      toast.success(`${chosen.length} sent back`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Those could not be rejected.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cash Approvals"
        description="Payments from the cash book waiting on a decision"
      >
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Which entries to show"
            className="w-[210px]"
            value={state}
            onChange={(e) => changeState(e.target.value as EntryApprovalStatus)}
          >
            <SelectOption value="PENDING">
              Awaiting approval{counts ? ` (${counts.PENDING})` : ''}
            </SelectOption>
            <SelectOption value="APPROVED">
              Approved{counts ? ` (${counts.APPROVED})` : ''}
            </SelectOption>
            <SelectOption value="REJECTED">
              Rejected{counts ? ` (${counts.REJECTED})` : ''}
            </SelectOption>
          </NativeSelect>

          {filtering && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          {deciding && chosen.length > 0 && (
            <>
              <Button onClick={approve} disabled={decide.isPending}>
                {decide.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve {chosen.length}
              </Button>
              <Button variant="outline" onClick={reject} disabled={decide.isPending}>
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{STATE_LABEL[state]}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {money(rows.reduce((sum, row) => sum + Number(row.amount), 0))}
            </p>
            <p className="text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
              {filtering ? ` of ${all.length}` : ''}
            </p>
          </CardContent>
        </Card>
        {chosen.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Ticked</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{money(chosenTotal)}</p>
              <p className="text-xs text-muted-foreground">{chosen.length} selected</p>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filtering
                ? 'No entry matches those filters.'
                : state === 'PENDING'
                  ? 'Nothing is waiting for a decision.'
                  : `No entry is ${STATE_LABEL[state].toLowerCase()}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {deciding && (
                    <th className="w-10 px-3 py-2">
                      <Checkbox
                        aria-label="Select every entry shown"
                        checked={rows.length > 0 && chosen.length === rows.length}
                        onCheckedChange={(checked) =>
                          setSelected(checked === true ? rows.map((row) => row.id) : [])
                        }
                      />
                    </th>
                  )}
                  <ColumnFilter {...column('date', 'Date')} />
                  <ColumnFilter {...column('branch', 'Branch')} />
                  <ColumnFilter {...column('gl', 'G/L head')} />
                  <ColumnFilter {...column('detail', 'Detail')} />
                  <ColumnFilter {...column('advance', 'Advance')} />
                  <ColumnFilter {...column('amount', 'Amount', 'right')} />
                  <th className="px-3 py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top hover:bg-muted/40">
                    {deciding && (
                      <td className="px-3 py-2">
                        <Checkbox
                          aria-label={`Select entry ${row.id}`}
                          checked={chosen.includes(row.id)}
                          onCheckedChange={() => toggle(row.id)}
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-2">{row.entry_date}</td>
                    <td className="px-3 py-2">{row.branch_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.gl_account_code ? (
                        <>
                          <p className="font-mono text-xs">{row.gl_account_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.gl_account_name}
                          </p>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[360px] px-3 py-2">
                      {row.detail}
                      {row.approval_note && (
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                          {row.approval_note}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.advance_holder_name ? (
                        <Badge variant="outline" className="text-[10px]">
                          {row.advance_holder_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">From the box</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {money(row.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATE_TONE[row.approval_status]}`}
                      >
                        {row.approval_label}
                      </Badge>
                      {row.approval_decided_at && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDateTimeShort(row.approval_decided_at)}
                          {row.approval_decided_by_name
                            ? ` · ${row.approval_decided_by_name}`
                            : ''}
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
    </div>
  );
}
