/**
 * Enter an oil lot, or correct one.
 *
 * A new lot names its oil, the status it starts in, its vendor, the rate per kg
 * and the kilograms; a contract also names its period, which EXIM required.
 * Correcting a lot changes what was entered — never the oil, the vendor or the
 * status: a status changes only through Change status, which knows how the
 * lot moves. Only what was changed is sent, so the lot's history records
 * exactly the correction.
 *
 * Who entered or changed it is the signed-in person; nothing here sends it.
 */
import { type ReactNode, useState } from 'react';
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
import { getErrorMessage } from '@/shared/utils';

import { useCreateLot, useOils, useUpdateLot } from '../../api';
import type {
  Lot,
  LotCreatePayload,
  LotDetail,
  LotFieldsPayload,
  LotStatus,
  PaymentStatus,
  Vendor,
} from '../../types';
import { fmtLitres, fmtMoney, LITRES_PER_KG } from '../../utils';
import { LOT_STATUS_CHOICES, LOT_STATUS_LABEL, PAYMENT_STATUSES } from '../lotStatus';
import { ChoiceGroup, ContractPeriod } from './LotBits';
import { ARRIVED_STATUSES, MAX_LOT_TOTAL, withinDecimals } from './lotFormat';
import { TruckFields } from './TruckFields';
import { JobWorkPicker, VendorPicker } from './VendorPicker';

interface Form {
  item: string;
  status: LotStatus;
  vendor: Vendor | null;
  rate: string;
  quantity: string;
  vehicle_number: string;
  transporter: string;
  location: string;
  eta: string;
  arrival_date: string;
  contract_start: string;
  contract_end: string;
  payment_status: PaymentStatus;
  bilty_number: string;
  grpo_number: string;
  job_work: string;
}

type Errors = Partial<Record<keyof Form, string>>;

/** Where a lot's bilty and GRPO are written: it has been weighed in. */
const STORED: LotStatus[] = ['IN_TANK', 'IN_WAREHOUSE', 'COMPLETED'];

function emptyForm(): Form {
  return {
    item: '',
    status: 'IN_CONTRACT',
    vendor: null,
    rate: '',
    quantity: '',
    vehicle_number: '',
    transporter: '',
    location: '',
    eta: '',
    arrival_date: '',
    contract_start: '',
    contract_end: '',
    payment_status: 'UNPAID',
    bilty_number: '',
    grpo_number: '',
    job_work: '',
  };
}

function fromLot(lot: Lot): Form {
  return {
    item: String(lot.item),
    status: lot.status,
    vendor: { code: lot.vendor_code, name: lot.vendor_name, temporary: false },
    rate: String(Number(lot.rate)),
    quantity: String(Number(lot.quantity)),
    vehicle_number: lot.vehicle_number,
    transporter: lot.transporter,
    location: lot.location,
    eta: lot.eta ?? '',
    arrival_date: lot.arrival_date ?? '',
    contract_start: lot.contract_start ?? '',
    contract_end: lot.contract_end ?? '',
    payment_status: lot.payment_status,
    bilty_number: lot.bilty_number,
    grpo_number: lot.grpo_number,
    job_work: lot.job_work,
  };
}

/** What a correction changes, and nothing else. */
function corrections(lot: Lot, form: Form): LotFieldsPayload {
  const changes: LotFieldsPayload = {};
  if (Number(form.rate) !== Number(lot.rate)) changes.rate = form.rate.trim();
  if (Number(form.quantity) !== Number(lot.quantity)) changes.quantity = form.quantity.trim();
  if (form.vehicle_number.trim() !== lot.vehicle_number)
    changes.vehicle_number = form.vehicle_number.trim();
  if (form.transporter.trim() !== lot.transporter) changes.transporter = form.transporter.trim();
  if (form.location.trim() !== lot.location) changes.location = form.location.trim();
  if (ARRIVED_STATUSES.includes(lot.status)) {
    if ((form.arrival_date || null) !== lot.arrival_date)
      changes.arrival_date = form.arrival_date || null;
  } else if ((form.eta || null) !== lot.eta) {
    changes.eta = form.eta || null;
  }
  if (lot.status === 'IN_CONTRACT') {
    if ((form.contract_start || null) !== lot.contract_start)
      changes.contract_start = form.contract_start || null;
    if ((form.contract_end || null) !== lot.contract_end)
      changes.contract_end = form.contract_end || null;
  }
  if (PAYMENT_STATUSES.includes(lot.status) && form.payment_status !== lot.payment_status)
    changes.payment_status = form.payment_status;
  if (STORED.includes(lot.status) || lot.bilty_number || lot.grpo_number) {
    if (form.bilty_number.trim() !== lot.bilty_number)
      changes.bilty_number = form.bilty_number.trim();
    if (form.grpo_number.trim() !== lot.grpo_number) changes.grpo_number = form.grpo_number.trim();
  }
  if ((lot.status === 'AT_REFINERY' || lot.job_work) && form.job_work.trim() !== lot.job_work)
    changes.job_work = form.job_work.trim();
  return changes;
}

export function LotFormDialog({
  open,
  onOpenChange,
  lot,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The lot to correct. Left out, the dialog enters a new one. */
  lot?: Lot | null;
  onCreated?: (lot: LotDetail) => void;
}) {
  const isEdit = !!lot;
  const create = useCreateLot();
  const update = useUpdateLot(lot?.id ?? 0);
  const { data: oils, isLoading: oilsLoading } = useOils(true, open && !isEdit);

  // Seeded as well as reset on opening: a page that mounts this dialog already
  // open never shows the reset below a transition.
  const [form, setForm] = useState<Form>(() => (lot ? fromLot(lot) : emptyForm()));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(lot ? fromLot(lot) : emptyForm());
      setErrors({});
      setServerError('');
    }
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  }

  const status = form.status;
  const isContract = status === 'IN_CONTRACT';
  const arrived = ARRIVED_STATUSES.includes(status);
  const showPayment = PAYMENT_STATUSES.includes(status);
  const showStore =
    isEdit && (STORED.includes(status) || !!lot?.bilty_number || !!lot?.grpo_number);
  const showJobWork = isEdit && (status === 'AT_REFINERY' || !!lot?.job_work);

  function validate(): boolean {
    const found: Errors = {};
    if (!isEdit && !form.item) found.item = 'Which oil is it?';
    if (!isEdit && !form.vendor) found.vendor = 'Who is it bought from?';
    if (!(Number(form.rate) > 0)) found.rate = 'What is the rate per kg?';
    else if (!withinDecimals(form.rate, 3)) found.rate = 'Three decimal places at most.';
    if (!(Number(form.quantity) > 0)) found.quantity = 'How many kilograms?';
    else if (!withinDecimals(form.quantity, 2)) found.quantity = 'Two decimal places at most.';
    else if (Number(form.rate) * Number(form.quantity) >= MAX_LOT_TOTAL)
      found.quantity = 'Rate × quantity is too large for one lot.';
    if (isContract) {
      // EXIM asked for both dates on a new contract; a copied lot may lack them.
      if (!isEdit && !form.contract_start) found.contract_start = 'When does the contract start?';
      if (!isEdit && !form.contract_end) found.contract_end = 'When does it end?';
      if (form.contract_start && form.contract_end && form.contract_end < form.contract_start)
        found.contract_end = 'It cannot end before it starts.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setServerError('');
    try {
      if (lot) {
        const changes = corrections(lot, form);
        if (Object.keys(changes).length === 0) {
          setServerError('Nothing has changed.');
          return;
        }
        await update.mutateAsync(changes);
        toast.success(`Lot #${lot.id} saved`);
      } else {
        const vendor = form.vendor as Vendor;
        const payload: LotCreatePayload = {
          item: Number(form.item),
          status,
          vendor_code: vendor.code,
          vendor_name: vendor.name,
          rate: form.rate.trim(),
          quantity: form.quantity.trim(),
          vehicle_number: form.vehicle_number.trim(),
          transporter: form.transporter.trim(),
          location: form.location.trim(),
          eta: !arrived && form.eta ? form.eta : null,
          arrival_date: arrived && form.arrival_date ? form.arrival_date : null,
          contract_start: isContract ? form.contract_start || null : null,
          contract_end: isContract ? form.contract_end || null : null,
          ...(showPayment ? { payment_status: form.payment_status } : {}),
        };
        const created = await create.mutateAsync(payload);
        toast.success(`Lot #${created.id} entered`);
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save the lot.'));
    }
  }

  const saving = create.isPending || update.isPending;
  const rate = Number(form.rate);
  const kg = Number(form.quantity);
  const preview = rate > 0 && kg > 0 ? rate * kg : null;

  function field(key: keyof Form, label: string, input: ReactNode, hint?: ReactNode) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`lot-${key}`}>{label}</Label>
        {input}
        {errors[key] ? (
          <p className="text-xs text-rose-600">{errors[key]}</p>
        ) : (
          hint && <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }

  function text(key: keyof Form, placeholder?: string) {
    return (
      <Input
        id={`lot-${key}`}
        value={String(form[key] ?? '')}
        onChange={(event) => set(key, event.target.value as Form[typeof key])}
        placeholder={placeholder}
      />
    );
  }

  function date(key: keyof Form) {
    return (
      <Input
        id={`lot-${key}`}
        type="date"
        value={String(form[key] ?? '')}
        onChange={(event) => set(key, event.target.value as Form[typeof key])}
      />
    );
  }

  const oilOptions = [...(oils ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lot ? `Edit lot #${lot.id}` : 'Add an oil lot'}</DialogTitle>
          <DialogDescription>
            {lot
              ? `${lot.item_name} from ${lot.vendor_name || lot.vendor_code}, ${LOT_STATUS_LABEL[lot.status].toLowerCase()}. The oil, vendor and status stay as they are; move the lot with Change status.`
              : 'Oil bought from a vendor, by the kilogram, in the status it starts in.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {!isEdit &&
              field(
                'item',
                'Oil',
                <NativeSelect
                  id="lot-item"
                  value={form.item}
                  onChange={(event) => set('item', event.target.value)}
                  disabled={oilsLoading}
                >
                  <SelectOption value="">
                    {oilsLoading ? 'Loading the oils…' : 'Choose the oil'}
                  </SelectOption>
                  {oilOptions.map((oil) => (
                    <SelectOption key={oil.id} value={String(oil.id)}>
                      {oil.name} · {oil.code}
                    </SelectOption>
                  ))}
                </NativeSelect>,
              )}
            {!isEdit &&
              field(
                'status',
                'Starts in',
                <NativeSelect
                  id="lot-status"
                  value={form.status}
                  onChange={(event) => set('status', event.target.value as LotStatus)}
                >
                  {LOT_STATUS_CHOICES.map((s) => (
                    <SelectOption key={s} value={s}>
                      {LOT_STATUS_LABEL[s]}
                    </SelectOption>
                  ))}
                </NativeSelect>,
              )}
            {!isEdit && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lot-vendor">Vendor</Label>
                <VendorPicker
                  inputId="lot-vendor"
                  value={form.vendor?.code ?? ''}
                  onChange={(vendor) => set('vendor', vendor)}
                  error={errors.vendor}
                />
              </div>
            )}
            {field(
              'rate',
              'Rate (₹ per kg)',
              <Input
                id="lot-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={form.rate}
                onChange={(event) => set('rate', event.target.value)}
                placeholder="120.000"
              />,
              rate > 0 && `₹ ${fmtMoney(rate / LITRES_PER_KG)} per litre`,
            )}
            {field(
              'quantity',
              'Quantity (kg)',
              <Input
                id="lot-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.quantity}
                onChange={(event) => set('quantity', event.target.value)}
                placeholder="20000"
              />,
              kg > 0 && `${fmtLitres(kg * LITRES_PER_KG)} litres`,
            )}
            {preview !== null && (
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Value </span>
                <span className="font-semibold">₹ {fmtMoney(preview)}</span>
              </p>
            )}
          </div>

          {isContract && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Contract period</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('contract_start', 'Starts', date('contract_start'))}
                {field('contract_end', 'Ends', date('contract_end'))}
              </div>
              <ContractPeriod start={form.contract_start} end={form.contract_end} />
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Truck and place</h3>
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
              {field('location', 'Location', text('location', 'Mundra Port'))}
              {arrived
                ? field('arrival_date', 'Arrival date', date('arrival_date'))
                : field('eta', 'ETA', date('eta'))}
            </div>
          </section>

          {showPayment && (
            <ChoiceGroup<PaymentStatus>
              label="Payment"
              value={form.payment_status}
              onChange={(value) => set('payment_status', value)}
              options={[
                { value: 'PAID', label: 'Paid' },
                { value: 'UNPAID', label: 'Unpaid' },
              ]}
            />
          )}

          {(showStore || showJobWork) && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Receipt</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {showStore && field('bilty_number', 'Bilty number', text('bilty_number'))}
                {showStore && field('grpo_number', 'GRPO number', text('grpo_number'))}
                {showJobWork && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="lot-job-work">Job work at</Label>
                    <JobWorkPicker
                      inputId="lot-job-work"
                      value={form.job_work}
                      onChange={(value) => set('job_work', value)}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </DialogBody>

        <div className="space-y-3">
          {serverError && <p className="text-sm text-rose-600">{serverError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add lot'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
