import {
  AlertTriangle,
  BadgeIndianRupee,
  Ban,
  Check,
  Clock,
  Loader2,
  Undo2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { SalaryAdvance, SalaryAdvanceEmployee, SalaryAdvanceState } from '@/modules/accounts/api';
import {
  useCancelSalaryAdvance,
  useDecideSalaryAdvances,
  useMarkSalaryAdvanceDeducted,
  useRecordSalaryAdvance,
  useSalaryAdvanceEmployees,
  useSalaryAdvances,
  useUndoSalaryAdvanceDeduction,
} from '@/modules/accounts/api';
import { confirmDialog, promptDialog, SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ColumnFilter, TOTALS_ROW_CLASS, useLocalColumns } from '@/shared/components/sheetGrid';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
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
import { formatDay, formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => formatNumber(Number(value ?? 0));
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The salary month a wage is docked in, as a month rather than a day.
 *
 * `deduct_from` is the first of the month by construction, so printing it as a
 * date would read "01-10-2026" — a day nobody is paid on, and one that invites
 * the reader to think the deduction happens on the 1st. It is a month.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonth(value: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return formatDay(value);
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

const STATE_LABEL: Record<SalaryAdvanceState, string> = {
  PENDING: 'With HR',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATE_TONE: Record<SalaryAdvanceState, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};

/** The tabs, and what each is for. `null` is everything, cancelled rows aside. */
const TABS: { key: SalaryAdvanceState | null; label: string }[] = [
  { key: 'PENDING', label: 'With HR' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: null, label: 'All' },
];

/**
 * Advance Salary — cash given against a wage, and what HR decided about it.
 *
 * Two departments, two jobs, one screen. Accounts hand the money over and
 * write it down here; HR say whether it comes back off a salary, and later
 * tick it off once it has. Neither can do the other's half: the page shows
 * each reader only the buttons their right actually carries, and the server
 * refuses the rest however the screen behaves.
 *
 * NOT the Advances page, which looks similar and is the opposite arrangement.
 * A float there is the factory's cash in somebody's pocket, settled by
 * spending it and explaining what on. This is money that became theirs when it
 * was handed over, and it is settled out of their pay.
 *
 * Nothing here moves the cash book's balance. The money left the box on the
 * voucher that paid it; counting it again would take it off twice.
 */
export default function AdvanceSalaryPage() {
  const { hasPermission } = usePermission();
  const canRecord = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);
  const canDecide = hasPermission(CASH_BOOK_PERMISSIONS.SALARY_ADVANCE);

  // HR open on their own work; everybody else on the whole list. The queue is
  // the only thing HR are here for, and landing them on "All" would make them
  // find it every time.
  const [tab, setTab] = useState<SalaryAdvanceState | null>(canDecide ? 'PENDING' : null);
  const [selected, setSelected] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useSalaryAdvances(
    tab ? { state: tab } : undefined,
  );
  const decide = useDecideSalaryAdvances();
  const markDeducted = useMarkSalaryAdvanceDeducted();
  const undoDeduction = useUndoSalaryAdvanceDeduction();
  const cancel = useCancelSalaryAdvance();

  const all = useMemo(() => data?.results ?? [], [data]);
  const summary = data?.summary;

  // The list arrives whole, so its column filters are built from the rows
  // themselves rather than asked for.
  const { rows, totals, column, filteredColumns, clearFilters } = useLocalColumns(
    all,
    {
      // `sortValue` is the ISO the server sent. The cell reads dd-mm-yyyy,
      // which sorts and lists by its DAY -- 01-08 before 02-07 before 04-06.
      paid: { value: (row) => formatDay(row.paid_on), sortValue: (row) => row.paid_on },
      person: { value: (row) => row.employee_name },
      code: { value: (row) => row.employee_code },
      department: { value: (row) => row.department },
      reason: { value: (row) => row.reason },
      amount: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
        total: (row) => Number(row.amount),
      },
      state: { value: (row) => STATE_LABEL[row.state] },
      deduct: {
        value: (row) => deductionCell(row),
        sortValue: (row) => row.deduct_from ?? '',
      },
    },
    { key: 'paid', direction: 'desc' },
  );
  const filtering = filteredColumns.length > 0;

  // Scoped to the rows on screen: a selection surviving a filter change would
  // let somebody decide advances they can no longer see.
  const decidable = useMemo(
    () => (canDecide ? rows.filter((row) => row.state === 'PENDING') : []),
    [rows, canDecide],
  );
  const chosen = useMemo(
    () => selected.filter((id) => decidable.some((row) => row.id === id)),
    [selected, decidable],
  );

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((each) => each !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setSelected(chosen.length === decidable.length ? [] : decidable.map((row) => row.id));
  }

  async function approve(ids: number[]) {
    const total = all
      .filter((row) => ids.includes(row.id))
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const ok = await confirmDialog({
      title:
        ids.length === 1
          ? `Approve ${money(total)} for deduction?`
          : `Approve ${ids.length} advances, ${money(total)} in all?`,
      description:
        'The amount is marked to come off the salary month after it was paid. ' +
        'Tick it off here once the payroll has actually taken it.',
      confirmLabel: 'Approve for deduction',
    });
    if (!ok) return;
    try {
      await decide.mutateAsync({ advance_ids: ids, approve: true });
      setSelected([]);
      toast.success(
        ids.length === 1 ? 'Approved — it comes off their next salary' : `${ids.length} approved`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be approved.'));
    }
  }

  async function reject(ids: number[]) {
    // The cash is already with them, so a rejection is not "this will not
    // happen" but "this is not coming back off a wage" -- and accounts have to
    // be told which, and on what grounds.
    const note = await promptDialog({
      title: ids.length === 1 ? 'Reject this advance?' : `Reject ${ids.length} advances?`,
      description:
        'The money has already been handed over, so say how it is being recovered instead. ' +
        'Accounts read this.',
      label: 'Why',
      placeholder: 'Recovering it in cash — he is settling it this week',
      confirmLabel: 'Reject',
      multiline: true,
    });
    if (note === null) return;
    if (!note.trim()) {
      toast.error('Say why — accounts have to know how it is being recovered.');
      return;
    }
    try {
      await decide.mutateAsync({ advance_ids: ids, approve: false, note });
      setSelected([]);
      toast.success(ids.length === 1 ? 'Rejected' : `${ids.length} rejected`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be rejected.'));
    }
  }

  async function deduct(row: SalaryAdvance) {
    const ok = await confirmDialog({
      title: `Record ${money(row.amount)} as taken off ${row.employee_name}'s salary?`,
      description: `Marked against ${formatMonth(row.deduct_from)}. It stops counting as owed.`,
      confirmLabel: 'It has been deducted',
    });
    if (!ok) return;
    try {
      await markDeducted.mutateAsync({ id: row.id });
      toast.success('Recorded as deducted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be recorded.'));
    }
  }

  async function undo(row: SalaryAdvance) {
    try {
      await undoDeduction.mutateAsync(row.id);
      toast.success('Back on the list to deduct');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be put back.'));
    }
  }

  async function remove(row: SalaryAdvance) {
    const ok = await confirmDialog({
      title: `Take ${money(row.amount)} for ${row.employee_name} out of the list?`,
      description:
        'Use this when the advance was written down by mistake. The row is kept, struck through, ' +
        'so what HR were told and then untold can still be looked up.',
      confirmLabel: 'Take it out',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync(row.id);
      toast.success('Taken out of the list');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be taken out.'));
    }
  }

  const deciding = decide.isPending;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Advance Salary"
        description="Cash given against a wage, and what HR decided comes back off it"
      >
        {canRecord && (
          <Button onClick={() => setFormOpen(true)}>
            <BadgeIndianRupee className="mr-2 h-4 w-4" /> Record an advance
          </Button>
        )}
      </DashboardHeader>

      {/* Summed over the whole book, not the tab on show: a queue of four
          must not restate what is outstanding as though the rest were empty.
          `summary` is undefined until it has been read, and the cards show a
          dash rather than 0.00 until then -- a confident zero and "not known"
          look identical and mean opposite things. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Clock className="h-4 w-4" />}
          title="With HR"
          amount={summary?.pending.amount}
          count={summary?.pending.count}
          note="Waiting on a decision"
        />
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          title="To deduct"
          amount={summary?.outstanding.amount}
          count={summary?.outstanding.count}
          note="Approved, still to come off a wage"
          emphasis
        />
        <SummaryCard
          icon={<Check className="h-4 w-4" />}
          title="Already deducted"
          amount={summary?.deducted.amount}
          count={summary?.deducted.count}
          note="Recovered out of salary"
        />
        <SummaryCard
          icon={<X className="h-4 w-4" />}
          title="Rejected"
          amount={summary?.rejected.amount}
          count={summary?.rejected.count}
          note="Not coming off a wage"
        />
      </div>

      <DeductionSchedule />

      <div className="rounded-md border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {TABS.map((each) => (
              <Button
                key={each.label}
                size="sm"
                variant={tab === each.key ? 'default' : 'ghost'}
                onClick={() => {
                  setTab(each.key);
                  setSelected([]);
                }}
              >
                {each.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filtering && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            {chosen.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {chosen.length} selected
                </span>
                <Button size="sm" onClick={() => approve(chosen)} disabled={deciding}>
                  {deciding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reject(chosen)}
                  disabled={deciding}
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          /* A failed read is not an empty book, and the two must never look
             alike: "no advance against salary here yet" is a statement about
             the factory, and making it when nothing was read is a lie the
             screen tells about money somebody is owed. */
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-500" />
            <p className="font-medium">The advances could not be loaded.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {getErrorMessage(error, 'The server did not answer.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filtering
                ? 'No advance matches those filters.'
                : tab === 'PENDING'
                  ? 'Nothing is waiting on HR.'
                  : 'No advance against salary here yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {canDecide && (
                    <th className="px-3 py-2">
                      {decidable.length > 0 && (
                        <Checkbox
                          aria-label="Select every advance waiting on you"
                          checked={
                            chosen.length > 0 && chosen.length === decidable.length
                          }
                          onCheckedChange={toggleAll}
                        />
                      )}
                    </th>
                  )}
                  <ColumnFilter {...column('paid', 'Paid on')} />
                  <ColumnFilter {...column('person', 'Employee')} />
                  <ColumnFilter {...column('code', 'Code')} />
                  <ColumnFilter {...column('department', 'Department')} />
                  <ColumnFilter {...column('reason', 'What for')} />
                  <ColumnFilter {...column('amount', 'Amount', 'right')} />
                  <ColumnFilter {...column('state', 'HR')} />
                  <ColumnFilter {...column('deduct', 'Deduction')} />
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                <tr className={TOTALS_ROW_CLASS}>
                  <td colSpan={canDecide ? 6 : 5}>
                    Total of {rows.length} {rows.length === 1 ? 'advance' : 'advances'}
                  </td>
                  <td className="text-right tabular-nums">{money(totals.amount ?? 0)}</td>
                  <td />
                  <td />
                  <td />
                </tr>
                {rows.map((row) => {
                  const mine = canDecide && row.state === 'PENDING';
                  const removed = row.is_active === false;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b hover:bg-muted/40 ${
                        removed ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {canDecide && (
                        <td className="px-3 py-2">
                          {mine && (
                            <Checkbox
                              aria-label={`Select ${row.employee_name}'s advance`}
                              checked={chosen.includes(row.id)}
                              onCheckedChange={() => toggle(row.id)}
                            />
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatDay(row.paid_on)}
                      </td>
                      <td className="px-3 py-2 font-medium">{row.employee_name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {row.employee_code}
                      </td>
                      <td className="px-3 py-2">{row.department || '—'}</td>
                      <td className="max-w-[320px] px-3 py-2">{row.reason || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {money(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={STATE_TONE[row.state]}>
                          {STATE_LABEL[row.state]}
                        </Badge>
                        {row.decision_note && (
                          <p className="mt-1 max-w-[260px] text-xs text-muted-foreground no-underline">
                            {row.decision_note}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {deductionCell(row)}
                      </td>
                      <td className="px-3 py-2">
                        <RowActions
                          row={row}
                          canDecide={canDecide}
                          canRecord={canRecord}
                          busy={deciding || markDeducted.isPending || undoDeduction.isPending}
                          onApprove={() => approve([row.id])}
                          onReject={() => reject([row.id])}
                          onDeduct={() => deduct(row)}
                          onUndo={() => undo(row)}
                          onRemove={() => remove(row)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && <RecordAdvanceDialog open={formOpen} onOpenChange={setFormOpen} />}
    </div>
  );
}

/**
 * What comes off whose wage, and in which month.
 *
 * The table below is one row per advance, which is the right shape for
 * deciding on them and the wrong shape for acting on them: a man who took
 * three advances is three rows, and the payroll needs one figure. This is that
 * figure — per person, per salary month, outstanding only.
 *
 * Read off the approved list rather than the tab on show, so it says the same
 * thing whichever tab somebody is looking at.
 */
function DeductionSchedule() {
  const { data, isLoading } = useSalaryAdvances({ state: 'APPROVED' });

  const groups = useMemo(() => {
    const owed = (data?.results ?? []).filter((row) => row.is_outstanding);
    const byPerson = new Map<
      string,
      { name: string; code: string; month: string | null; amount: number; count: number }
    >();
    for (const row of owed) {
      // Keyed on the pair, not the person: two advances docked from different
      // months are two different deductions, and adding them would tell the
      // payroll to take both at once.
      const key = `${row.employee}|${row.deduct_from ?? ''}`;
      const found = byPerson.get(key);
      if (found) {
        found.amount += Number(row.amount);
        found.count += 1;
      } else {
        byPerson.set(key, {
          name: row.employee_name,
          code: row.employee_code,
          month: row.deduct_from,
          amount: Number(row.amount),
          count: 1,
        });
      }
    }
    return [...byPerson.values()].sort(
      (a, b) => (a.month ?? '').localeCompare(b.month ?? '') || b.amount - a.amount,
    );
  }, [data]);

  if (isLoading || groups.length === 0) return null;

  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/40 px-3 py-2">
        <p className="font-medium">To come off a salary</p>
        <p className="text-xs text-muted-foreground">
          Approved and not yet deducted, totalled per person and per salary month
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Salary month</th>
              <th className="px-3 py-2 text-right font-medium">Deduct</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={`${group.code}-${group.month}`} className="border-b">
                <td className="px-3 py-2 font-medium">{group.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {group.code}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatMonth(group.month)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {money(group.amount)}
                  {group.count > 1 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      over {group.count} advances
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * What the deduction column says, which is three different things.
 *
 * An advance HR have not decided on has no deduction to describe; one they
 * rejected has none by definition; and an approved one is either owed off a
 * month or already taken. Saying "—" for all four states would hide the only
 * question HR came to the page with.
 */
function deductionCell(row: SalaryAdvance): string {
  if (row.state === 'REJECTED') return 'Not off salary';
  if (row.state === 'PENDING') return '—';
  if (row.deducted_on) return `Deducted ${formatDay(row.deducted_on)}`;
  return `From ${formatMonth(row.deduct_from)}`;
}

/**
 * One headline figure.
 *
 * `amount` is undefined until the summary has actually been read, and that is
 * shown as a dash rather than 0.00. The two look identical on a card and mean
 * opposite things — "nothing is owed" against "nobody managed to ask" — and
 * the second dressed as the first is how an advance goes uncollected.
 */
function SummaryCard({
  icon,
  title,
  amount,
  count,
  note,
  emphasis = false,
}: {
  icon: React.ReactNode;
  title: string;
  amount?: string;
  count?: number;
  note: string;
  emphasis?: boolean;
}) {
  const known = amount != null;
  return (
    <Card className={emphasis ? 'border-primary/40' : undefined}>
      <CardContent className="p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon} {title}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {known ? money(amount) : '—'}
        </p>
        <p className="text-xs text-muted-foreground">
          {known ? `${count ?? 0} ${count === 1 ? 'advance' : 'advances'} · ${note}` : 'Not read'}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * The buttons one row offers, which depend on who is reading it.
 *
 * HR decide and tick off; accounts correct their own mistakes. Neither is
 * shown the other's, and the server refuses either way round.
 */
function RowActions({
  row,
  canDecide,
  canRecord,
  busy,
  onApprove,
  onReject,
  onDeduct,
  onUndo,
  onRemove,
}: {
  row: SalaryAdvance;
  canDecide: boolean;
  canRecord: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDeduct: () => void;
  onUndo: () => void;
  onRemove: () => void;
}) {
  if (row.is_active === false) {
    return <span className="text-xs text-muted-foreground no-underline">Taken out</span>;
  }

  if (row.state === 'PENDING') {
    return (
      <div className="flex flex-wrap gap-1">
        {canDecide && (
          <>
            <Button size="sm" variant="ghost" onClick={onApprove} disabled={busy}>
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}>
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </>
        )}
        {canRecord && (
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
            <Ban className="mr-1 h-4 w-4" /> Take out
          </Button>
        )}
      </div>
    );
  }

  if (row.state === 'APPROVED' && canDecide) {
    return row.deducted_on ? (
      <Button size="sm" variant="ghost" onClick={onUndo} disabled={busy}>
        <Undo2 className="mr-1 h-4 w-4" /> Not deducted after all
      </Button>
    ) : (
      <Button size="sm" variant="ghost" onClick={onDeduct} disabled={busy}>
        <Wallet className="mr-1 h-4 w-4" /> Mark deducted
      </Button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

/**
 * Recording what accounts handed over.
 *
 * It reaches HR as soon as it is saved, which is the whole purpose of the row,
 * so the dialog says so rather than offering a draft.
 */
function RecordAdvanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useRecordSalaryAdvance();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [paidOn, setPaidOn] = useState(today());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');

  const { data: people = [], isLoading, isError } = useSalaryAdvanceEmployees(search);

  async function submit() {
    if (employeeId == null) {
      toast.error('Pick whose wage this comes off.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter an amount above zero.');
      return;
    }
    try {
      await record.mutateAsync({
        employee: employeeId,
        paid_on: paidOn,
        amount: String(amount),
        reason: reason.trim(),
      });
      toast.success(`${money(amount)} recorded for ${employeeName} — HR have it now`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be recorded.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Record an advance against salary</DialogTitle>
          <DialogDescription>
            Cash handed over against somebody’s wages. The cash book balance does not move
            here — the money left the box on its own voucher. This goes to HR straight
            away, and comes off a salary once they approve it.
          </DialogDescription>
        </DialogHeader>

        {/* A plain box, not DialogBody: DialogBody's overflow would trap the
            person picker's list, which is an absolutely positioned div rather
            than a portal. This dialog is short enough not to need a scroller. */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="salary-advance-date">Paid on</Label>
              <Input
                id="salary-advance-date"
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salary-advance-amount">Amount</Label>
              <Input
                id="salary-advance-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <SearchableSelect<SalaryAdvanceEmployee>
            inputId="salary-advance-employee"
            label="Employee"
            required
            value={employeeName}
            items={people}
            isLoading={isLoading}
            isError={isError}
            placeholder="Search the payroll…"
            getItemKey={(person) => person.id}
            getItemLabel={(person) => person.full_name}
            renderItem={(person) => (
              <div className="flex w-full items-center justify-between gap-3">
                <span className="min-w-0 truncate">{person.full_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {person.employee_code}
                  {person.department ? ` · ${person.department}` : ''}
                </span>
              </div>
            )}
            onSearchChange={setSearch}
            onItemSelect={(person) => {
              setEmployeeId(person.id);
              setEmployeeName(person.full_name);
            }}
            onClear={() => {
              setEmployeeId(null);
              setEmployeeName('');
            }}
            loadingText="Loading the payroll…"
            emptyText="Type to search"
            notFoundText="Nobody on the payroll matches that"
            errorText="The payroll could not be loaded."
          />

          <div className="space-y-1">
            <Label htmlFor="salary-advance-reason">What for</Label>
            <Textarea
              id="salary-advance-reason"
              rows={2}
              placeholder="Advance for his daughter’s school fees"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={record.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={record.isPending}>
            {record.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BadgeIndianRupee className="mr-2 h-4 w-4" />
            )}
            Record and send to HR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
