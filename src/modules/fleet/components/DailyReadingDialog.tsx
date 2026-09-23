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
} from '@/shared/components/ui';

import type { FleetVehicle, WritePayload } from '../api';
import { useSaveDailyReading } from '../api';
import { type DailyReadingFormData,dailyReadingSchema } from '../schemas/fleet.schema';
import { fieldErrors, km, shortDate, today } from '../utils/format';
import { FieldRow, FormError } from './FieldRow';
import { VehiclePicker } from './VehiclePicker';

/**
 * Write down one vehicle's meter for one day.
 *
 * One box, and that is the whole point: a log only gets kept if keeping it
 * takes ten seconds. Saving a day that already has a reading overwrites it,
 * so correcting a typo is the same action as entering it.
 */
export function DailyReadingDialog({
  open,
  onOpenChange,
  vehicles,
  vehicleId,
  /** Prefills the date — used when the gap in the log was clicked. */
  onDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: FleetVehicle[];
  vehicleId?: number;
  onDate?: string;
}) {
  const saveReading = useSaveDailyReading();
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DailyReadingFormData>({
    resolver: zodResolver(dailyReadingSchema),
    defaultValues: { vehicle: vehicleId ?? 0, reading_date: onDate ?? today(), odometer: '' },
  });

  const selectedVehicleId = useWatch({ control, name: 'vehicle' });
  const vehicle = useMemo(
    () => vehicles.find((row) => row.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on open is the point
    setApiErrors({});
    reset({ vehicle: vehicleId ?? 0, reading_date: onDate ?? today(), odometer: '', remarks: '' });
  }, [open, vehicleId, onDate, reset]);

  const onSubmit = async (data: DailyReadingFormData) => {
    setApiErrors({});
    try {
      await saveReading.mutateAsync(data as WritePayload);
      toast.success('Reading saved');
      onOpenChange(false);
    } catch (error) {
      setApiErrors(fieldErrors(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Meter reading</DialogTitle>
          <DialogDescription>
            What the meter reads {onDate ? `on ${shortDate(onDate)}` : 'today'}.
          </DialogDescription>
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
                />
              </FieldRow>
            )}

            <FieldRow
              label="Meter reading"
              htmlFor="reading_odometer"
              required
              hint={vehicle?.last_odometer != null ? `Last: ${km(vehicle.last_odometer)}` : undefined}
              error={errors.odometer?.message || apiErrors.odometer}
            >
              <Input
                id="reading_odometer"
                type="number"
                inputMode="numeric"
                placeholder="km on the meter"
                {...register('odometer')}
              />
            </FieldRow>

            <FieldRow
              label="Date"
              htmlFor="reading_date"
              required
              hint="Today unless you change it"
              error={errors.reading_date?.message || apiErrors.reading_date}
            >
              <Input id="reading_date" type="date" max={today()} {...register('reading_date')} />
            </FieldRow>

            <FieldRow label="Remarks" htmlFor="reading_remarks" error={apiErrors.remarks}>
              <Input
                id="reading_remarks"
                placeholder="Only if something needs saying"
                {...register('remarks')}
              />
            </FieldRow>
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveReading.isPending}>
              {saveReading.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
