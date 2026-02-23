import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

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

import type { Transporter } from '../api/transporter/transporter.api';
import {
  useCreateTransporter,
  useTransporterById,
  useUpdateTransporter,
} from '../api/transporter/transporter.queries';
import { type TransporterFormData, transporterSchema } from '../schemas/transporter.schema';

interface CreateTransporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (transporter: Transporter) => void;

  /** Optional — pass to enable edit mode */
  initialData?: {
    id: number;
  };
}

export function CreateTransporterDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: CreateTransporterDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const createTransporter = useCreateTransporter();
  const updateTransporter = useUpdateTransporter();

  const isEditMode = !!initialData;
  const mutation = isEditMode ? updateTransporter : createTransporter;

  // Fetch full transporter details when in edit mode
  const { data: transporterData } = useTransporterById(
    open && isEditMode ? initialData.id : null,
    open && isEditMode,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<TransporterFormData>({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      mobile_no: '',
    },
  });

  // Combine form errors and API errors for scroll-to-error
  const combinedErrors = useMemo(() => ({ ...errors, ...apiErrors }), [errors, apiErrors]);
  useScrollToError(combinedErrors);

  // Reset form and errors when dialog opens/closes
  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on dialog open is a valid pattern
    setApiErrors({});

    if (!isEditMode) {
      reset();
    }
  }, [open, reset, isEditMode]);

  // Populate form when transporter data is fetched (edit mode)
  useEffect(() => {
    if (!open || !isEditMode || !transporterData) return;

    reset({
      name: transporterData.name,
      contact_person: transporterData.contact_person,
      mobile_no: transporterData.mobile_no,
    });
  }, [open, isEditMode, transporterData, reset]);

  const onSubmit = async (data: TransporterFormData) => {
    setApiErrors({});
    try {
      const result = isEditMode
        ? await updateTransporter.mutateAsync({ id: initialData.id, ...data })
        : await createTransporter.mutateAsync(data);
      reset();
      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
            setError(field as keyof TransporterFormData, {
              type: 'server',
              message: messages[0],
            });
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({
          general:
            apiError.message ||
            (isEditMode ? 'Failed to update transporter' : 'Failed to create transporter'),
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Update Transporter' : 'Add New Transporter'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the transporter details below.'
              : 'Fill in the details to create a new transporter. All fields are required.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Transporter Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter transporter name"
              {...register('name')}
              disabled={mutation.isPending}
              className={errors.name || apiErrors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            {apiErrors.name && !errors.name && (
              <p className="text-sm text-destructive">{apiErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">
              Contact Person <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact_person"
              placeholder="Enter contact person name"
              {...register('contact_person')}
              disabled={mutation.isPending}
              className={
                errors.contact_person || apiErrors.contact_person ? 'border-destructive' : ''
              }
            />
            {errors.contact_person && (
              <p className="text-sm text-destructive">{errors.contact_person.message}</p>
            )}
            {apiErrors.contact_person && !errors.contact_person && (
              <p className="text-sm text-destructive">{apiErrors.contact_person}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_no">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile_no"
              placeholder="Enter mobile number"
              {...register('mobile_no')}
              disabled={mutation.isPending}
              className={errors.mobile_no || apiErrors.mobile_no ? 'border-destructive' : ''}
            />
            {errors.mobile_no && (
              <p className="text-sm text-destructive">{errors.mobile_no.message}</p>
            )}
            {apiErrors.mobile_no && !errors.mobile_no && (
              <p className="text-sm text-destructive">{apiErrors.mobile_no}</p>
            )}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Transporter'
                  : 'Create Transporter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
