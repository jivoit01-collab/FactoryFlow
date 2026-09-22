import { AlertTriangle, BadgeIndianRupee, Check, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { SalaryAdvanceEmployee, SalaryAdvanceRow, SalaryAdvanceState } from '@/modules/accounts/api';
import {
  useDecideSalaryAdvances,
  useRecordSalaryAdvance,
  useSalaryAdvanceEmployees,
  useSalaryAdvances,
} from '@/modules/accounts/api';
import { confirmDialog, SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { formatDay, formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => `₹${formatNumber(Number(value ?? 0))}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The salary month an advance is docked in, as a month rather than a day.
 *
 * `deduct_from` is the first of the month by construction, so printing it as a
 * date would read "01-10-2026" — a day nobody is paid on, and one that invites
 * the reader to think the deduction happens on the 1st. It is a month.
 */
function formatMonth(value: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return formatDay(value);
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** The month a `YYYY-MM` key names, spelled out. */
function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * This month, off the wall clock.
 *
 * Built from the local date parts rather than `toISOString().slice(0, 7)`,
 * which is UTC: for the first five and a half hours of every month in IST that
 * would name the month before and open the page on the wrong one.
 */
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** The selector's "no month at all" choice. Not a month, so not a date. */
const ALL_MONTHS = 'all';

/** The month an advance paid in one month comes off: the next one. */
function nextMonthOf(paidOn: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(paidOn);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month === 12 ? `January ${year + 1}` : `${MONTHS[month]} ${year}`;
}

const STATE_TONE: Record<SalaryAdvanceState, string> = {
  NOT_SENT: 'bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300',
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};

/**
 * Advance Salary — cash handed over against a wage, voucher by voucher.
 *
 * The same list the accounts board shows in its "Salary advance" panel, given
 * a page of its own: the board scopes everything to one month and shows only
 * the most recent few rows, which answers "what went out lately" and not "what
 * has gone out". This is the whole book, and HR can agree on it.
 *
 * NOT the Advances page, which looks similar and is the opposite arrangement.
 * A float there is the factory's cash in somebody's pocket, settled by
 * spending it and explaining what on. This money became theirs when it was
 * handed over, and it comes back out of their pay.
 *
 * ONE ROW PER VOUCHER, LABELLED WITH THE REGISTER'S OWN WORDS
 * -----------------------------------------------------------
 * Not grouped by person, because the register cannot say who an advance was
 * for. `advance_holder` means "whose float this payment clears", which is a
 * different question, and on the live book it answers it wrongly. So "Paid to"
 * is the voucher's own text — its Item ("Parveen khatun"), or its narrative
 * when the Item is one of the custodian's generic words. It quotes the
 * register and claims to identify nobody.
 *
 * WHICH IS WHY APPROVING ASKS WHO
 * --------------------------------
 * A verdict is about a person's pay, so it cannot be given against a quotation
 * from a voucher. Most rows here have never been sent to HR and carry no
 * employee at all; approving one names the person first, and only then agrees
 * the deduction. Naming and deciding are separate rights, so the button is
 * offered only to a reader who holds both.
 *
 * Nothing here moves the cash book's balance. The money left the box on the
 * voucher that paid it, and counting it again would take it off twice.
 */
export default function AdvanceSalaryPage() {
  const { data, isLoading, isError, error, refetch } = useSalaryAdvances();
  const decide = useDecideSalaryAdvances();
  const [naming, setNaming] = useState<SalaryAdvanceRow | null>(null);
  const [month, setMonth] = useState(currentMonthKey);

  const all = useMemo(() => data?.results ?? [], [data]);

  /**
   * The months the book actually paid an advance in, newest first.
   *
   * Offered instead of an open date picker for the reason the accounts board
   * gives: a selector that can land on a month nobody was paid in shows a
   * screen of nothing, which reads as a broken page rather than a quiet month.
   * This month is always offered even when it is empty, because it is where
   * the page opens and the selector has to be able to say so.
   */
  const months = useMemo(() => {
    const seen = new Set(all.map((row) => row.paid_on.slice(0, 7)));
    seen.add(currentMonthKey());
    return [...seen].sort().reverse();
  }, [all]);

  /** The newest month the book really did pay an advance in. */
  const latestMonth = useMemo(() => {
    const keys = all.map((row) => row.paid_on.slice(0, 7)).sort();
    return keys.length > 0 ? keys[keys.length - 1] : null;
  }, [all]);

  const rows = useMemo(
    () =>
      month === ALL_MONTHS
        ? all
        : all.filter((row) => row.paid_on.slice(0, 7) === month),
    [all, month],
  );

  // The server's own answer, not a permission string re-derived here. It is
  // the same check the endpoint will make, so the screen cannot offer a button
  // the request would refuse.
  const canDecide = data?.can_decide ?? false;
  const canRecord = data?.can_record ?? false;

  // The month on show, not the book: a total that went on counting April while
  // the table showed September would be read as September's. Summed over the
  // rows rather than read off `summary`, which bands the book by what HR did
  // with each advance and knows nothing about months. Safe to sum because the
  // server sends the whole list in one go — there is no page after this one
  // whose rows would be missing from it.
  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    [rows],
  );

  /** An advance HR have already been shown: the verdict is the only step left. */
  async function approvePending(row: SalaryAdvanceRow) {
    if (row.id === null) return;
    const ok = await confirmDialog({
      title: `Approve ${money(row.amount)} for deduction?`,
      description: `${row.employee_name || row.description} — it comes off the ${nextMonthOf(
        row.paid_on,
      )} salary unless HR say otherwise.`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;

    try {
      await decide.mutateAsync({ advance_ids: [row.id], approve: true });
      toast.success('Approved for deduction.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'The approval did not go through.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Advance Salary"
        description="Cash given against a wage, as the register recorded it."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <BadgeIndianRupee className="h-4 w-4 text-muted-foreground" />
              Salary advance
            </h3>
            <NativeSelect
              aria-label="Which month's advances to show"
              className="h-8 w-auto"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((key) => (
                <SelectOption key={key} value={key}>
                  {monthLabel(key)}
                </SelectOption>
              ))}
              <SelectOption value={ALL_MONTHS}>All months</SelectOption>
            </NativeSelect>
          </div>
          {/* A dash until a list has actually arrived. A confident ₹0.00 and
              "nobody managed to ask" look identical on a card and mean
              opposite things, and the second dressed as the first is how an
              advance somebody is owed goes uncollected. */}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total{' '}
            <span className="ml-1 text-sm font-semibold tabular-nums text-foreground">
              {data ? money(total) : '—'}
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          /* A failed read is not an empty book, and the two must never look
             alike: "no salary advance has been paid out" is a statement about
             the factory, and making it when nothing was read at all is a lie
             the screen tells about money somebody is owed. */
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
          /* "This month had none" and "the book has none" are different facts,
             and the page opens on a month that may well be quiet — so the
             empty month says which month, and points at the last one that was
             not, rather than leaving the reader to hunt for it in the list. */
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-muted-foreground">
              {all.length === 0
                ? 'No salary advance has been paid out of this book.'
                : `No salary advance was paid out in ${monthLabel(month)}.`}
            </p>
            {all.length > 0 && latestMonth && latestMonth !== month && (
              <Button variant="outline" size="sm" onClick={() => setMonth(latestMonth)}>
                Show {monthLabel(latestMonth)}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Paid to</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Dated</th>
                  <th className="px-4 py-2 font-medium">HR</th>
                  {canDecide && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  // Keyed on the voucher where there is one, and on the HR
                  // record otherwise: an advance recorded with no voucher
                  // behind it has no `cash_entry`, and the two ids are drawn
                  // from different tables so neither is unique on its own.
                  <tr
                    key={
                      row.cash_entry ? `entry-${row.cash_entry}` : `advance-${row.id}`
                    }
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2">
                      {/* Once HR have named somebody, that name is the answer
                          to "paid to" and the voucher's wording is the note
                          underneath it. Before that there is only the note. */}
                      {row.employee_name ? (
                        <>
                          <span>{row.employee_name}</span>
                          {row.description && (
                            <span className="block text-xs text-muted-foreground">
                              {row.description}
                            </span>
                          )}
                        </>
                      ) : (
                        row.description || '—'
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {money(row.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {formatDay(row.paid_on)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Badge className={STATE_TONE[row.state]} variant="secondary">
                        {row.state_label}
                      </Badge>
                      {row.state === 'APPROVED' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          off {formatMonth(row.deduct_from)}
                        </span>
                      )}
                    </td>
                    {canDecide && (
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {row.state === 'PENDING' ? (
                          <Button
                            size="sm"
                            disabled={decide.isPending}
                            onClick={() => void approvePending(row)}
                          >
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        ) : row.state === 'NOT_SENT' && canRecord ? (
                          /* Nobody has said who this was for, and the register
                             cannot. Approving it starts by naming them. */
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNaming(row)}
                          >
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ApproveUnsentDialog row={naming} onClose={() => setNaming(null)} />
    </div>
  );
}

/**
 * Approving a voucher nobody has sent to HR: name the person, then agree it.
 *
 * Two requests, in that order, because they are two different acts and the
 * server keeps them apart — recording is book-keeping and deciding is HR's.
 * If the second fails the first still stands, and the row is then waiting on
 * HR rather than lost, which is what the message says.
 */
function ApproveUnsentDialog({
  row,
  onClose,
}: {
  row: SalaryAdvanceRow | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [employee, setEmployee] = useState<SalaryAdvanceEmployee | null>(null);
  const record = useRecordSalaryAdvance();
  const decide = useDecideSalaryAdvances();

  const { data: people = [], isLoading, isError } = useSalaryAdvanceEmployees(
    search,
    row !== null,
  );

  const busy = record.isPending || decide.isPending;

  function close() {
    setSearch('');
    setEmployee(null);
    onClose();
  }

  async function submit() {
    if (!row || !employee) return;

    let advanceId: number;
    try {
      const advance = await record.mutateAsync({
        employee: employee.id,
        paid_on: row.paid_on,
        amount: row.amount,
        // The voucher's own words, kept as what the advance was for. It is
        // what the custodian wrote, and HR reading the row later have no
        // other account of it.
        reason: row.description,
        cash_entry: row.cash_entry,
      });
      advanceId = advance.id;
    } catch (err) {
      toast.error(getErrorMessage(err, 'The advance could not be recorded.'));
      return;
    }

    try {
      await decide.mutateAsync({ advance_ids: [advanceId], approve: true });
      toast.success(`Approved — it comes off ${employee.full_name}'s next salary.`);
      close();
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          `Recorded against ${employee.full_name}, but the approval did not go through. It is now waiting on HR.`,
        ),
      );
      close();
    }
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Approve this advance for deduction</DialogTitle>
          <DialogDescription>
            The voucher does not say whose wage this comes off. Name the person
            and it is approved in their name, off the{' '}
            {row ? nextMonthOf(row.paid_on) : ''} salary.
          </DialogDescription>
        </DialogHeader>

        {/* A plain box, not DialogBody: DialogBody's overflow would trap the
            person picker's list, which is an absolutely positioned div rather
            than a portal. This dialog is short enough not to need a scroller.

            `min-w-0` is load-bearing. DialogContent is a grid, and a grid item
            is min-width:auto — so anything in here that refuses to wrap sets a
            floor under the dialog's width and drags it past its own max-width,
            taking the picker and its dropdown with it. */}
        <div className="min-w-0 space-y-4">
          {row && (
            <div className="min-w-0 rounded-md border bg-muted/40 px-3 py-2">
              {/* Wrapped, never truncated. It is a whole sentence the custodian
                  wrote -- "Cash paid Advance to Sharukh khan for personal use
                  (deduct of june and july month) salary" -- and it is the only
                  account of what the cash was for, so an ellipsis two thirds of
                  the way through hides the part that says when it comes back. */}
              <p className="whitespace-pre-line break-words text-sm font-medium">
                {row.description || '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="tabular-nums">{money(row.amount)}</span> · paid{' '}
                {formatDay(row.paid_on)}
                {row.voucher_number !== null && ` · voucher ${row.voucher_number}`}
              </p>
            </div>
          )}

          <SearchableSelect<SalaryAdvanceEmployee>
            inputId="salary-advance-employee"
            label="Whose wage does it come off"
            required
            value={employee?.full_name ?? ''}
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
            onItemSelect={setEmployee}
            onClear={() => setEmployee(null)}
            loadingText="Loading the payroll…"
            emptyText="Type to search"
            notFoundText="Nobody on the payroll matches that"
            errorText="The payroll could not be loaded."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !employee}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
