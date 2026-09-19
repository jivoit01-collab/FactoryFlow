import { ArrowDownLeft, CreditCard, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  useAddAtmCash,
  useAtmAccounts,
  useAtmStatement,
  useCreateAtmAccount,
} from '@/modules/accounts/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ColumnFilter, useLocalColumns } from '@/shared/components/sheetGrid';
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
  Textarea,
} from '@/shared/components/ui';
import { formatNumber, getErrorMessage } from '@/shared/utils';

const money = (value: string | number) => formatNumber(Number(value ?? 0));
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The ATM — the imprest card the factory's cash comes off.
 *
 * Two movements, and only one of them is typed here. Money paid **onto** the
 * card is recorded on this screen. Money drawn **off** it is not: a withdrawal
 * is the cash receipt it produces, so it is recorded once on the cash book's
 * Cash in form by naming the card there, and shows up on this statement by
 * itself. Typing it in both places is how a card balance and a cash balance
 * start disagreeing.
 *
 * So the loop is: pay money onto the card here → draw it off with Cash in on
 * the cash book → spend it, or hand it to somebody as an advance.
 */
export default function AtmPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);


  const { data: accounts = [], isLoading } = useAtmAccounts();

  // Derived, not synced: the page lands on the first card until somebody picks
  // another. An effect writing this back into state would re-render twice and
  // fight the list every time it reloads.
  const activeId = selectedId ?? accounts[0]?.id ?? null;
  const { data: statement, isLoading: statementLoading } = useAtmStatement(activeId);

  const selected = accounts.find((account) => account.id === activeId) ?? null;

  // The statement arrives whole, so its column filters are built from the
  // rows themselves rather than asked for.
  const {
    rows: sorted,
    column,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(
    statement?.movements ?? [],
    {
      date: { value: (row) => row.date },
      kind: { value: (row) => (row.kind === 'RECEIPT' ? 'Paid on' : 'Withdrawn') },
      detail: { value: (row) => row.detail },
      // One amount, two columns, the movement deciding which shows it.
      amount: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
        blankWhen: (row) => row.kind !== 'RECEIPT',
      },
      drawn: {
        value: (row) => money(row.amount),
        sortValue: (row) => Number(row.amount),
        blankWhen: (row) => row.kind === 'RECEIPT',
      },
      balance: {
        value: (row) => money(row.balance_after),
        sortValue: (row) => Number(row.balance_after),
      },
    },
    { key: 'date', direction: 'asc' },
  );
  const filtering = filteredColumns.length > 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="ATM"
        description="The imprest card the factory draws its cash off"
      >
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCardOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" /> Add card
            </Button>
            <Button onClick={() => setAddOpen(true)} disabled={!selected}>
              <Plus className="mr-2 h-4 w-4" /> Add cash to ATM
            </Button>
          </div>
        )}
      </DashboardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the cards…
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No card yet. Add the one the factory draws its cash off, with whatever was on
              it when this register started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card
                key={account.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(account.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedId(account.id);
                }}
                className={`cursor-pointer transition ${
                  account.id === activeId ? 'ring-2 ring-primary' : 'hover:bg-muted/40'
                }`}
              >
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" /> {account.name}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {money(account.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opened at {money(account.opening_balance)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <p className="font-medium">{selected?.name ?? 'Statement'}</p>
              <p className="text-sm text-muted-foreground">
                {filtering ? (
                  <>
                    {sorted.length} of {statement?.movements.length ?? 0} movements
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  'Withdrawals appear here from the cash book — record them as Cash in, naming this card.'
                )}
              </p>
            </div>

            {statementLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the statement…
              </div>
            ) : !statement || statement.movements.length === 0 ? (
              <p className="px-3 py-10 text-center text-muted-foreground">
                Nothing on this card yet.
              </p>
            ) : (
              <>
              {sorted.length === 0 ? (
                <p className="px-3 py-10 text-center text-muted-foreground">
                  No movement matches those filters.
                </p>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <ColumnFilter {...column('date', 'Date')} />
                      <ColumnFilter {...column('kind', 'Movement')} />
                      <ColumnFilter {...column('detail', 'Detail')} />
                      <ColumnFilter {...column('amount', 'Paid on', 'right')} />
                      <ColumnFilter {...column('drawn', 'Drawn off', 'right')} />
                      <ColumnFilter {...column('balance', 'Balance', 'right')} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => {
                      const paidOn = row.kind === 'RECEIPT';
                      return (
                        <tr key={`${row.kind}-${row.id}`} className="border-b hover:bg-muted/40">
                          <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={
                                paidOn
                                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400'
                                  : 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400'
                              }
                            >
                              {paidOn ? 'Paid on' : 'Withdrawn'}
                            </Badge>
                          </td>
                          <td className="max-w-[420px] px-3 py-2">{row.detail || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {paidOn ? money(row.amount) : ''}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {paidOn ? '' : money(row.amount)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {money(row.balance_after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
              </>
            )}
          </div>
        </>
      )}

      {addOpen && selected && (
        <AddCashDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          accountId={selected.id}
          accountName={selected.name}
        />
      )}
      {cardOpen && <AddCardDialog open={cardOpen} onOpenChange={setCardOpen} />}
    </div>
  );
}

function AddCashDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number;
  accountName: string;
}) {
  const add = useAddAtmCash();
  const [receivedOn, setReceivedOn] = useState(today());
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');

  async function submit() {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter an amount above zero.');
      return;
    }
    try {
      await add.mutateAsync({
        accountId,
        payload: { received_on: receivedOn, amount: String(amount), detail: detail.trim() },
      });
      toast.success(`${money(amount)} added to ${accountName}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be added.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add cash to {accountName}</DialogTitle>
          <DialogDescription>
            Money paid onto the card. It does not reach the cash book until it is drawn off
            with Cash in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="atm-date">Date</Label>
              <Input
                id="atm-date"
                type="date"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="atm-amount">Amount</Label>
              <Input
                id="atm-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="atm-detail">Detail</Label>
            <Textarea
              id="atm-detail"
              rows={2}
              placeholder="Imprest received from Vicky Vg"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={add.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={add.isPending}>
            {add.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownLeft className="mr-2 h-4 w-4" />
            )}
            Add cash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateAtmAccount();
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('0');

  async function submit() {
    if (!name.trim()) {
      toast.error('Give the card a name.');
      return;
    }
    try {
      await create.mutateAsync({ name: name.trim(), opening_balance: String(opening || 0) });
      toast.success(`${name.trim()} added`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That card could not be added.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            Name it the way the office does, holder and all.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="card-name">Name</Label>
            <Input
              id="card-name"
              maxLength={120}
              placeholder="Ginni Vg Imprest Debit Card (Vishal)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="card-opening">Opening balance</Label>
            <Input
              id="card-opening"
              type="number"
              step="0.01"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              What was on the card the day this register started.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
