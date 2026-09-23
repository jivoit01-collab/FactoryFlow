import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
  Switch,
  Textarea,
} from '@/shared/components/ui';

import type { FleetOptions, FleetVehicle, FuelEntry, WritePayload } from '../api';
import { useCreateFuelEntry, useUpdateFuelEntry } from '../api';
import { type FuelEntryFormData, fuelEntrySchema } from '../schemas/fleet.schema';
import { fieldErrors, km, rupees, today } from '../utils/format';
import { FieldRow, FormError } from './FieldRow';
import { VehiclePicker } from './VehiclePicker';

/**
 * Record one filling.
 *
 * Three boxes get typed into: the meter reading, how much went in, and what
 * was paid. Everything else is either a tap (which vehicle, and petrol or CNG
 * on the one kind of vehicle that can be either) or already correct (the date
 * is today, the tank was filled full). The other nine fields sit behind "More
 * details", the date among them — this is the screen somebody fills in
 * standing next to a pump with a paper slip in one hand.
 *
 * Two of its behaviours come from the server rather than from here, and both
 * are questions rather than refusals: a meter reading below the last one wants
 * a note saying why, and the same amount twice on one day wants confirming.
 * The server raises each once; this dialog turns it into the extra box or the
 * banner, and the second save goes through.
 */
export function FuelEntryDialog({
  open,
  onOpenChange,
  vehicles,
  options,
  vehicleId,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: FleetVehicle[];
  options?: FleetOptions;
  /** Fixes the vehicle — the picker is hidden when it is opened from one. */
  vehicleId?: number;
  /** Pass to edit instead of create. */
  entry?: FuelEntry;
}) {
  const isEdit = !!entry;
  const createEntry = useCreateFuelEntry();
  const updateEntry = useUpdateFuelEntry();
  const mutation = isEdit ? updateEntry : createEntry;

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [billPhoto, setBillPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FuelEntryFormData>({
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      vehicle: vehicleId ?? 0,
      entry_date: today(),
      fuel_type: '',
      odometer: '',
      quantity: '',
      amount: '',
      rate: '',
      is_tank_full: true,
      payment_mode: 'CASH',
    },
  });

  // `useWatch` rather than `watch()`: the latter returns a fresh function on
  // every render, which React Compiler refuses to memoize around.
  const selectedVehicleId = useWatch({ control, name: 'vehicle' });
  const selectedFuel = useWatch({ control, name: 'fuel_type' });
  const isTankFull = useWatch({ control, name: 'is_tank_full' });
  const quantityValue = useWatch({ control, name: 'quantity' });
  const amountValue = useWatch({ control, name: 'amount' });

  const vehicle = useMemo(
    () => vehicles.find((row) => row.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  /** `L` or `Kg`, following the fuel actually chosen. */
  const unit = useMemo(() => {
    if (!vehicle) return 'L';
    const match = vehicle.fuels_allowed.find((fuel) => fuel.value === selectedFuel);
    return match?.unit ?? vehicle.fuels_allowed[0]?.unit ?? 'L';
  }, [vehicle, selectedFuel]);

  /** Shown live so the person can sanity-check the slip before saving. */
  const derivedRate = useMemo(() => {
    const litres = Number(quantityValue);
    const paid = Number(amountValue);
    if (!litres || !paid) return null;
    return paid / litres;
  }, [quantityValue, amountValue]);

  // Fresh form each time it opens, and the vehicle it was opened from.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on open is the point
    setApiErrors({});
    setConfirmDuplicate(false);
    setBillPhoto(null);
    setShowMore(false);
    reset(
      entry
        ? {
            vehicle: entry.vehicle,
            entry_date: entry.entry_date,
            fuel_type: entry.fuel_type,
            odometer: String(entry.odometer),
            quantity: entry.quantity,
            amount: entry.amount,
            rate: entry.rate ?? '',
            is_tank_full: entry.is_tank_full,
            station_name: entry.station_name,
            bill_number: entry.bill_number,
            payment_mode: entry.payment_mode,
            filled_by: entry.filled_by,
            remarks: entry.remarks,
            odometer_note: entry.odometer_note,
          }
        : {
            vehicle: vehicleId ?? 0,
            entry_date: today(),
            fuel_type: '',
            odometer: '',
            quantity: '',
            amount: '',
            rate: '',
            is_tank_full: true,
            payment_mode: 'CASH',
          },
    );
  }, [open, entry, vehicleId, reset]);

  // A vehicle that runs on one fuel is never asked which fuel it took.
  useEffect(() => {
    if (!vehicle) return;
    if (vehicle.fuels_allowed.length === 1) {
      setValue('fuel_type', vehicle.fuels_allowed[0].value);
    } else if (!vehicle.fuels_allowed.some((fuel) => fuel.value === selectedFuel)) {
      setValue('fuel_type', '');
    }
  }, [vehicle, selectedFuel, setValue]);

  const onSubmit = async (data: FuelEntryFormData) => {
    setApiErrors({});
    const payload: WritePayload = {
      ...data,
      bill_photo: billPhoto,
      confirm_duplicate: confirmDuplicate,
    };

    try {
      if (isEdit && entry) {
        await updateEntry.mutateAsync({ id: entry.id, payload });
        toast.success('Filling updated');
      } else {
        await createEntry.mutateAsync(payload);
        toast.success('Filling recorded');
      }
      onOpenChange(false);
    } catch (error) {
      const flat = fieldErrors(error);
      setApiErrors(flat);
      // The server asks these two as questions. Turn each into the control
      // that answers it, and let the next save through.
      if (flat.confirm_duplicate) setConfirmDuplicate(true);
      // Both of these are answered by a box inside "More details", so open it
      // rather than leaving the message pointing at something hidden.
      if (flat.odometer || flat.entry_date) setShowMore(true);
    }
  };

  const lastReading = vehicle?.last_odometer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit filling' : 'Add fuel'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Change what was entered.' : 'Meter, quantity, price. That is all.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4">
          <DialogBody className="space-y-4">
            <FormError message={apiErrors.general} />

            {apiErrors.confirm_duplicate && (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiErrors.confirm_duplicate} Press Save again to keep both.</span>
              </div>
            )}

            {!vehicleId && (
              <FieldRow label="Vehicle" required error={errors.vehicle?.message}>
                <VehiclePicker
                  vehicles={vehicles}
                  value={selectedVehicleId || null}
                  onChange={(picked) => setValue('vehicle', picked.id)}
                  disabled={isEdit}
                />
              </FieldRow>
            )}

            {vehicle && vehicle.fuels_allowed.length > 1 && (
              <FieldRow
                label="Which fuel"
                required
                error={errors.fuel_type?.message || apiErrors.fuel_type}
              >
                <div className="flex gap-2">
                  {vehicle.fuels_allowed.map((fuel) => (
                    <Button
                      key={fuel.value}
                      type="button"
                      variant={selectedFuel === fuel.value ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setValue('fuel_type', fuel.value)}
                    >
                      {fuel.label}
                    </Button>
                  ))}
                </div>
              </FieldRow>
            )}

            <FieldRow
              label="Meter reading"
              htmlFor="odometer"
              required
              hint={lastReading != null ? `Last: ${km(lastReading)}` : undefined}
              error={errors.odometer?.message || apiErrors.odometer}
            >
              <Input
                id="odometer"
                type="number"
                inputMode="numeric"
                placeholder="km on the meter"
                {...register('odometer')}
              />
            </FieldRow>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label={unit === 'Kg' ? 'Kg filled' : 'Litres filled'}
                htmlFor="quantity"
                required
                error={errors.quantity?.message || apiErrors.quantity}
              >
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={unit}
                  {...register('quantity')}
                />
              </FieldRow>

              <FieldRow
                label="Price paid"
                htmlFor="amount"
                required
                hint={derivedRate ? `${rupees(derivedRate)} / ${unit}` : undefined}
                error={errors.amount?.message || apiErrors.amount}
              >
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="₹ on the slip"
                  {...register('amount')}
                />
              </FieldRow>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is_tank_full">Tank filled full</Label>
                <p className="text-xs text-muted-foreground">
                  Mileage can only be worked out between two full tanks.
                </p>
              </div>
              <Switch
                id="is_tank_full"
                checked={isTankFull}
                onChange={(checked) => setValue('is_tank_full', checked)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowMore((shown) => !shown)}
              className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              More details
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
              />
            </button>

            {showMore && (
              <div className="space-y-4 rounded-lg border p-3">
                <FieldRow
                  label="Date"
                  htmlFor="entry_date"
                  required
                  hint="Today unless you change it"
                  error={errors.entry_date?.message || apiErrors.entry_date}
                >
                  <Input id="entry_date" type="date" max={today()} {...register('entry_date')} />
                </FieldRow>

                {apiErrors.odometer && (
                  <FieldRow
                    label="Why is the meter lower?"
                    htmlFor="odometer_note"
                    required
                    error={apiErrors.odometer_note}
                  >
                    <Input
                      id="odometer_note"
                      placeholder="Meter replaced / not working"
                      {...register('odometer_note')}
                    />
                  </FieldRow>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Pump / station" htmlFor="station_name">
                    <Input id="station_name" {...register('station_name')} />
                  </FieldRow>
                  <FieldRow label="Bill number" htmlFor="bill_number">
                    <Input id="bill_number" {...register('bill_number')} />
                  </FieldRow>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Paid by" htmlFor="payment_mode">
                    <NativeSelect id="payment_mode" {...register('payment_mode')}>
                      {(options?.payment_modes ?? []).map((mode) => (
                        <SelectOption key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                  </FieldRow>
                  <FieldRow label="Filled by" htmlFor="filled_by">
                    <Input id="filled_by" placeholder="Driver's name" {...register('filled_by')} />
                  </FieldRow>
                </div>

                <FieldRow label="Rate per unit" htmlFor="rate" hint="Worked out if left blank">
                  <Input id="rate" type="number" step="0.01" inputMode="decimal" {...register('rate')} />
                </FieldRow>

                <FieldRow label="Bill photo" htmlFor="bill_photo">
                  <Input
                    id="bill_photo"
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={(event) => setBillPhoto(event.target.files?.[0] ?? null)}
                  />
                </FieldRow>

                <FieldRow label="Remarks" htmlFor="remarks">
                  <Textarea id="remarks" rows={2} {...register('remarks')} />
                </FieldRow>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
