/**
 * Move a lot on: EXIM's three-step edit dialog, folded into one.
 *
 * Where the lot goes decides how it moves, as EXIM's screen decided it
 * (`defaultMoveKind`):
 *  - the whole lot changes status (a truck reaching the factory gate);
 *  - part of it leaves as a new lot (a truck loaded from a contract);
 *  - it arrives at a refinery and joins the lot there collecting arrivals;
 *  - it is weighed into the tanks or a warehouse, a short weight recording
 *    the shortage.
 * Where EXIM let the person choose (into contract, onto the sea), they choose
 * between the whole lot and part of it.
 *
 * A quantity that differs from the lot's needs an answer — hand the difference
 * back (Retain) or absorb it (Tolerate); an unchanged one needs none. Payment is
 * asked when a contract starts loading, and the refinery doing job work when a
 * lot arrives at one: both EXIM rules. EXIM's third answer, Debit, is gone: it
 * could only ever fail, and a shortage is recorded on the way into the tank.
 *
 * Only the fields a move actually sends are shown; EXIM's second step showed a
 * truck and a date for every move and dropped most of them.
 */
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
} from '@/shared/components/ui';
import { formatDay, getErrorMessage } from '@/shared/utils';

import { useArriveLot, useDispatchLot, useIntoTank, useLot, useMoveLot } from '../../api';
import type { Lot, LotAction, LotDetail, LotStatus, PaymentStatus } from '../../types';
import { fmtKg, fmtMoney, fmtQty, todayISO } from '../../utils';
import {
  defaultMoveKind,
  LOT_STATUS_CHOICES,
  LOT_STATUS_LABEL,
  type LotMoveKind,
} from '../lotStatus';
import { type Choice, ChoiceGroup } from './LotBits';
import { retainTarget, shortagePreview, STORAGE_STATUSES, withinDecimals } from './lotFormat';
import { TruckFields } from './TruckFields';
import { JobWorkPicker } from './VendorPicker';

interface Form {
  to: LotStatus | '';
  /** The person's choice where the destination leaves it open. */
  way: 'move' | 'dispatch' | '';
  quantity: string;
  action: LotAction | '';
  payment: PaymentStatus | '';
  vehicle_number: string;
  transporter: string;
  location: string;
  eta: string;
  arrival_date: string;
  job_work: string;
  bilty_number: string;
  grpo_number: string;
}

type Errors = Partial<Record<keyof Form, string>>;

function initialForm(lot: Lot): Form {
  return {
    to: '',
    way: '',
    quantity: String(Number(lot.quantity)),
    action: '',
    payment: '',
    vehicle_number: lot.vehicle_number,
    transporter: lot.transporter,
    location: lot.location,
    eta: lot.eta ?? '',
    arrival_date: todayISO(),
    job_work: lot.job_work,
    bilty_number: lot.bilty_number,
    grpo_number: lot.grpo_number,
  };
}

const QUANTITY_LABEL: Record<LotMoveKind, string> = {
  move: 'Quantity (kg)',
  dispatch: 'Leaving (kg)',
  arrive: 'Weighed at the refinery (kg)',
  into: 'Weighed in (kg)',
};

const label = (status: LotStatus) => LOT_STATUS_LABEL[status].toLowerCase();

export function LotStatusDialog({
  open,
  onOpenChange,
  lot,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: Lot;
  /** The lot the move returns: the same lot, the new one (dispatch) or the refinery's (arrival). */
  onMoved?: (result: LotDetail, kind: LotMoveKind) => void;
}) {
  const navigate = useNavigate();
  // The lot's parent says whether a Retain has anywhere to go.
  const { data: detail } = useLot(open ? lot.id : null);
  const move = useMoveLot(lot.id);
  const dispatch = useDispatchLot(lot.id);
  const arrive = useArriveLot(lot.id);
  const intoTank = useIntoTank(lot.id);

  const [form, setForm] = useState<Form>(() => initialForm(lot));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(initialForm(lot));
      setErrors({});
      setServerError('');
    }
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  }

  function choose(to: LotStatus) {
    setForm((current) => ({
      ...current,
      to,
      way: '',
      action: '',
      payment: '',
      arrival_date: to === 'OUT_SIDE_FACTORY' ? todayISO() : current.arrival_date,
    }));
    setErrors({});
    setServerError('');
  }

  const to = form.to || null;
  const fixedKind = to ? defaultMoveKind(to) : null;
  const kind: LotMoveKind | null = to ? (fixedKind ?? (form.way || null)) : null;

  const lotKg = Number(lot.quantity);
  const kg = Number(form.quantity);
  const kgValid = kg > 0 && withinDecimals(form.quantity, 2);
  const difference = kgValid ? lotKg - kg : 0;
  const tooMuch = kind === 'dispatch' && kgValid && kg > lotKg;
  const needsAction = !!kind && kind !== 'into' && kgValid && !tooMuch && difference !== 0;
  const needsPayment = lot.status === 'IN_CONTRACT' && to === 'UNDER_LOADING';
  const retainTo =
    kind === 'move' || kind === 'arrive' ? retainTarget(lot, detail?.parent_summary) : null;
  const parentClosed = !!detail?.parent_summary?.deleted;

  const actionChoices: Choice<LotAction>[] =
    kind === 'dispatch'
      ? [
          {
            value: 'RETAIN',
            label: 'Keep the rest on this lot',
            hint: `Lot #${lot.id} keeps ${fmtKg(difference)} kg.`,
          },
          {
            value: 'TOLERATE',
            label: 'Close this lot',
            hint: `Nothing more is expected from it; the other ${fmtKg(difference)} kg is written off.`,
          },
        ]
      : [
          {
            value: 'RETAIN',
            label: difference > 0 ? 'Hand the difference back' : 'Take the extra from storage',
            hint: retainTo
              ? difference > 0
                ? `${fmtKg(difference)} kg goes back to lot #${retainTo}, where it came from.`
                : `${fmtKg(-difference)} kg comes off lot #${retainTo}, where it came from.`
              : undefined,
            disabledReason: retainTo
              ? undefined
              : STORAGE_STATUSES.includes(lot.status)
                ? 'It is a storage lot itself, so there is nowhere to hand it back.'
                : parentClosed
                  ? `Lot #${lot.parent}, where it came from, is closed.`
                  : 'It did not come from a storage lot, so there is nowhere to hand it back.',
          },
          {
            value: 'TOLERATE',
            label: 'Absorb it',
            hint:
              difference > 0
                ? `The ${fmtKg(difference)} kg is written off.`
                : `The lot keeps the extra ${fmtKg(-difference)} kg.`,
          },
        ];

  function validate(): boolean {
    const found: Errors = {};
    if (!to) found.to = 'Where is the lot going?';
    else if (!kind) found.way = 'The whole lot, or part of it?';
    if (!(kg > 0)) found.quantity = 'How many kilograms?';
    else if (!withinDecimals(form.quantity, 2)) found.quantity = 'Two decimal places at most.';
    else if (tooMuch) found.quantity = `Only ${fmtKg(lotKg)} kg is on the lot.`;
    if (needsAction && !form.action) found.action = 'Say what happens to the difference.';
    else if (needsAction && form.action === 'RETAIN' && kind !== 'dispatch' && !retainTo)
      found.action = 'There is nowhere to hand it back to: absorb it instead.';
    if (needsPayment && !form.payment) found.payment = 'Paid or unpaid?';
    if (kind === 'arrive' && !form.job_work.trim())
      found.job_work = 'Which refinery is doing the job work?';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save() {
    if (!validate() || !to || !kind) return;
    setServerError('');
    const quantity = form.quantity.trim();
    const action = needsAction ? (form.action as LotAction) : null;
    const payment_status = needsPayment ? (form.payment as PaymentStatus) : null;
    try {
      let result: LotDetail;
      if (kind === 'move') {
        result = await move.mutateAsync({
          status: to,
          quantity,
          action,
          arrival_date: to === 'OUT_SIDE_FACTORY' ? form.arrival_date || todayISO() : undefined,
          location: form.location.trim() || undefined,
          payment_status,
        });
        toast.success(`Lot #${lot.id} is now ${label(to)}`);
      } else if (kind === 'dispatch') {
        result = await dispatch.mutateAsync({
          status: to,
          quantity,
          action,
          vehicle_number: form.vehicle_number.trim(),
          transporter: form.transporter.trim(),
          location: form.location.trim(),
          eta: form.eta || null,
          payment_status,
        });
        const created = result;
        toast.success(`Lot #${created.id} left lot #${lot.id}: ${fmtKg(quantity)} kg`, {
          action: { label: 'Open', onClick: () => navigate(`/exim/lots/${created.id}`) },
        });
      } else if (kind === 'arrive') {
        result = await arrive.mutateAsync({
          weighed_qty: quantity,
          status: to,
          action,
          job_work: form.job_work.trim(),
        });
        const collecting = result;
        toast.success(`Lot #${lot.id} arrived at the refinery, into lot #${collecting.id}`, {
          action: { label: 'Open', onClick: () => navigate(`/exim/lots/${collecting.id}`) },
        });
      } else {
        result = await intoTank.mutateAsync({
          weighed_qty: quantity,
          status: to === 'IN_WAREHOUSE' ? 'IN_WAREHOUSE' : 'IN_TANK',
          bilty_number: form.bilty_number.trim(),
          grpo_number: form.grpo_number.trim(),
        });
        toast.success(`Lot #${lot.id} is ${label(to)}`, {
          description:
            to === 'IN_TANK' && kg < lotKg ? 'The shortage is on the Shortages page.' : undefined,
        });
      }
      onMoved?.(result, kind);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not change the status.'));
    }
  }

  const saving = move.isPending || dispatch.isPending || arrive.isPending || intoTank.isPending;

  function field(key: keyof Form, text: string, input: ReactNode, hint?: ReactNode) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`move-${key}`}>{text}</Label>
        {input}
        {errors[key] ? (
          <p className="text-xs text-rose-600">{errors[key]}</p>
        ) : (
          hint && <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }

  function input(key: keyof Form, type: 'text' | 'date' = 'text', placeholder?: string) {
    return (
      <Input
        id={`move-${key}`}
        type={type}
        value={String(form[key] ?? '')}
        onChange={(event) => set(key, event.target.value as Form[typeof key])}
        placeholder={placeholder}
      />
    );
  }

  const quantityHint =
    !kgValid || kind === null
      ? `The lot holds ${fmtKg(lotKg)} kg.`
      : kind === 'dispatch'
        ? tooMuch
          ? undefined
          : difference === 0
            ? 'All of it leaves.'
            : `${fmtKg(difference)} kg stays behind.`
        : difference === 0
          ? `The same as the lot's ${fmtKg(lotKg)} kg.`
          : difference > 0
            ? `${fmtKg(difference)} kg less than the lot's ${fmtKg(lotKg)} kg.`
            : `${fmtKg(-difference)} kg more than the lot's ${fmtKg(lotKg)} kg.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Change the status of lot #{lot.id}</DialogTitle>
          <DialogDescription>
            {lot.item_name} from {lot.vendor_name || lot.vendor_code} ·{' '}
            {LOT_STATUS_LABEL[lot.status]}, {fmtKg(lot.quantity)} kg
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {field(
            'to',
            'Move to',
            <NativeSelect
              id="move-to"
              value={form.to}
              onChange={(event) => choose(event.target.value as LotStatus)}
            >
              <SelectOption value="" disabled>
                Choose the new status
              </SelectOption>
              {LOT_STATUS_CHOICES.filter((s) => s !== lot.status).map((s) => (
                <SelectOption key={s} value={s}>
                  {LOT_STATUS_LABEL[s]}
                </SelectOption>
              ))}
            </NativeSelect>,
          )}

          {to && fixedKind === null && (
            <ChoiceGroup<'move' | 'dispatch'>
              label="What moves"
              value={form.way}
              onChange={(value) => {
                set('way', value);
                set('action', '');
              }}
              error={errors.way}
              options={[
                { value: 'move', label: 'The whole lot', hint: 'All of it changes status.' },
                {
                  value: 'dispatch',
                  label: 'Part of it',
                  hint: 'What is sent becomes a new lot; this one keeps the rest or closes.',
                },
              ]}
            />
          )}

          {kind && (
            <>
              {field(
                'quantity',
                QUANTITY_LABEL[kind],
                <Input
                  id="move-quantity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.quantity}
                  onChange={(event) => set('quantity', event.target.value)}
                />,
                quantityHint,
              )}

              {needsAction && (
                <ChoiceGroup<LotAction>
                  label={kind === 'dispatch' ? 'The rest of the lot' : 'The difference'}
                  value={form.action}
                  onChange={(value) => set('action', value)}
                  options={actionChoices}
                  error={errors.action}
                />
              )}

              {needsPayment && (
                <ChoiceGroup<PaymentStatus>
                  label="Payment"
                  value={form.payment}
                  onChange={(value) => set('payment', value)}
                  error={errors.payment}
                  options={[
                    { value: 'PAID', label: 'Paid' },
                    { value: 'UNPAID', label: 'Unpaid' },
                  ]}
                />
              )}

              {kind === 'dispatch' && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">The new lot's truck</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TruckFields
                      vehicle={form.vehicle_number}
                      onVehicleChange={(vehicle, owner) => {
                        // The transporter is the vehicle's own, or none: not the last truck's.
                        set('vehicle_number', vehicle);
                        set('transporter', owner);
                      }}
                      error={errors.vehicle_number}
                    />
                    {field('location', 'Location', input('location', 'text', 'Mundra Port'))}
                    {field('eta', 'ETA', input('eta', 'date'))}
                  </div>
                </section>
              )}

              {kind === 'move' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('location', 'Location', input('location', 'text', 'Mundra Port'))}
                  {to === 'OUT_SIDE_FACTORY' &&
                    field('arrival_date', 'Arrived on', input('arrival_date', 'date'))}
                </div>
              )}

              {kind === 'arrive' && (
                <div className="space-y-1.5">
                  <Label htmlFor="move-job-work">Job work at</Label>
                  <JobWorkPicker
                    inputId="move-job-work"
                    value={form.job_work}
                    onChange={(value) => set('job_work', value)}
                    error={errors.job_work}
                  />
                </div>
              )}

              {kind === 'into' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('bilty_number', 'Bilty number', input('bilty_number'))}
                  {field('grpo_number', 'GRPO number', input('grpo_number'))}
                </div>
              )}

              <WhatHappens lot={lot} form={form} kind={kind} retainTo={retainTo} />
            </>
          )}
        </DialogBody>

        <div className="space-y-3">
          {serverError && <p className="text-sm text-rose-600">{serverError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !kind}>
              {saving ? 'Saving…' : 'Change status'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The move in plain words, as it stands: EXIM's confirm step, kept beside the fields. */
function WhatHappens({
  lot,
  form,
  kind,
  retainTo,
}: {
  lot: Lot;
  form: Form;
  kind: LotMoveKind;
  retainTo: number | null;
}) {
  const to = form.to as LotStatus;
  const lotKg = Number(lot.quantity);
  const kg = Number(form.quantity);
  if (!(kg > 0)) return null;
  const difference = lotKg - kg;
  const lines: string[] = [];

  if (kind === 'move') {
    lines.push(`All of lot #${lot.id}, ${fmtKg(kg)} kg, moves to ${label(to)}.`);
  } else if (kind === 'dispatch') {
    if (kg > lotKg) return null;
    const vehicle = form.vehicle_number.trim();
    lines.push(
      `A new lot of ${fmtKg(kg)} kg leaves lot #${lot.id}, ${label(to)}${vehicle ? ` on ${vehicle}` : ''}.`,
    );
    if (difference === 0) lines.push(`Lot #${lot.id} is used up and closes.`);
    else if (form.action === 'RETAIN') lines.push(`Lot #${lot.id} keeps ${fmtKg(difference)} kg.`);
    else if (form.action === 'TOLERATE')
      lines.push(`Lot #${lot.id} closes; the other ${fmtKg(difference)} kg is written off.`);
  } else if (kind === 'arrive') {
    lines.push(
      `Lot #${lot.id} arrives at the refinery weighing ${fmtKg(kg)} kg and joins the lot there that collects its arrivals (one is opened if there is none). Lot #${lot.id} itself closes.`,
    );
  } else {
    lines.push(
      `Lot #${lot.id} goes ${to === 'IN_WAREHOUSE' ? 'into the warehouse' : 'into the tanks'} at ${fmtKg(kg)} kg.`,
    );
    if (to === 'IN_TANK' && kg < lotKg) {
      const s = shortagePreview(lotKg, kg, Number(lot.rate));
      lines.push(
        s.deductedMt > 0
          ? `It is ${fmtQty(s.shortageMt)} MT short. ${fmtQty(s.allowedMt)} MT is allowed, so ${fmtQty(s.deductedMt)} MT (₹ ${fmtMoney(s.amount)}) is deducted from the vendor.`
          : `It is ${fmtQty(s.shortageMt)} MT short, within the ${fmtQty(s.allowedMt)} MT allowed: nothing is deducted.`,
      );
    } else if (to === 'IN_TANK' && kg > lotKg) {
      lines.push('It weighed more than it was loaded at: nothing is deducted.');
    }
  }

  if ((kind === 'move' || kind === 'arrive') && difference !== 0) {
    if (form.action === 'RETAIN' && retainTo)
      lines.push(
        difference > 0
          ? `${fmtKg(difference)} kg goes back to lot #${retainTo}.`
          : `${fmtKg(-difference)} kg comes off lot #${retainTo}.`,
      );
    else if (form.action === 'TOLERATE')
      lines.push(
        difference > 0
          ? `The other ${fmtKg(difference)} kg is written off.`
          : `The extra ${fmtKg(-difference)} kg is kept.`,
      );
  }
  if (kind === 'move' && to === 'OUT_SIDE_FACTORY' && form.arrival_date)
    lines.push(`It is marked as arrived on ${formatDay(form.arrival_date)}.`);
  if (kind === 'arrive' && form.job_work.trim()) lines.push(`Job work at ${form.job_work.trim()}.`);
  if (form.payment) lines.push(`It is marked ${form.payment === 'PAID' ? 'paid' : 'unpaid'}.`);

  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        What happens
      </p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
