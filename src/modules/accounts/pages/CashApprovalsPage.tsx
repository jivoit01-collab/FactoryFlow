import { Check, ClipboardList, Loader2, Settings2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { CashEntry, EntryApprovalStatus } from '@/modules/accounts/api';
import { useApprovalQueue, useDecideEntries } from '@/modules/accounts/api';
import { ApproverSettingsDialog } from '@/modules/accounts/components/ApproverSettingsDialog';
import { confirmDialog, promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ColumnFilter, TOTALS_ROW_CLASS, useLocalColumns } from '@/shared/components/sheetGrid';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDateTimeShort, formatDay, formatNumber, getErrorMessage } from '@/shared/utils';

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
  // Choosing who agrees to spending is administration, not book-keeping,
  // so it sits behind the same right as the other cash book settings.
  const canManageApprovers = hasPermission(CASH_BOOK_PERMISSIONS.BRANCHES);
  const { user } = useAuth();
  const [approverSettingsOpen, setApproverSettingsOpen] = useState(false);

  const [state, setState] = useState<EntryApprovalStatus>('PENDING');
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading } = useApprovalQueue(state);
  const decide = useDecideEntries();

  const all = useMemo(() => data?.results ?? [], [data]);
  const counts = data?.counts;
  // Count and value per state, over the same queue the table is drawn from.
  const summary = data?.summary;
  const deciding = state === 'PENDING' && canApprove;

  /**
   * Whether this reader may decide a given payment.
   *
   * The queue shows everything now, so the page has to say which of it is
   * theirs. A payment addressed to nobody -- the ones off the sheet -- is
   * open to any approver; one addressed to somebody is theirs alone, and the
   * server refuses anybody else however the screen behaves.
   */
  const isMine = useCallback(
    (row: CashEntry) => row.approver == null || row.approver === user?.id,
    [user?.id],
  );

  // The queue arrives whole (capped at 500), so its column filters are built
  // from the rows themselves rather than asked for.
  const { rows, totals, column, filteredColumns, clearFilters } = useLocalColumns(
    all,
    {
      date: { value: (row) => formatDay(row.entry_date) },
      branch: { value: (row) => row.branch_name },
      gl: { value: (row) => row.gl_account_name },
      item: { value: (row) => row.item },
      detail: { value: (row) => row.detail },
      advance: { value: (row) => row.advance_holder_name },
      // Who it was sent to. Blank on the entries that came off the sheet,
      // which were never addressed to anybody and are open to any approver.
      with: { value: (row) => row.approver_name },
      amount: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
        total: (row) => Number(row.amount),
      },
      state: { value: (row) => row.approval_label },
    },
    { key: 'date', direction: 'desc' },
  );

  // Scoped to the rows actually on screen: a selection surviving a filter
  // change would let somebody decide entries they can no longer see.
  const decidable = useMemo(() => rows.filter(isMine), [rows, isMine]);

  const chosen = useMemo(
    () => selected.filter((id) => decidable.some((row) => row.id === id)),
    [selected, decidable],
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
          {canManageApprovers && (
            <Button variant="outline" onClick={() => setApproverSettingsOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Approvers
            </Button>
          )}
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

      {/* The three states, each with what it holds and what it is worth.
          Clicking one is the same act as choosing it in the drop-down --
          which stays, because a card is a poor thing to search for when you
          already know which state you want. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => {
          const figures = summary?.[value];
          const current = state === value;
          return (
            <Card
              key={value}
              role="button"
              tabIndex={0}
              aria-pressed={current}
              onClick={() => changeState(value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  changeState(value);
                }
              }}
              className={`cursor-pointer transition hover:border-primary/60 ${
                current ? 'border-primary ring-1 ring-primary' : ''
              }`}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{STATE_LABEL[value]}</p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums ${
                    value === 'PENDING'
                      ? 'text-amber-700 dark:text-amber-400'
                      : value === 'REJECTED'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {money(figures?.total ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {figures?.count ?? 0} {(figures?.count ?? 0) === 1 ? 'entry' : 'entries'}
                  {current && filtering ? ` · ${rows.length} shown` : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
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
                        aria-label="Select every entry you can decide"
                        checked={decidable.length > 0 && chosen.length === decidable.length}
                        disabled={decidable.length === 0}
                        onCheckedChange={(checked) =>
                          setSelected(checked === true ? decidable.map((row) => row.id) : [])
                        }
                      />
                    </th>
                  )}
                  <ColumnFilter {...column('date', 'Date')} />
                  <ColumnFilter {...column('branch', 'Branch')} />
                  <ColumnFilter {...column('gl', 'G/L head')} />
                  <ColumnFilter {...column('detail', 'Detail')} />
                  <ColumnFilter {...column('advance', 'Advance')} />
                  <ColumnFilter {...column('with', 'With')} />
                  <ColumnFilter {...column('amount', 'Amount', 'right')} />
                  <ColumnFilter {...column('state', 'State')} />
                </tr>
              </thead>
              <tbody>
                <tr className={TOTALS_ROW_CLASS}>
                  {deciding && <td />}
                  <td colSpan={6}>
                    Total of {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
                  </td>
                  <td className="text-right tabular-nums">{money(totals.amount ?? 0)}</td>
                  <td />
                </tr>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top hover:bg-muted/40">
                    {deciding && (
                      <td className="px-3 py-2">
                        {isMine(row) ? (
                          <Checkbox
                            aria-label={`Select entry ${row.id}`}
                            checked={chosen.includes(row.id)}
                            onCheckedChange={() => toggle(row.id)}
                          />
                        ) : (
                          // Shown, but not this reader's to decide. A tick box
                          // here would be a button that always fails.
                          <span
                            className="text-[10px] text-muted-foreground"
                            title={`Only ${row.approver_name} can decide this`}
                          >
                            —
                          </span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-2">{formatDay(row.entry_date)}</td>
                    <td className="px-3 py-2">{row.branch_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.gl_account_code ? (
                        <>
                          <p className="font-mono text-xs">{row.gl_account_code}</p>
                          <p className="text-xs text-muted-foreground">{row.gl_account_name}</p>
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
                    <td className="px-3 py-2">
                      {row.approver_name ? (
                        <span className="text-xs">{row.approver_name}</span>
                      ) : (
                        // Off the sheet, addressed to nobody -- so it sits in
                        // every approver's queue rather than one person's.
                        <span className="text-xs text-muted-foreground">Anyone</span>
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
                          {row.approval_decided_by_name ? ` · ${row.approval_decided_by_name}` : ''}
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

      {approverSettingsOpen && (
        <ApproverSettingsDialog
          open={approverSettingsOpen}
          onOpenChange={setApproverSettingsOpen}
          currentUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}
