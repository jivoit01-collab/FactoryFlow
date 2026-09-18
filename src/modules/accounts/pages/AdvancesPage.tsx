import { ArrowDownLeft, Ban, HandCoins, Loader2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { AdvanceDirection, CashPerson } from '@/modules/accounts/api';
import {
  useAdvanceHolders,
  useAdvanceStatement,
  useCancelAdvance,
  useCashPeople,
  useRecordAdvance,
} from '@/modules/accounts/api';
import { ColumnFilter } from '@/modules/accounts/components/ColumnFilter';
import { useLocalColumns } from '@/modules/accounts/components/useLocalColumns';
import { confirmDialog } from '@/shared/components';
import { SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => formatNumber(Number(value ?? 0));
const today = () => new Date().toISOString().slice(0, 10);

/**
 * What each row is, said plainly.
 *
 * "Advance given" and "Returned" were read as jargon, and "Returned" was the
 * worst of them -- it sounds like something coming back on its own. Only two
 * things happen to cash here: somebody is handed it, or it is taken back off
 * them. The third row is not a cash movement at all -- it is an expense on
 * the cash book filed against that person, so it says what it is.
 */
const MOVEMENT_LABEL: Record<string, string> = {
  GIVEN: 'Cash given',
  RETURNED: 'Cash taken back',
  SPENT_OWN: 'Paid it themselves',
  EXPLAINED: 'Spent',
};

const MOVEMENT_TONE: Record<string, string> = {
  GIVEN: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  RETURNED: 'bg-sky-100 dark:bg-sky-500/15 text-sky-900 dark:text-sky-400',
  // Money the factory owes, which is the other direction from the rest.
  SPENT_OWN: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
  EXPLAINED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
};

/**
 * Advances — who is holding the factory's cash, and who the factory owes.
 *
 * Two things are typed here and they are as plain as they sound: cash given to
 * somebody, and cash taken back off them. Neither moves the cash book's
 * balance. That balance is what the custodian is accountable for, and handing
 * cash over has only moved it from the box into a pocket.
 *
 * The third kind of row is not typed here at all. "Spent" appears by itself
 * when a payment on the cash book names the person — that is the money
 * reaching the book, which is what the whole arrangement is for.
 *
 * A balance can go negative, and that is not a bug: they paid for something
 * themselves, so the factory owes them rather than the other way round.
 */
export default function AdvancesPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const cancelMovement = useCancelAdvance();
  const [direction, setDirection] = useState<AdvanceDirection>('GIVEN');
  const [personSearch, setPersonSearch] = useState('');


  const { data, isLoading } = useAdvanceHolders();
  const allHolders = useMemo(() => data?.holders ?? [], [data]);
  const holders = useMemo(() => {
    const needle = personSearch.trim().toLowerCase();
    if (!needle) return allHolders;
    return allHolders.filter((row) => row.person.name.toLowerCase().includes(needle));
  }, [allHolders, personSearch]);

  // Derived, not synced: the page lands on whoever is holding the most until
  // somebody picks another, and never re-renders to get there.
  const activeId = selectedId ?? holders[0]?.person.id ?? null;
  const selected = holders.find((row) => row.person.id === activeId) ?? null;

  const { data: statement, isLoading: statementLoading } = useAdvanceStatement(activeId);

  // The ledger arrives whole, so its column filters are built from the rows
  // themselves rather than asked for.
  const {
    rows: sorted,
    column,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(
    statement?.movements ?? [],
    {
      date: { value: (row) => row.date },
      kind: { value: (row) => MOVEMENT_LABEL[row.kind] ?? row.kind },
      detail: { value: (row) => row.detail },
      // One amount, two columns: what they took, and what they cleared.
      cleared: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
        blankWhen: (row) => row.kind === 'GIVEN',
      },
      amount: {
        blankWhen: (row) => row.kind !== 'GIVEN',
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
      },
      balance: {
        value: (row) => money(row.balance_after),
        sortValue: (row) => Number(row.balance_after),
      },
    },
    { key: 'date', direction: 'asc' },
  );
  const ledgerFiltering = filteredColumns.length > 0;

  /**
   * Take one movement back out of somebody's ledger.
   *
   * Only the two typed here can go: a "Spent" row is a payment on the cash
   * book that happens to name this person, and cancelling it would be
   * cancelling the expense -- which belongs on the cash book, where the
   * balance it moves can be seen.
   */
  async function cancelRow(row: { id: number; kind: string; amount: string }) {
    const given = row.kind === 'GIVEN';
    const ok = await confirmDialog({
      title: `Take this ${MOVEMENT_LABEL[row.kind]?.toLowerCase() ?? 'row'} of ${money(row.amount)} out of the ledger?`,
      description: given
        ? 'They stop being counted as holding it. Use this when the handover was recorded by mistake — not when they have given the cash back, which is its own entry.'
        : 'They go back to holding what they held before it.',
      confirmLabel: 'Take it out',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelMovement.mutateAsync(row.id);
      toast.success('Taken out of the ledger');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be taken out.'));
    }
  }

  function open(which: AdvanceDirection) {
    setDirection(which);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Advances"
        description="Who is holding the factory's cash, and who the factory owes"
      >
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => open('RETURNED')}>
              <ArrowDownLeft className="mr-2 h-4 w-4" /> Take cash back
            </Button>
            <Button onClick={() => open('GIVEN')}>
              <HandCoins className="mr-2 h-4 w-4" /> Give cash
            </Button>
          </div>
        )}
      </DashboardHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <HandCoins className="h-4 w-4" /> Out with people
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {money(data?.total_outstanding ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Still counted in the cash book balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> People
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{holders.length}</p>
            <p className="text-xs text-muted-foreground">
              {holders.filter((row) => Number(row.balance) !== 0).length} still holding cash
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : holders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HandCoins className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nobody is holding cash. Give somebody cash to start their ledger.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-md border">
            <div className="space-y-2 border-b bg-muted/40 px-3 py-2">
              <p className="font-medium">Who is holding what</p>
              <Input
                aria-label="Search people"
                className="h-8"
                placeholder="Search people…"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
              />
            </div>
            <ul>
              {holders.map((row) => {
                const balance = Number(row.balance);
                return (
                  <li key={row.person.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.person.id)}
                      className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/40 ${
                        row.person.id === activeId ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="min-w-0 truncate">{row.person.name}</span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          balance < 0
                            ? 'text-sky-700 dark:text-sky-400'
                            : balance === 0
                              ? 'text-muted-foreground'
                              : 'font-medium'
                        }`}
                      >
                        {money(row.balance)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <p className="font-medium">{selected?.person.name ?? 'Ledger'}</p>
              {ledgerFiltering && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              {selected && (
                <p className="text-sm">
                  Holding{' '}
                  <span className="font-semibold tabular-nums">{money(selected.balance)}</span>
                  {Number(selected.balance) < 0 && (
                    <span className="ml-2 text-sky-700 dark:text-sky-400">— the factory owes them</span>
                  )}
                </p>
              )}
            </div>

            {statementLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the ledger…
              </div>
            ) : sorted.length === 0 ? (
              <p className="px-3 py-10 text-center text-muted-foreground">
                {ledgerFiltering
                  ? 'No movement matches those filters.'
                  : 'Nothing on this ledger yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <ColumnFilter {...column('date', 'Date')} />
                      <ColumnFilter {...column('kind', 'Movement')} />
                      <ColumnFilter {...column('detail', 'Detail')} />
                      <ColumnFilter {...column('amount', 'Given', 'right')} />
                      <ColumnFilter {...column('cleared', 'Settled', 'right')} />
                      <ColumnFilter {...column('balance', 'Holding', 'right')} />
                      {canManage && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => {
                      const taken = row.kind === 'GIVEN';
                      return (
                        <tr key={`${row.kind}-${row.id}`} className="border-b hover:bg-muted/40">
                          <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={MOVEMENT_TONE[row.kind] ?? ''}>
                              {MOVEMENT_LABEL[row.kind] ?? row.kind}
                            </Badge>
                          </td>
                          <td className="max-w-[420px] px-3 py-2">{row.detail || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {taken ? money(row.amount) : ''}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {taken ? '' : money(row.amount)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {money(row.balance_after)}
                          </td>
                          {canManage && (
                            <td className="px-3 py-2">
                              {row.cash_entry_id === null ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelRow(row)}
                                  disabled={cancelMovement.isPending}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Take out
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  On the cash book
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <AdvanceDialog open={formOpen} onOpenChange={setFormOpen} direction={direction} />
      )}
    </div>
  );
}

function AdvanceDialog({
  open,
  onOpenChange,
  direction: initialDirection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: AdvanceDirection;
}) {
  const record = useRecordAdvance();
  const [direction, setDirection] = useState<AdvanceDirection>(initialDirection);
  const [personId, setPersonId] = useState<number | null>(null);
  const [personName, setPersonName] = useState('');
  const [entryDate, setEntryDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');
  const [search, setSearch] = useState('');

  const giving = direction === 'GIVEN';
  // Giving cash out may go to anybody. Taking it back can only come from
  // somebody who has some — offering the whole directory here would let a
  // return be recorded against a person who never took one.
  const { data: people = [], isLoading, isError } = useCashPeople(search, !giving);

  function changeDirection(next: AdvanceDirection) {
    setDirection(next);
    // The two lists are different, so a name picked under one may not be on
    // the other. Clearing is honest; leaving it looks chosen but is stale.
    setPersonId(null);
    setPersonName('');
  }

  async function submit() {
    if (personId == null) {
      toast.error('Pick who the cash is with.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter an amount above zero.');
      return;
    }
    try {
      await record.mutateAsync({
        person: personId,
        entry_date: entryDate,
        direction,
        amount: String(amount),
        detail: detail.trim(),
      });
      toast.success(
        giving ? `${money(amount)} given to ${personName}` : `${money(amount)} taken back`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be recorded.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{giving ? 'Give cash' : 'Take cash back'}</DialogTitle>
          <DialogDescription>
            {giving
              ? 'Cash out of the box and into somebody’s pocket, to spend on the factory’s behalf. The cash book balance does not move — the money has only changed hands, and it reaches the book later as what they spend it on.'
              : 'Cash out of their pocket and back into the box. It lowers what they are holding; the cash book balance does not move.'}
          </DialogDescription>
        </DialogHeader>

        {/* A plain box, not DialogBody. DialogBody is the scroll area of a
            TALL dialog, and its overflow clips the person picker's list --
            which is an absolutely positioned div, not a portal, so it is
            trapped inside whatever scrolls. That produced two nested
            scrollbars and a list cut off after two names. This dialog is
            short enough not to need an inner scroller at all. */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="advance-direction">Movement</Label>
              <NativeSelect
                id="advance-direction"
                value={direction}
                onChange={(e) => changeDirection(e.target.value as AdvanceDirection)}
              >
                <SelectOption value="GIVEN">Cash given</SelectOption>
                <SelectOption value="RETURNED">Cash taken back</SelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="advance-date">Date</Label>
              <Input
                id="advance-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="advance-amount">Amount</Label>
              <Input
                id="advance-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <SearchableSelect<CashPerson>
            inputId="advance-person"
            label="Person"
            required
            value={personName}
            items={people}
            isLoading={isLoading}
            isError={isError}
            placeholder={giving ? 'Search people…' : 'Search people holding cash…'}
            getItemKey={(person) => person.id}
            getItemLabel={(person) => person.name}
            renderItem={(person) => (
              <div className="flex w-full items-center justify-between gap-3">
                <span className="min-w-0 truncate">{person.name}</span>
                {person.balance != null && (
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    holding {money(person.balance)}
                  </span>
                )}
              </div>
            )}
            onSearchChange={setSearch}
            onItemSelect={(person) => {
              setPersonId(person.id);
              setPersonName(person.name);
            }}
            onClear={() => {
              setPersonId(null);
              setPersonName('');
            }}
            loadingText="Loading people…"
            emptyText={giving ? 'Type to search' : 'Nobody is holding cash'}
            notFoundText={
              giving ? 'Nobody matches that' : 'Nobody holding cash matches that'
            }
            errorText="The people list could not be loaded."
          />

          <div className="space-y-1">
            <Label htmlFor="advance-detail">Detail</Label>
            <Textarea
              id="advance-detail"
              rows={2}
              placeholder={giving ? 'Bunty ji ko deye' : 'Cash muje deya'}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
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
              <HandCoins className="mr-2 h-4 w-4" />
            )}
            {giving ? 'Give cash' : 'Take cash back'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
