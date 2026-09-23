import { zodResolver } from '@hookform/resolvers/zod';
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
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import type { FleetOptions, FleetVehicle, ServiceEntry, WritePayload } from '../api';
import { useCreateServiceEntry, useUpdateServiceEntry } from '../api';
import { type ServiceEntryFormData, serviceEntrySchema } from '../schemas/fleet.schema';
import { fieldErrors, km, money, today } from '../utils/format';
import { FieldRow, FormError } from './FieldRow';
import { VehiclePicker } from './VehiclePicker';

/**
 * Record one service, repair or replacement.
 *
 * Parts and labour are asked for separately because most garage bills split
 * them, but the total is what counts: leave the two blank and type the one
 * figure the workshop handed over, and the server takes that.
 */
export function ServiceEntryDialog({
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
  vehicleId?: number;
  entry?: ServiceEntry;
}) {
  const isEdit = !!entry;
  const createEntry = useCreateServiceEntry();
  const updateEntry = useUpdateServiceEntry();
  const mutation = isEdit ? updateEntry : createEntry;

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [billPhoto, setBillPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ServiceEntryFormData>({
    resolver: zodResolver(serviceEntrySchema),
    defaultValues: {
      vehicle: vehicleId ?? 0,
      entry_date: today(),
      kind: 'ROUTINE',
      payment_mode: 'CASH',
    },
  });

  // See the note in FuelEntryDialog: `watch()` cannot be memoized.
  const selectedVehicleId = useWatch({ control, name: 'vehicle' });
  const parts = useWatch({ control, name: 'parts_amount' });
  const labour = useWatch({ control, name: 'labour_amount' });
  const total = useWatch({ control, name: 'total_amount' });

  const vehicle = useMemo(
    () => vehicles.find((row) => row.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  /** What the server will store if the total box is left alone. */
  const impliedTotal = useMemo(() => {
    if (total) return null;
    const sum = Number(parts || 0) + Number(labour || 0);
    return sum > 0 ? sum : null;
  }, [parts, labour, total]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on open is the point
    setApiErrors({});
    setBillPhoto(null);
    reset(
      entry
        ? {
            vehicle: entry.vehicle,
            entry_date: entry.entry_date,
            odometer: entry.odometer != null ? String(entry.odometer) : '',
            kind: entry.kind,
            workshop_name: entry.workshop_name,
            description: entry.description,
            parts_amount: entry.parts_amount,
            labour_amount: entry.labour_amount,
            total_amount: entry.total_amount,
            bill_number: entry.bill_number,
            payment_mode: entry.payment_mode,
            next_service_date: entry.next_service_date ?? '',
            next_service_odometer:
              entry.next_service_odometer != null ? String(entry.next_service_odometer) : '',
            down_days: entry.down_days != null ? String(entry.down_days) : '',
            remarks: entry.remarks,
          }
        : {
            vehicle: vehicleId ?? 0,
            entry_date: today(),
            kind: 'ROUTINE',
            payment_mode: 'CASH',
          },
    );
  }, [open, entry, vehicleId, reset]);

  const onSubmit = async (data: ServiceEntryFormData) => {
    setApiErrors({});
    const payload: WritePayload = { ...data, bill_photo: billPhoto };
    try {
      if (isEdit && entry) {
        await updateEntry.mutateAsync({ id: entry.id, payload });
        toast.success('Service updated');
      } else {
        await createEntry.mutateAsync(payload);
        toast.success('Service recorded');
      }
      onOpenChange(false);
    } catch (error) {
      setApiErrors(fieldErrors(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit service' : 'Add service or repair'}</DialogTitle>
          <DialogDescription>What was done, what it cost, when it is due again.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4">
          <DialogBody className="space-y-4">
            <FormError message={apiErrors.general} />

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

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Date"
                htmlFor="service_date"
                required
                error={errors.entry_date?.message || apiErrors.entry_date}
              >
                <Input id="service_date" type="date" max={today()} {...register('entry_date')} />
              </FieldRow>

              <FieldRow
                label="Type of work"
                htmlFor="kind"
                required
                error={errors.kind?.message || apiErrors.kind}
              >
                <NativeSelect id="kind" {...register('kind')}>
                  {(options?.service_kinds ?? []).map((choice) => (
                    <SelectOption key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Meter reading"
                htmlFor="service_odometer"
                hint={vehicle?.last_odometer != null ? `Last: ${km(vehicle.last_odometer)}` : undefined}
                error={apiErrors.odometer}
              >
                <Input
                  id="service_odometer"
                  type="number"
                  inputMode="numeric"
                  {...register('odometer')}
                />
              </FieldRow>
              <FieldRow label="Workshop" htmlFor="workshop_name">
                <Input id="workshop_name" {...register('workshop_name')} />
              </FieldRow>
            </div>

            <FieldRow label="What was done" htmlFor="description">
              <Textarea
                id="description"
                rows={2}
                placeholder="Oil change, filter, front brake pads…"
                {...register('description')}
              />
            </FieldRow>

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldRow label="Parts" htmlFor="parts_amount" error={apiErrors.parts_amount}>
                <Input
                  id="parts_amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...register('parts_amount')}
                />
              </FieldRow>
              <FieldRow label="Labour" htmlFor="labour_amount" error={apiErrors.labour_amount}>
                <Input
                  id="labour_amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...register('labour_amount')}
                />
              </FieldRow>
              <FieldRow
                label="Bill total"
                htmlFor="total_amount"
                hint={impliedTotal ? money(impliedTotal) : undefined}
                error={apiErrors.total_amount}
              >
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...register('total_amount')}
                />
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Bill number" htmlFor="service_bill_number">
                <Input id="service_bill_number" {...register('bill_number')} />
              </FieldRow>
              <FieldRow label="Paid by" htmlFor="service_payment_mode">
                <NativeSelect id="service_payment_mode" {...register('payment_mode')}>
                  {(options?.payment_modes ?? []).map((mode) => (
                    <SelectOption key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Next service due"
                htmlFor="next_service_date"
                error={apiErrors.next_service_date}
              >
                <Input id="next_service_date" type="date" {...register('next_service_date')} />
              </FieldRow>
              <FieldRow
                label="…or at km"
                htmlFor="next_service_odometer"
                error={apiErrors.next_service_odometer}
              >
                <Input
                  id="next_service_odometer"
                  type="number"
                  inputMode="numeric"
                  {...register('next_service_odometer')}
                />
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Days off the road" htmlFor="down_days" error={apiErrors.down_days}>
                <Input id="down_days" type="number" inputMode="numeric" {...register('down_days')} />
              </FieldRow>
              <FieldRow label="Bill photo" htmlFor="service_bill_photo">
                <Input
                  id="service_bill_photo"
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(event) => setBillPhoto(event.target.files?.[0] ?? null)}
                />
              </FieldRow>
            </div>
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
