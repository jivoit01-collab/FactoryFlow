import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import type { ApiError } from '@/core/api/types';
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
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';

import type { SapTransporterVendor } from '../api/transporter/transporter.api';
import {
  useResolveTransporter,
  useSapTransporterVendors,
} from '../api/transporter/transporter.queries';
import type { Vehicle } from '../api/vehicle/vehicle.api';
import { useCreateVehicle, useUpdateVehicle, useVehicleById } from '../api/vehicle/vehicle.queries';
import { vehicleSchema } from '../schemas/vehicle.schema';
import { SapTransporterSelect } from './SapTransporterSelect';
import type { TransporterDetails } from './TransporterSelect';
import { VehicleTypeSelect } from './VehicleTypeSelect';

// The transporter is not a form field: it is picked from SAP or typed, and
// turned into an app transporter only when the vehicle is saved.
const vehicleFormSchema = vehicleSchema.omit({ transporter: true });
type VehicleFormData = z.infer<typeof vehicleFormSchema>;

/** The SAP vendor a seeded transporter (e.g. from the SAP bill) already is. */
function findSeedVendor(
  vendors: SapTransporterVendor[],
  seed?: Partial<TransporterDetails>,
): SapTransporterVendor | null {
  const gstin = seed?.gstin?.trim().toUpperCase();
  if (gstin) {
    const byGstin = vendors.filter((v) => v.gstin === gstin);
    const pick = byGstin.find((v) => v.is_transporter) ?? (byGstin.length === 1 ? byGstin[0] : null);
    if (pick) return pick;
  }
  const name = seed?.name?.trim().toLowerCase();
  return name ? (vendors.find((v) => v.card_name.toLowerCase() === name) ?? null) : null;
}

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (vehicle: Vehicle) => void;

  /** Optional — pass to enable edit mode */
  initialData?: {
    id: number;
  };
  initialVehicleNumber?: string;
  initialTransporterDetails?: Partial<TransporterDetails>;
}

export function CreateVehicleDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  initialVehicleNumber,
  initialTransporterDetails,
}: CreateVehicleDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const resolveTransporter = useResolveTransporter();
  const [vehicleTypeValue, setVehicleTypeValue] = useState('');

  // The transporter: the vehicle's current one (edit), a vendor picked from SAP,
  // or a name typed by hand. Until the picker is touched, a seed from the SAP
  // bill stands in for the pick.
  const [currentTransporter, setCurrentTransporter] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [pickedVendor, setPickedVendor] = useState<SapTransporterVendor | null>(null);
  const [pickTouched, setPickTouched] = useState(false);
  const [manualTransporter, setManualTransporter] = useState(false);
  const [manualTransporterName, setManualTransporterName] = useState('');
  const { data: sapVendors } = useSapTransporterVendors(open && !manualTransporter);

  const isEditMode = !!initialData;
  const mutation = isEditMode ? updateVehicle : createVehicle;

  // Fetch full vehicle details when in edit mode
  const { data: vehicleData } = useVehicleById(
    open && isEditMode ? initialData.id : null,
    open && isEditMode,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicle_number: '',
      vehicle_type: 0,
      capacity_ton: '',
      length_m: '',
      width_m: '',
      height_m: '',
    },
  });

  const initialTransporterName = initialTransporterDetails?.name?.trim() ?? '';
  const seedVendor = useMemo(
    () => findSeedVendor(sapVendors?.results ?? [], initialTransporterDetails),
    [sapVendors, initialTransporterDetails],
  );
  const sapChoice = pickTouched ? pickedVendor : (pickedVendor ?? seedVendor);

  // Combine form errors and API errors for scroll-to-error
  const combinedErrors = useMemo(() => ({ ...errors, ...apiErrors }), [errors, apiErrors]);
  useScrollToError(combinedErrors);

  // Reset form and errors when dialog opens/closes
  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on dialog open is a valid pattern
    setApiErrors({});

    if (!isEditMode) {
      reset({
        vehicle_number: initialVehicleNumber?.toUpperCase().replace(/\s/g, '') || '',
        vehicle_type: 0,
        capacity_ton: '',
        length_m: '',
        width_m: '',
        height_m: '',
      });
      setCurrentTransporter(null);
      setVehicleTypeValue('');
    }
    setPickedVendor(null);
    setPickTouched(false);
    setManualTransporter(false);
    setManualTransporterName('');
  }, [open, reset, isEditMode, initialVehicleNumber]);

  // Populate form when vehicle data is fetched (edit mode)
  useEffect(() => {
    if (!open || !isEditMode || !vehicleData) return;

    reset({
      vehicle_number: vehicleData.vehicle_number,
      vehicle_type: vehicleData.vehicle_type?.id ?? 0,
      capacity_ton: vehicleData.capacity_ton ?? '',
      length_m: vehicleData.length_m ?? '',
      width_m: vehicleData.width_m ?? '',
      height_m: vehicleData.height_m ?? '',
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Dialog edit form mirrors fetched vehicle details.
    setVehicleTypeValue(vehicleData.vehicle_type?.id ? String(vehicleData.vehicle_type.id) : '');
    setCurrentTransporter(
      vehicleData.transporter
        ? { id: vehicleData.transporter.id, name: vehicleData.transporter.name }
        : null,
    );
  }, [open, isEditMode, vehicleData, reset]);

  /** The app transporter to save on the vehicle, made from the SAP pick or the typed name. */
  const transporterIdToSave = async (): Promise<number | null> => {
    if (manualTransporter) {
      const name = manualTransporterName.trim();
      if (!name) return null;
      return (await resolveTransporter.mutateAsync({ name })).id;
    }
    if (sapChoice) {
      return (await resolveTransporter.mutateAsync({ card_code: sapChoice.card_code })).id;
    }
    return pickTouched ? null : (currentTransporter?.id ?? null);
  };

  const onSubmit = async (data: VehicleFormData) => {
    setApiErrors({});
    try {
      const transporterId = await transporterIdToSave();
      if (!transporterId) {
        setApiErrors({
          transporter: manualTransporter
            ? 'Type the transporter name'
            : 'Pick the transporter from SAP, or type it if SAP does not have it',
        });
        return;
      }
      const result = isEditMode
        ? await updateVehicle.mutateAsync({
            id: initialData.id,
            ...data,
            transporter: transporterId,
          })
        : await createVehicle.mutateAsync({
            ...data,
            transporter: transporterId,
          });
      reset();
      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiError;

      if (apiError.errors) {
        // Map API errors to form fields
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // The transporter resolve answers about card_code / name; both are
            // the transporter field here, which is not a form field.
            if (field === 'card_code' || field === 'name' || field === 'transporter') {
              fieldErrors.transporter = messages[0];
              return;
            }
            fieldErrors[field] = messages[0];
            setError(field as keyof VehicleFormData, {
              type: 'server',
              message: messages[0],
            });
          }
        });
        setApiErrors(fieldErrors);
      } else {
        // General error message
        setApiErrors({
          general:
            apiError.message ||
            (isEditMode ? 'Failed to update vehicle' : 'Failed to create vehicle'),
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Update Vehicle' : 'Add New Vehicle'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the vehicle details below.'
              : 'Fill in the details to create a new vehicle. All fields are required.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vehicle_number">
              Vehicle Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicle_number"
              placeholder="HR55AB1234"
              {...register('vehicle_number', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
                },
              })}
              disabled={isEditMode || mutation.isPending}
              className={
                errors.vehicle_number || apiErrors.vehicle_number ? 'border-destructive' : ''
              }
            />
            {!isEditMode && errors.vehicle_number && (
              <p className="text-sm text-destructive">{errors.vehicle_number.message}</p>
            )}
            {!isEditMode && apiErrors.vehicle_number && !errors.vehicle_number && (
              <p className="text-sm text-destructive">{apiErrors.vehicle_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <VehicleTypeSelect
              value={vehicleTypeValue || undefined}
              onChange={(typeId) => {
                setValue('vehicle_type', typeId);
                setVehicleTypeValue(String(typeId));
              }}
              disabled={mutation.isPending}
              label="Vehicle Type"
              required
              error={errors.vehicle_type?.message || apiErrors.vehicle_type}
            />
          </div>

          <SapTransporterSelect
            enabled={open}
            manual={manualTransporter}
            onManualChange={(manual) => {
              if (manual && !manualTransporterName) {
                setManualTransporterName(currentTransporter?.name ?? initialTransporterName);
              }
              setManualTransporter(manual);
              setApiErrors((prev) => {
                const next = { ...prev };
                delete next.transporter;
                return next;
              });
            }}
            manualName={manualTransporterName}
            onManualNameChange={setManualTransporterName}
            selectedCode={sapChoice?.card_code}
            displayText={currentTransporter?.name ?? initialTransporterName}
            onVendorSelect={(vendor) => {
              setPickedVendor(vendor);
              setPickTouched(true);
            }}
            disabled={mutation.isPending || resolveTransporter.isPending}
            error={apiErrors.transporter}
          />

          <div className="space-y-2">
            <Label htmlFor="capacity_ton">
              Vehicle Capacity (Tons) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="capacity_ton"
              type="text"
              placeholder="e.g., 18"
              {...register('capacity_ton')}
              disabled={mutation.isPending}
              className={errors.capacity_ton || apiErrors.capacity_ton ? 'border-destructive' : ''}
            />
            {errors.capacity_ton && (
              <p className="text-sm text-destructive">{errors.capacity_ton.message}</p>
            )}
            {apiErrors.capacity_ton && !errors.capacity_ton && (
              <p className="text-sm text-destructive">{apiErrors.capacity_ton}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Dimensions (metres) — optional</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="text"
                placeholder="Length"
                aria-label="Length in metres"
                {...register('length_m')}
                disabled={mutation.isPending}
              />
              <Input
                type="text"
                placeholder="Width"
                aria-label="Width in metres"
                {...register('width_m')}
                disabled={mutation.isPending}
              />
              <Input
                type="text"
                placeholder="Height"
                aria-label="Height in metres"
                {...register('height_m')}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || resolveTransporter.isPending}>
              {mutation.isPending || resolveTransporter.isPending
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Vehicle'
                  : 'Create Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
