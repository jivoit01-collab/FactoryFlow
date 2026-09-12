import { BadgeIndianRupee, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AR_INVOICE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Dialog,
  DialogBody,
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
import { cn, formatCurrency, formatDate, getErrorMessage } from '@/shared/utils';

import { useClearArPayment, useMarkArPayment } from '../api/ar-invoice.queries';
import type {
  ARInvoicePayment,
  ARPaymentMode,
  ARPaymentStatus,
  PaymentBucket,
} from '../types';
import { paymentBucket } from '../utils/payment';

const MODES: { value: ARPaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: ARPaymentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Not received' },
  { value: 'PARTIAL', label: 'Partly received' },
  { value: 'RECEIVED', label: 'Received' },
];

const BUCKET_CLASSES: Record<PaymentBucket, string> = {
  RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  UNPAID: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

/**
 * Payment pill.
 *
 * A bill nobody has marked reads "Not tracked" in a neutral colour rather than
 * blank: on a list of invoices, blank reads as "nothing to worry about", which
 * is the opposite of what an unchecked bill means. A bill somebody checked and
 * found unpaid is the stronger, red claim.
 */
export function ARPaymentBadge({
  payment,
  className,
}: {
  payment: ARInvoicePayment | null | undefined;
  className?: string;
}) {
  const bucket = paymentBucket(payment);
  const label =
    bucket === 'RECEIVED'
      ? 'Paid'
      : bucket === 'PARTIAL'
        ? 'Part paid'
        : payment
          ? 'Unpaid'
          : 'Not tracked';

  const title = payment
    ? [
        payment.status_display,
        payment.received_on ? `on ${formatDate(payment.received_on)}` : null,
        payment.mode_display || null,
        payment.reference ? `ref ${payment.reference}` : null,
        payment.marked_by_name ? `marked by ${payment.marked_by_name}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Nobody has recorded whether this bill was paid.';

  return (
    <span
      title={title}
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        payment ? BUCKET_CLASSES[bucket] : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * The form itself.
 *
 * Separate from the dialog shell so its state is seeded once, on mount: Radix
 * unmounts the content when the dialog closes, so every open starts from what
 * the mark currently says (or, for a fresh one, today and the bill's own value
 * — a full receipt is the common case and should need no typing).
 */
function PaymentForm({
  docEntry,
  docTotal,
  payment,
  onDone,
}: {
  docEntry: number;
  docTotal?: number | null;
  payment: ARInvoicePayment | null | undefined;
  onDone: () => void;
}) {
  const mark = useMarkArPayment();
  const clear = useClearArPayment();
  const busy = mark.isPending || clear.isPending;

  const [status, setStatus] = useState<ARPaymentStatus>(payment?.status ?? 'RECEIVED');
  const [receivedOn, setReceivedOn] = useState(
    payment?.received_on ?? new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState(
    payment?.amount ?? (docTotal != null ? String(docTotal) : ''),
  );
  const [mode, setMode] = useState<ARPaymentMode | ''>(payment?.mode ?? '');
  const [reference, setReference] = useState(payment?.reference ?? '');
  const [remarks, setRemarks] = useState(payment?.remarks ?? '');

  const needsDetails = status !== 'PENDING';

  const save = async () => {
    try {
      await mark.mutateAsync({
        docEntry,
        data: {
          status,
          ...(needsDetails
            ? {
                received_on: receivedOn || null,
                amount: amount.trim() ? amount.trim() : null,
                mode,
                reference: reference.trim(),
              }
            : {}),
          remarks: remarks.trim(),
        },
      });
      toast.success(
        status === 'PENDING'
          ? 'Marked as not yet received.'
          : status === 'PARTIAL'
            ? 'Part payment recorded.'
            : 'Payment recorded.',
      );
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not record the payment'));
    }
  };

  const drop = async () => {
    try {
      await clear.mutateAsync(docEntry);
      toast.success('Payment tracking cleared for this bill.');
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not clear the payment mark'));
    }
  };

  return (
    <>
      <DialogBody className="space-y-4">
        <div>
          <Label>Status</Label>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-md border p-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  'rounded px-2 py-1.5 text-xs font-medium transition-colors',
                  status === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {needsDetails ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ar-pay-date">Received on</Label>
                <Input
                  id="ar-pay-date"
                  type="date"
                  value={receivedOn}
                  onChange={(event) => setReceivedOn(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ar-pay-amount">
                  Amount {status === 'PARTIAL' ? '' : '(optional)'}
                </Label>
                <Input
                  id="ar-pay-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ar-pay-mode">Mode</Label>
                <NativeSelect
                  id="ar-pay-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ARPaymentMode | '')}
                >
                  <SelectOption value="">-</SelectOption>
                  {MODES.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="ar-pay-ref">Reference</Label>
                <Input
                  id="ar-pay-ref"
                  placeholder="UTR / cheque no."
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Marking a bill &quot;not received&quot; clears any date, amount and
            reference already on it — details left behind read as paid on every
            screen that shows them.
          </p>
        )}

        <div>
          <Label htmlFor="ar-pay-remarks">Remarks</Label>
          <Textarea
            id="ar-pay-remarks"
            rows={2}
            placeholder="Promised by month end, cheque with the driver…"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </div>

        {payment?.marked_by_name ? (
          <p className="text-xs text-muted-foreground">
            Last marked {payment.status_display.toLowerCase()} by {payment.marked_by_name}.
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter className="gap-2 border-t pt-4 sm:justify-start">
        <Button className="flex-1" disabled={busy} onClick={save}>
          <Check className="mr-1 h-4 w-4" /> {busy ? 'Saving…' : 'Save'}
        </Button>
        {/* Clearing is not the same as marking unpaid — it is for a mark put on
            the wrong bill, so it only appears once one exists. */}
        {payment ? (
          <Button variant="outline" disabled={busy} onClick={drop} title="Remove the mark">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}

/**
 * Record whether one bill's money came in.
 *
 * Keyed on SAP's DocEntry so the counter's own bills — most of the cash-sale
 * book, raised in SAP directly with no record in this app — can be tracked at
 * all, and so a bill marked in one History list shows marked in the other.
 */
export function ARPaymentDialog({
  open,
  onOpenChange,
  docEntry,
  docNum,
  docTotal,
  customerName,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docEntry: number;
  docNum: number | null;
  /** The bill's value, used to prefill a full receipt. */
  docTotal?: number | null;
  customerName?: string;
  payment: ARInvoicePayment | null | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment for invoice {docNum ?? docEntry}</DialogTitle>
          <DialogDescription>
            {customerName ? `${customerName} · ` : ''}
            {docTotal != null ? `${formatCurrency(docTotal)} billed` : 'Record the receipt'}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          docEntry={docEntry}
          docTotal={docTotal}
          payment={payment}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The badge, plus the dialog behind it for whoever may mark payments.
 *
 * One control for both History books: the app's own list passes its record's
 * SAP identifiers, the cash-sale list passes SAP's directly.
 */
export function ARPaymentCell({
  docEntry,
  docNum,
  docTotal,
  customerName,
  payment,
  disabledReason,
}: {
  docEntry: number | null;
  docNum: number | null;
  docTotal?: number | null;
  customerName?: string;
  payment: ARInvoicePayment | null | undefined;
  /** Why this bill cannot be marked yet (e.g. it is not posted to SAP). */
  disabledReason?: string;
}) {
  const { hasPermission } = usePermission();
  const canMark = hasPermission(AR_INVOICE_PERMISSIONS.MARK_PAYMENT);
  const [open, setOpen] = useState(false);

  // Nothing to collect against a bill SAP does not hold yet, and nothing to
  // mark without the permission — show the state, not a dead button.
  if (!canMark || docEntry == null) {
    return (
      <span title={disabledReason}>
        <ARPaymentBadge payment={payment} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        title="Record whether this bill was paid"
        onClick={(event) => {
          // The row behind this is itself a button that opens the detail sheet.
          event.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80"
      >
        <ARPaymentBadge payment={payment} />
        <BadgeIndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <ARPaymentDialog
        open={open}
        onOpenChange={setOpen}
        docEntry={docEntry}
        docNum={docNum}
        docTotal={docTotal}
        customerName={customerName}
        payment={payment}
      />
    </>
  );
}

/**
 * Paid / part-paid / unpaid filter over the rows already on the screen.
 *
 * Filtering client-side is deliberate: the SAP list is a capped, date-windowed
 * page, so a server-side filter would hide the cap — "3 unpaid" would read as
 * the whole book when it only counts the newest page of it.
 */
export function ARPaymentFilter({
  value,
  onChange,
  counts,
}: {
  value: PaymentBucket | 'ALL';
  onChange: (value: PaymentBucket | 'ALL') => void;
  counts: Record<PaymentBucket, number>;
}) {
  const options: { value: PaymentBucket | 'ALL'; label: string; count: number }[] = [
    { value: 'ALL', label: 'All', count: counts.UNPAID + counts.PARTIAL + counts.RECEIVED },
    { value: 'UNPAID', label: 'Unpaid', count: counts.UNPAID },
    { value: 'PARTIAL', label: 'Part paid', count: counts.PARTIAL },
    { value: 'RECEIVED', label: 'Paid', count: counts.RECEIVED },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'hover:bg-muted',
          )}
        >
          {option.label}
          <span className="ml-1 tabular-nums opacity-70">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
