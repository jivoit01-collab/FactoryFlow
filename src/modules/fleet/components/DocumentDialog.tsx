import { zodResolver } from '@hookform/resolvers/zod';
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
} from '@/shared/components/ui';

import type { FleetOptions, VehicleDocument, WritePayload } from '../api';
import { useCreateDocument, useUpdateDocument } from '../api';
import { type VehicleDocumentFormData, vehicleDocumentSchema } from '../schemas/fleet.schema';
import { fieldErrors } from '../utils/format';
import { FieldRow, FormError } from './FieldRow';

/**
 * File one paper against a vehicle — insurance, PUC, fitness, permit.
 *
 * The expiry date is the only thing here that is compulsory, because it is
 * the only thing the register is really for.
 */
export function DocumentDialog({
  open,
  onOpenChange,
  options,
  vehicleId,
  document,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options?: FleetOptions;
  vehicleId: number;
  document?: VehicleDocument;
}) {
  const isEdit = !!document;
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const mutation = isEdit ? updateDocument : createDocument;

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleDocumentFormData>({
    resolver: zodResolver(vehicleDocumentSchema),
    defaultValues: { vehicle: vehicleId, doc_type: 'INSURANCE', expiry_date: '' },
  });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on open is the point
    setApiErrors({});
    setFile(null);
    reset(
      document
        ? {
            vehicle: document.vehicle,
            doc_type: document.doc_type,
            document_number: document.document_number,
            issuing_authority: document.issuing_authority,
            issue_date: document.issue_date ?? '',
            expiry_date: document.expiry_date,
            amount: document.amount ?? '',
            remarks: document.remarks,
          }
        : { vehicle: vehicleId, doc_type: 'INSURANCE', expiry_date: '' },
    );
  }, [open, document, vehicleId, reset]);

  const onSubmit = async (data: VehicleDocumentFormData) => {
    setApiErrors({});
    const payload: WritePayload = { ...data, file };
    try {
      if (isEdit && document) {
        await updateDocument.mutateAsync({ id: document.id, payload });
        toast.success('Document updated');
      } else {
        await createDocument.mutateAsync(payload);
        toast.success('Document filed');
      }
      onOpenChange(false);
    } catch (error) {
      setApiErrors(fieldErrors(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit document' : 'Add document'}</DialogTitle>
          <DialogDescription>Insurance, PUC, fitness, permit, road tax.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4">
          <DialogBody className="space-y-4">
            <FormError message={apiErrors.general} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow
                label="Document"
                htmlFor="doc_type"
                required
                error={errors.doc_type?.message || apiErrors.doc_type}
              >
                <NativeSelect id="doc_type" {...register('doc_type')}>
                  {(options?.document_kinds ?? []).map((choice) => (
                    <SelectOption key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </FieldRow>

              <FieldRow
                label="Expires on"
                htmlFor="expiry_date"
                required
                error={errors.expiry_date?.message || apiErrors.expiry_date}
              >
                <Input id="expiry_date" type="date" {...register('expiry_date')} />
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Number" htmlFor="document_number">
                <Input id="document_number" placeholder="Policy / certificate no." {...register('document_number')} />
              </FieldRow>
              <FieldRow label="Issued by" htmlFor="issuing_authority">
                <Input id="issuing_authority" placeholder="Insurer / RTO" {...register('issuing_authority')} />
              </FieldRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Issued on" htmlFor="issue_date" error={apiErrors.issue_date}>
                <Input id="issue_date" type="date" {...register('issue_date')} />
              </FieldRow>
              <FieldRow
                label="Premium / fee"
                htmlFor="document_amount"
                hint="Not counted as running cost"
                error={apiErrors.amount}
              >
                <Input
                  id="document_amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...register('amount')}
                />
              </FieldRow>
            </div>

            <FieldRow label="Scan or photo" htmlFor="document_file">
              <Input
                id="document_file"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </FieldRow>

            <FieldRow label="Remarks" htmlFor="document_remarks">
              <Input id="document_remarks" {...register('remarks')} />
            </FieldRow>
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
