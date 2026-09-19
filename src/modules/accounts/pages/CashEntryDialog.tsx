import { ArrowDownLeft, ArrowUpRight, Loader2, Paperclip, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CashDirection, CashEntry, CashPerson, GLAccount } from '@/modules/accounts/api';
import {
  useAtmAccounts,
  useAttachToCashEntry,
  useCashApprovers,
  useCashBookOptions,
  useCashPeople,
  useGLAccounts,
  useRecordCashEntry,
  useRemoveCashAttachment,
  useUpdateCashEntry,
} from '@/modules/accounts/api';
import { AddPersonDialog } from '@/modules/accounts/components/AddPersonDialog';
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
  /** What the next voucher is called, for a new entry. */
  nextSerial?: number;
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
  nextSerial,
}: CashEntryDialogProps) {
  const isCorrection = entry != null;
  const { data: options } = useCashBookOptions();
  const record = useRecordCashEntry();
  const update = useUpdateCashEntry();

  const [serial, setSerial] = useState(String(entry?.serial_number ?? nextSerial ?? ''));
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
  const [atmAccount, setAtmAccount] = useState(entry?.atm_account ? String(entry.atm_account) : '');
  // Files picked before the entry exists. A new entry has no id to hang them
  // on, so they wait here and go up the moment it has one.
  const [waiting, setWaiting] = useState<File[]>([]);
  const attach = useAttachToCashEntry();
  const removeAttachment = useRemoveCashAttachment();

  const [approverId, setApproverId] = useState<number | null>(entry?.approver ?? null);
  const [approverName, setApproverName] = useState(entry?.approver_name ?? '');
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

  const {
    data: approverList = [],
    isLoading: approversLoading,
    isError: approversError,
  } = useCashApprovers();
  const saving = record.isPending || update.isPending;

  const problem = useMemo(() => {
    if (!entryDate) return 'Pick the date the money moved.';
    if (!amount || Number(amount) <= 0) return 'Enter an amount above zero.';
    if (!detail.trim()) return 'Write what the money was for.';
    if (isPayment && !branch) return 'Say which branch this was spent for.';
    if (isPayment && !glCode) return 'Pick the G/L head this payment belongs to.';
    if (isPayment && !approverId) return 'Say who should approve this payment.';
    return null;
  }, [entryDate, amount, detail, isPayment, branch, glCode, approverId]);

  async function submit() {
    if (problem) {
      toast.error(problem);
      return;
    }

    const payload = {
      entry_date: entryDate,
      // Blank means "whatever comes next" -- the server decides, so two
      // people filling the form at once cannot both claim one number.
      serial_number: serial.trim() ? Number(serial) : null,
      direction,
      amount: String(amount),
      detail: detail.trim(),
      item: item.trim(),
      // Sent as nulls/blanks on a receipt so a correction that turns a payment
      // into one actually clears what the payment held.
      branch: isPayment ? Number(branch) : null,
      atm_account: !isPayment && atmAccount ? Number(atmAccount) : null,
      advance_holder: isPayment ? holderId : null,
      // Required on a payment and refused on a receipt -- the server holds
      // the rule; this only shapes what the form sends.
      approver: isPayment ? approverId : null,
      gl_account_code: isPayment ? glCode : '',
      gl_account_name: isPayment ? glName : '',
    };

    try {
      let entryId = entry?.id ?? null;
      if (isCorrection) {
        await update.mutateAsync({ id: entry.id, payload });
        toast.success('Entry corrected');
      } else {
        const saved = await record.mutateAsync(payload);
        entryId = saved.id;
        toast.success(
          direction === 'IN'
            ? 'Cash receipt recorded'
            : 'Payment recorded and waiting for approval',
        );
      }

      // The bills go up once the line exists. A failure here is reported on
      // its own: the entry is saved either way, and saying otherwise would
      // send somebody looking for a payment that is already in the book.
      if (entryId != null && waiting.length > 0) {
        try {
          const result = await attach.mutateAsync({ id: entryId, files: waiting });
          if (result.refused.length > 0) {
            toast.error(
              `${result.refused.length} of ${waiting.length} could not be attached: ` +
                result.refused.map((row) => row.filename).join(', '),
            );
          }
        } catch (err) {
          toast.error(getErrorMessage(err, 'The entry is saved, but the bill did not attach.'));
        }
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That entry could not be saved.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wider than the usual form so the two person pickers sit side by
          side. The dialog cannot scroll -- see the note on the body
          below -- so its height is managed by laying fields out, not by
          letting it overflow. */}
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>
            {isCorrection ? 'Correct entry' : direction === 'IN' ? 'Cash in' : 'Cash out'}
          </DialogTitle>
          <DialogDescription>
            {isCorrection
              ? 'Correcting an amount rewrites the running balance of every entry recorded after this one.'
              : direction === 'IN'
                ? 'Money arriving in the cash box. It raises the balance and belongs to no branch.'
                : 'A payment out of the box. It goes to the approver you name and stays editable until they agree it.'}
          </DialogDescription>
        </DialogHeader>

        {/* A plain box, not DialogBody. DialogBody is the scroll area of a
            TALL dialog, and its overflow clips the person picker's list --
            which is an absolutely positioned div, not a portal, so it is
            trapped inside whatever scrolls. That produced two nested
            scrollbars and a list cut off after two names. This dialog is
            short enough not to need an inner scroller at all. */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
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
              <Label htmlFor="cash-serial">Voucher no.</Label>
              <Input
                id="cash-serial"
                type="number"
                min={1}
                value={serial}
                placeholder="Next"
                onChange={(e) => setSerial(e.target.value)}
              />
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
                Takes this off the card's balance. Blank for cash from anywhere else.
              </p>
            </div>
          )}

          {isPayment && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <SearchableSelect<CashPerson>
                  inputId="cash-advance-holder"
                  label="Spent out of cash somebody is holding"
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
                  emptyText="Nobody is holding cash"
                  notFoundText="Nobody holding cash matches that"
                  addNewLabel="Add somebody"
                  renderCreateDialog={(open, onOpenChange, updateSelection) => (
                    <AddPersonDialog
                      open={open}
                      onOpenChange={onOpenChange}
                      suggestedName={holderSearch}
                      onAdded={(person) => {
                        updateSelection(person.id, person.name);
                        setHolderId(person.id);
                        setHolderName(person.name);
                      }}
                    />
                  )}
                  errorText="The people list could not be loaded."
                />
                <p className="text-xs text-muted-foreground">
                  Clears this much of what they hold. Blank means straight out of the box.
                </p>
              </div>

              <div className="space-y-1">
                <SearchableSelect<CashPerson>
                  inputId="cash-approver"
                  label="Send for approval to"
                  required
                  value={approverName}
                  items={approverList}
                  isLoading={approversLoading}
                  isError={approversError}
                  placeholder="Who should agree to this?"
                  getItemKey={(person) => person.id}
                  getItemLabel={(person) => person.name}
                  onItemSelect={(person) => {
                    setApproverId(person.id);
                    setApproverName(person.name);
                  }}
                  onClear={() => {
                    setApproverId(null);
                    setApproverName('');
                  }}
                  loadingText="Loading approvers…"
                  emptyText="Nobody has been made an approver yet"
                  notFoundText="No approver matches that"
                  errorText="The approver list could not be loaded."
                />
                <p className="text-xs text-muted-foreground">
                  {approverList.length === 0 && !approversLoading
                    ? 'Nobody is in the Cash Book Approver group yet.'
                    : 'Only they can approve it; it reaches no other queue.'}
                </p>
              </div>
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
            <p className="text-xs text-muted-foreground">What was actually bought — optional.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cash-bill">Bill</Label>
            <Input
              id="cash-bill"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
              onChange={(e) => setWaiting(Array.from(e.target.files ?? []))}
            />
            {(waiting.length > 0 || (entry?.attachments?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {entry?.attachments?.map((file) => (
                  <span
                    key={file.id}
                    className="inline-flex items-center gap-1 rounded border bg-muted/40 px-2 py-0.5 text-xs"
                  >
                    <Paperclip className="h-3 w-3" />
                    <a
                      href={file.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[180px] truncate hover:underline"
                    >
                      {file.original_filename}
                    </a>
                    <button
                      type="button"
                      aria-label={`Remove ${file.original_filename}`}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={removeAttachment.isPending}
                      onClick={() => removeAttachment.mutate(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {waiting.map((file) => (
                  <span
                    key={file.name}
                    className="inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <span>· on save</span>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              A photograph or PDF of the voucher — optional, and more than one is fine.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cash-detail">Detail</Label>
            <Textarea
              id="cash-detail"
              rows={2}
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
