import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  CashDirection,
  CashEntry,
  CashPerson,
  GLAccount,
} from '@/modules/accounts/api';
import {
  useAtmAccounts,
  useCashBookOptions,
  useCashPeople,
  useGLAccounts,
  useRecordCashEntry,
  useUpdateCashEntry,
} from '@/modules/accounts/api';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
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

export interface CashEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The entry being corrected. Null when writing a new line. */
  entry: CashEntry | null;
  /** Which way a new entry moves money. Ignored when correcting. */
  presetDirection?: CashDirection;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Writes a line into the cash book, or corrects one already in it.
 *
 * Two shapes, one dialog, because they differ only in what they insist on:
 *
 * * **Cash in** — money arriving in the box (drawn on the ATM card, handed
 *   over by accounts). It needs a date, an amount and the narrative. It has no
 *   branch and no G/L head, because nothing has been spent yet; the server
 *   clears both, so switching an entry from a payment to a receipt cannot
 *   leave a stale head behind.
 * * **Cash out** — a payment. It must say which branch it was for and
 *   which SAP G/L head it belongs to. The head is *picked* from SAP's chart of
 *   accounts rather than typed, which is what lets this register be reconciled
 *   against SAP later; the code and the name are both snapshotted onto the
 *   entry, so the book still reads when SAP is down.
 *
 * The amount is always entered positive. Which way the money went is the
 * direction, never a minus sign.
 */
export function CashEntryDialog({
  open,
  onOpenChange,
  entry,
  presetDirection = 'OUT',
}: CashEntryDialogProps) {
  const isCorrection = entry != null;
  const { data: options } = useCashBookOptions();
  const record = useRecordCashEntry();
  const update = useUpdateCashEntry();

  const [direction, setDirection] = useState<CashDirection>(entry?.direction ?? presetDirection);
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? today());
  const [amount, setAmount] = useState(entry?.amount ?? '');
  const [branch, setBranch] = useState(entry?.branch ? String(entry.branch) : '');
  const [glCode, setGlCode] = useState(entry?.gl_account_code ?? '');
  const [glName, setGlName] = useState(entry?.gl_account_name ?? '');
  const [item, setItem] = useState(entry?.item ?? '');
  const [detail, setDetail] = useState(entry?.detail ?? '');
  const [glSearch, setGlSearch] = useState('');
  // A receipt says which card it came off; a payment says whose advance it
  // clears. Never both -- the server refuses the crossover.
  const [atmAccount, setAtmAccount] = useState(
    entry?.atm_account ? String(entry.atm_account) : '',
  );
  const [holderId, setHolderId] = useState<number | null>(entry?.advance_holder ?? null);
  const [holderName, setHolderName] = useState(entry?.advance_holder_name ?? '');
  const [holderSearch, setHolderSearch] = useState('');
  // No reset effect: the page mounts this dialog only while it is open, so
  // the initialisers above run afresh on every open and a cancelled edit
  // cannot leak into the next one.

  // The chart of accounts is only searched once the picker is in play — a
  // receipt never touches SAP at all.
  const isPayment = direction === 'OUT';
  const {
    data: glAccounts = [],
    isLoading: glLoading,
    isError: glError,
  } = useGLAccounts(glSearch, open && isPayment);

  const branches = options?.branches ?? [];
  const { data: cards = [] } = useAtmAccounts();
  const {
    data: people = [],
    isLoading: peopleLoading,
    isError: peopleError,
    // Only people holding a float: a payment clears an advance somebody
    // actually has, and naming anybody else would create one out of nothing.
  } = useCashPeople(holderSearch, true);
  const saving = record.isPending || update.isPending;

  const problem = useMemo(() => {
    if (!entryDate) return 'Pick the date the money moved.';
    if (!amount || Number(amount) <= 0) return 'Enter an amount above zero.';
    if (!detail.trim()) return 'Write what the money was for.';
    if (isPayment && !branch) return 'Say which branch this was spent for.';
    if (isPayment && !glCode) return 'Pick the G/L head this payment belongs to.';
    return null;
  }, [entryDate, amount, detail, isPayment, branch, glCode]);

  async function submit() {
    if (problem) {
      toast.error(problem);
      return;
    }

    const payload = {
      entry_date: entryDate,
      direction,
      amount: String(amount),
      detail: detail.trim(),
      item: item.trim(),
      // Sent as nulls/blanks on a receipt so a correction that turns a payment
      // into one actually clears what the payment held.
      branch: isPayment ? Number(branch) : null,
      atm_account: !isPayment && atmAccount ? Number(atmAccount) : null,
      advance_holder: isPayment ? holderId : null,
      gl_account_code: isPayment ? glCode : '',
      gl_account_name: isPayment ? glName : '',
    };

    try {
      if (isCorrection) {
        await update.mutateAsync({ id: entry.id, payload });
        toast.success('Entry corrected');
      } else {
        await record.mutateAsync(payload);
        toast.success(
          direction === 'IN'
            ? 'Cash receipt recorded'
            : 'Payment recorded and waiting for approval',
        );
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That entry could not be saved.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {isCorrection ? 'Correct entry' : direction === 'IN' ? 'Cash in' : 'Cash out'}
          </DialogTitle>
          <DialogDescription>
            {isCorrection
              ? 'Correcting an amount rewrites the running balance of every entry recorded after this one.'
              : direction === 'IN'
                ? 'Money arriving in the cash box. It raises the balance and belongs to no branch.'
                : 'A payment out of the cash box, against a branch and a SAP G/L head. It goes for approval as soon as it is recorded, and stays editable until somebody agrees it.'}
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
              <Label htmlFor="cash-direction">Direction</Label>
              <NativeSelect
                id="cash-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as CashDirection)}
              >
                <SelectOption value="OUT">Cash out (payment)</SelectOption>
                <SelectOption value="IN">Cash in (receipt)</SelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cash-date">Date</Label>
              <Input
                id="cash-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cash-amount">Amount</Label>
              <Input
                id="cash-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {isPayment && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cash-branch">Branch</Label>
                <NativeSelect
                  id="cash-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  <SelectOption value="">Pick a branch…</SelectOption>
                  {branches.map((row) => (
                    <SelectOption key={row.id} value={String(row.id)}>
                      {row.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              <SearchableSelect<GLAccount>
                inputId="cash-gl-account"
                label="G/L head"
                required
                value={glCode ? `${glCode} · ${glName}` : ''}
                defaultDisplayText={glCode ? `${glCode} · ${glName}` : undefined}
                items={glAccounts}
                isLoading={glLoading}
                isError={glError}
                placeholder="Search SAP accounts…"
                getItemKey={(account) => account.account_code}
                getItemLabel={(account) => `${account.account_code} · ${account.account_name}`}
                onSearchChange={setGlSearch}
                onItemSelect={(account) => {
                  setGlCode(account.account_code);
                  setGlName(account.account_name);
                }}
                onClear={() => {
                  setGlCode('');
                  setGlName('');
                }}
                loadingText="Reading the chart of accounts…"
                emptyText="Type to search SAP's chart of accounts"
                notFoundText="No account matches that"
                errorText="SAP could not be reached, so accounts cannot be searched right now."
              />
            </div>
          )}

          {!isPayment && (
            <div className="space-y-1">
              <Label htmlFor="cash-atm">Drawn off</Label>
              <NativeSelect
                id="cash-atm"
                value={atmAccount}
                onChange={(e) => setAtmAccount(e.target.value)}
              >
                <SelectOption value="">Not from a card</SelectOption>
                {cards.map((card) => (
                  <SelectOption key={card.id} value={String(card.id)}>
                    {card.name}
                  </SelectOption>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Naming the card takes this off its balance. Leave it blank for cash from
                anywhere else — handed over by a director, say.
              </p>
            </div>
          )}

          {isPayment && (
            <div className="space-y-1">
              <SearchableSelect<CashPerson>
                inputId="cash-advance-holder"
                label="Spent out of an advance"
                value={holderName}
                items={people}
                isLoading={peopleLoading}
                isError={peopleError}
                placeholder="Nobody — paid from the cash box"
                getItemKey={(person) => person.id}
                getItemLabel={(person) => person.name}
                renderItem={(person) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{person.name}</span>
                    {person.balance != null && (
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        holding {formatNumber(Number(person.balance))}
                      </span>
                    )}
                  </div>
                )}
                onSearchChange={setHolderSearch}
                onItemSelect={(person) => {
                  setHolderId(person.id);
                  setHolderName(person.name);
                }}
                onClear={() => {
                  setHolderId(null);
                  setHolderName('');
                }}
                loadingText="Loading people…"
                emptyText="Nobody is holding an advance"
                notFoundText="Nobody holding an advance matches that"
                errorText="The people list could not be loaded."
              />
              <p className="text-xs text-muted-foreground">
                Naming somebody clears this much of what they are holding. Leave it blank
                when the money came straight out of the box.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cash-item">Item</Label>
            <Input
              id="cash-item"
              placeholder="Vegetable, DP switch, drill bit…"
              maxLength={120}
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              What was actually bought. A note under the G/L head — optional.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cash-detail">Detail</Label>
            <Textarea
              id="cash-detail"
              rows={3}
              placeholder="Cash paid to Ravi kumar for refreshment exp for some visitor at site"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Who was paid, what for, and any bill or party reference.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || problem != null}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : direction === 'IN' ? (
              <ArrowDownLeft className="mr-2 h-4 w-4" />
            ) : (
              <ArrowUpRight className="mr-2 h-4 w-4" />
            )}
            {isCorrection ? 'Save correction' : 'Record entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CashEntryDialog;
