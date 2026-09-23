import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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

import type { FleetOptions, FleetVehicle, WritePayload } from '../api';
import { useCreateVehicle, useUpdateVehicle } from '../api';
import { type FleetVehicleFormData, fleetVehicleSchema } from '../schemas/fleet.schema';
import { fieldErrors } from '../utils/format';
import { FieldRow, FormError } from './FieldRow';

/**
 * Add or edit one vehicle.
 *
 * Four boxes are compulsory — number, kind, fuel and status — so a clerk can
 * put the whole fleet on the system in one sitting. Everything the office
 * knows but the pump does not care about sits under "More details".
 */
export function VehicleFormDialog({
  open,
  onOpenChange,
  options,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options?: FleetOptions;
  /** Pass to edit instead of add. */
  vehicle?: FleetVehicle;
}) {
  const isEdit = !!vehicle;
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const mutation = isEdit ? updateVehicle : createVehicle;

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FleetVehicleFormData>({
    resolver: zodResolver(fleetVehicleSchema),
    defaultValues: {
      vehicle_number: '',
      category: 'TRUCK',
      fuel_type: 'DIESEL',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on open is the point
    setApiErrors({});
    setPhoto(null);
    setShowMore(false);
    reset(
      vehicle
        ? {
            vehicle_number: vehicle.vehicle_number,
            nickname: vehicle.nickname,
            category: vehicle.category,
            fuel_type: vehicle.fuel_type,
            status: vehicle.status,
            make_model: vehicle.make_model,
            purchase_date: vehicle.purchase_date ?? '',
            purchase_value: vehicle.purchase_value ?? '',
            assigned_to: vehicle.assigned_to,
            department: vehicle.department,
            opening_odometer:
              vehicle.opening_odometer != null ? String(vehicle.opening_odometer) : '',
            remarks: vehicle.remarks,
          }
        : {
            vehicle_number: '',
            nickname: '',
            category: 'TRUCK',
            fuel_type: 'DIESEL',
            status: 'ACTIVE',
          },
    );
  }, [open, vehicle, reset]);

  const onSubmit = async (data: FleetVehicleFormData) => {
    setApiErrors({});
    const payload: WritePayload = { ...data, photo };
    try {
      if (isEdit && vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, payload });
        toast.success('Vehicle updated');
      } else {
        await createVehicle.mutateAsync(payload);
        toast.success('Vehicle added');
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
          <DialogTitle>{isEdit ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Change the vehicle details.' : 'Four boxes now, the rest whenever.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4">
          <DialogBody className="space-y-4">
            <FormError message={apiErrors.general} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Vehicle number"
                htmlFor="vehicle_number"
                required
                error={errors.vehicle_number?.message || apiErrors.vehicle_number}
              >
                <Input
                  id="vehicle_number"
                  placeholder="PB65AB1234"
                  {...register('vehicle_number', {
                    onChange: (event) => {
                      event.target.value = event.target.value.toUpperCase().replace(/\s/g, '');
                    },
                  })}
                />
              </FieldRow>

              <FieldRow label="Called" htmlFor="nickname" hint="What staff call it">
                <Input id="nickname" placeholder="Truck 1 / Office Eeco" {...register('nickname')} />
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Kind of vehicle"
                htmlFor="category"
                required
                error={errors.category?.message || apiErrors.category}
              >
                <NativeSelect id="category" {...register('category')}>
                  {(options?.categories ?? []).map((choice) => (
                    <SelectOption key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </FieldRow>

              <FieldRow
                label="Runs on"
                htmlFor="fuel_type"
                required
                error={errors.fuel_type?.message || apiErrors.fuel_type}
              >
                <NativeSelect id="fuel_type" {...register('fuel_type')}>
                  {(options?.fuel_types ?? []).map((choice) => (
                    <SelectOption key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </FieldRow>
            </div>

            <FieldRow
              label="Status"
              htmlFor="status"
              required
              error={errors.status?.message || apiErrors.status}
            >
              <NativeSelect id="status" {...register('status')}>
                {(options?.vehicle_statuses ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FieldRow>

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
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Make & model" htmlFor="make_model">
                    <Input id="make_model" placeholder="Tata 407 / Activa" {...register('make_model')} />
                  </FieldRow>
                  <FieldRow
                    label="Meter now"
                    htmlFor="opening_odometer"
                    hint="Reading on the day it goes on the system"
                    error={apiErrors.opening_odometer}
                  >
                    <Input
                      id="opening_odometer"
                      type="number"
                      inputMode="numeric"
                      {...register('opening_odometer')}
                    />
                  </FieldRow>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Bought on" htmlFor="purchase_date" error={apiErrors.purchase_date}>
                    <Input id="purchase_date" type="date" {...register('purchase_date')} />
                  </FieldRow>
                  <FieldRow label="Bought for" htmlFor="purchase_value" error={apiErrors.purchase_value}>
                    <Input
                      id="purchase_value"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      {...register('purchase_value')}
                    />
                  </FieldRow>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Kept by" htmlFor="assigned_to">
                    <Input id="assigned_to" placeholder="Driver / employee" {...register('assigned_to')} />
                  </FieldRow>
                  <FieldRow label="Department" htmlFor="department">
                    <Input id="department" {...register('department')} />
                  </FieldRow>
                </div>

                <FieldRow label="Photo" htmlFor="photo">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
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
