/**
 * Record a payment, or correct one that has not been approved yet.
 *
 * The same form either way, because it is the same information — a typo in an
 * amount should not mean deleting the line and typing it again.
 *
 * Recording: two saves, because both endings are real. **Save & add another**
 * clears the fields and keeps the dialog up for the next line; **Save** closes.
 * The date, category and payment mode carry between lines, since a day's spend
 * is usually several cash payments on the same date.
 *
 * Editing: one **Save changes**, and the dialog closes. Only reachable while the
 * payment's batch is still the site's to change — once an approver has signed it
 * off the row is not clickable and the service refuses the write anyway.
 */
import { Check, Paperclip, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

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
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useProjectSummary, useRecordExpense, useUpdateExpense } from '../api';
import type { Expense, ExpenseCategory, PaymentMode } from '../types';
import { CATEGORY_LABELS, formatMoney, todayISO } from '../utils';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];
const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT', label: 'On credit' },
];

export function RecordPaymentDialog({
  projectId,
  open,
  onOpenChange,
  batchNo,
  batchTotal,
  expense,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which batch these lines are joining, so it is never a surprise. */
  batchNo?: number;
  batchTotal?: string;
  /** Set to correct an existing payment instead of recording a new one. */
  expense?: Expense | null;
}) {
  const { data: summary } = useProjectSummary(projectId, open);
  const record = useRecordExpense(projectId);
  const update = useUpdateExpense(projectId);
  const editing = Boolean(expense);

  const [spendDate, setSpendDate] = useState(todayISO());
  const [category, setCategory] = useState<ExpenseCategory>('MATERIAL');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [reference, setReference] = useState('');
  const [bill, setBill] = useState<File | null>(null);
  const [addedThisSitting, setAddedThisSitting] = useState(0);
  const [error, setError] = useState('');
  const billInput = useRef<HTMLInputElement>(null);

  // Load as the dialog opens — the payment being corrected, or an empty line.
  // During render rather than in an effect, and state only: touching the file
  // input's DOM value here would be a write to a ref during render.
  const loadKey = `${open}:${expense?.id ?? 'new'}`;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (open && loadKey !== seenKey) {
    setSeenKey(loadKey);
    setAddedThisSitting(0);
    setError('');
    setBill(null);
    if (expense) {
      setSpendDate(expense.spend_date);
      setCategory(expense.category);
      setDescription(expense.description);
      setAmount(expense.amount);
      setPaidTo(expense.paid_to);
      setMode(expense.payment_mode);
      setReference(expense.reference_no);
    } else {
      setSpendDate(todayISO());
      clearLineState();
    }
  }
  if (!open && seenKey !== null) setSeenKey(null);

  /** Only the per-line fields. Date, category and mode carry over. */
  function clearLineState() {
    setDescription('');
    setAmount('');
    setPaidTo('');
    setReference('');
    setBill(null);
  }

  /** Same, from an event handler, where the DOM input may also be reset. */
  function clearLine() {
    clearLineState();
    if (billInput.current) billInput.current.value = '';
  }

  async function save(keepOpen: boolean) {
    if (!description.trim()) {
      setError('What was the payment for?');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('How much was it?');
      return;
    }
    const payload = {
      spend_date: spendDate,
      category,
      description: description.trim(),
      amount,
      paid_to: paidTo.trim(),
      payment_mode: mode,
      reference_no: reference.trim(),
    };
    try {
      const result = expense
        ? await update.mutateAsync({ expenseId: expense.id, payload, bill })
        : await record.mutateAsync({ payload, bill });
      setError('');
      if (result.warning) toast.warning(result.warning.message, { duration: 8000 });

      if (editing) {
        onOpenChange(false);
        toast.success('Payment updated');
        return;
      }

      setAddedThisSitting((count) => count + 1);
      toast.success('Payment recorded');
      if (keepOpen) clearLine();
      else onOpenChange(false);
    } catch (caught) {
      toast.error(
        getErrorMessage(
          caught,
          editing ? 'Could not update the payment.' : 'Could not record the payment.',
        ),
      );
    }
  }

  const busy = record.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit payment' : 'Record a payment'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'It has not been approved yet, so it can still be changed.'
              : batchNo && batchTotal && Number(batchTotal) > 0
                ? `Added to the ${formatMoney(
                    batchTotal,
                  )} already waiting to be approved. They are approved together.`
                : 'This and anything else you record will be approved together, in one go.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-description">What was it</Label>
            <Input
              id="pay-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setError('');
              }}
              placeholder="90 bags cement"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError('');
                }}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date</Label>
              <Input
                id="pay-date"
                type="date"
                // The service refuses spend dated before the project started.
                min={summary?.start_date ?? undefined}
                max={todayISO()}
                value={spendDate}
                onChange={(event) => setSpendDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-category">Category</Label>
              <NativeSelect
                id="pay-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              >
                {CATEGORIES.map((value) => (
                  <SelectOption key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-to">Paid to</Label>
              <Input
                id="pay-to"
                value={paidTo}
                onChange={(event) => setPaidTo(event.target.value)}
                placeholder="Verma Traders"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-mode">How</Label>
              <NativeSelect
                id="pay-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as PaymentMode)}
              >
                {PAYMENT_MODES.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Bill no</Label>
              <Input
                id="pay-ref"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="B-8841"
              />
            </div>
          </div>

          <input
            ref={billInput}
            type="file"
            accept="image/*,.pdf"
            hidden
            onChange={(event) => setBill(event.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => billInput.current?.click()}
            >
              <Paperclip className="mr-1.5 h-4 w-4" />
              {bill || expense?.bill ? 'Replace the bill' : 'Attach the bill'}
            </Button>
            {!bill && expense?.bill && (
              <a
                href={expense.bill}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                the bill on file
              </a>
            )}
            {bill && (
              <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate">{bill.name}</span>
                <button
                  type="button"
                  aria-label="Remove the attached bill"
                  onClick={() => {
                    setBill(null);
                    if (billInput.current) billInput.current.value = '';
                  }}
                >
                  <X className="h-3.5 w-3.5 hover:text-rose-600" />
                </button>
              </span>
            )}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          {editing ? (
            <span />
          ) : (
            <span className="self-center text-xs text-muted-foreground">
              {addedThisSitting > 0
                ? `${addedThisSitting} recorded just now`
                : 'Recording several? Use “Save & add another”.'}
            </span>
          )}
          <div className="flex gap-2">
            {editing ? (
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void save(true)} disabled={busy}>
                <Plus className="mr-1.5 h-4 w-4" />
                Save &amp; add another
              </Button>
            )}
            <Button onClick={() => void save(false)} disabled={busy}>
              <Check className="mr-1.5 h-4 w-4" />
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
