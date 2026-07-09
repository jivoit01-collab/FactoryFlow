import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { returnableGatePassApi } from '../../api/returnableGatePass.api';
import {
  useCreateReturnableGatePass,
  useUpdateReturnableGatePass,
} from '../../api/returnableGatePass.queries';
import {
  CONDITION_OUT_OPTIONS,
  RETURNABLE_PURPOSE_OPTIONS,
} from '../../constants/returnable.constants';
import {
  type ReturnableGatePassFormValues,
  returnableGatePassSchema,
} from '../../schemas/returnable.schema';
import type { ReturnableGatePass, ReturnableGatePassPayload, StagedAttachment } from '../../types';
import { ReturnableAttachmentsField } from './ReturnableAttachmentsField';

interface ReturnableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. Only DRAFT passes are editable. */
  gatePass?: ReturnableGatePass | null;
  onSaved?: (passId: number) => void;
}

const EMPTY_LINE = {
  item_name: '',
  quantity_out: '1',
  uom: 'NOS',
  condition_out: 'FAULTY' as const,
  serial_no: '',
  make_model: '',
  estimated_value: '',
  remarks: '',
};

function toFormValues(gatePass?: ReturnableGatePass | null): ReturnableGatePassFormValues {
  if (!gatePass) {
    return {
      purpose: 'REPAIR',
      party_name: '',
      expected_return_date: '',
      items_input: [{ ...EMPTY_LINE }],
    } as ReturnableGatePassFormValues;
  }
  return {
    department: gatePass.department,
    requested_by_name: gatePass.requested_by_name,
    contact_no: gatePass.contact_no,
    purpose: gatePass.purpose,
    purpose_detail: gatePass.purpose_detail,
    party_name: gatePass.party_name,
    party_contact: gatePass.party_contact,
    party_address: gatePass.party_address,
    party_gstin: gatePass.party_gstin,
    expected_return_date: gatePass.expected_return_date,
    asset: gatePass.asset,
    work_order: gatePass.work_order,
    items_input: gatePass.items.map((item) => ({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      serial_no: item.serial_no,
      make_model: item.make_model,
      uom: item.uom,
      quantity_out: item.quantity_out,
      condition_out: item.condition_out,
      estimated_value: item.estimated_value ?? '',
      remarks: item.remarks,
    })),
  } as ReturnableGatePassFormValues;
}

export function ReturnableFormDialog({
  open,
  onOpenChange,
  gatePass,
  onSaved,
}: ReturnableFormDialogProps) {
  const isEdit = Boolean(gatePass);
  const createMutation = useCreateReturnableGatePass();
  const updateMutation = useUpdateReturnableGatePass();
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isPending = createMutation.isPending || updateMutation.isPending || isUploading;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReturnableGatePassFormValues>({
    resolver: zodResolver(returnableGatePassSchema),
    defaultValues: toFormValues(gatePass),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items_input' });

  useEffect(() => {
    if (open) {
      reset(toFormValues(gatePass));
      setAttachments([]);
    }
  }, [open, gatePass, reset]);

  const submit = handleSubmit(async (values) => {
    // Empty strings would fail the backend's decimal parsing; drop them instead.
    const payload: ReturnableGatePassPayload = {
      ...values,
      items_input: values.items_input.map((item) => ({
        ...item,
        estimated_value: item.estimated_value ? item.estimated_value : null,
      })),
    };

    let saved: ReturnableGatePass;
    try {
      saved = isEdit
        ? await updateMutation.mutateAsync({ passId: gatePass!.id, payload })
        : await createMutation.mutateAsync(payload);
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not save the gate pass.';
      toast.error(detail);
      return;
    }

    // Files can only be uploaded once the pass has an id. The pass itself is
    // already saved, so an upload failure is a warning, not a rollback.
    if (attachments.length) {
      setIsUploading(true);
      try {
        await returnableGatePassApi.uploadAttachments(saved.id, attachments);
      } catch {
        toast.warning(
          `${saved.pass_no} was saved, but some attachments failed to upload. Add them again from the pass.`,
        );
      } finally {
        setIsUploading(false);
      }
    }

    toast.success(isEdit ? `${saved.pass_no} updated` : `Gate pass ${saved.pass_no} created`);
    onOpenChange(false);
    onSaved?.(saved.id);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${gatePass!.pass_no}` : 'New Returnable Gate Pass'}</DialogTitle>
          <DialogDescription>
            Record what is leaving the factory, who it is going to, and when you expect it back.
            The gate fills in the vehicle details when the material actually leaves.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* --- Purpose and party ------------------------------------- */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <NativeSelect id="purpose" {...register('purpose')}>
                {RETURNABLE_PURPOSE_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_return_date">Expected Return Date</Label>
              <Input id="expected_return_date" type="date" {...register('expected_return_date')} />
              {errors.expected_return_date ? (
                <p className="text-sm text-destructive">{errors.expected_return_date.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_name">Party / Vendor Name</Label>
              <Input id="party_name" placeholder="Sharma Motors" {...register('party_name')} />
              {errors.party_name ? (
                <p className="text-sm text-destructive">{errors.party_name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_contact">Party Contact</Label>
              <Input id="party_contact" {...register('party_contact')} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="party_address">Party Address</Label>
              <Textarea id="party_address" rows={2} {...register('party_address')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_gstin">Party GSTIN</Label>
              <Input id="party_gstin" {...register('party_gstin')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_by_name">Requested By</Label>
              <Input id="requested_by_name" {...register('requested_by_name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_no">Contact No</Label>
              <Input id="contact_no" {...register('contact_no')} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="purpose_detail">Purpose Details</Label>
              <Textarea
                id="purpose_detail"
                rows={2}
                placeholder="Bearing seized, sending the gear motor for rewinding."
                {...register('purpose_detail')}
              />
            </div>
          </section>

          {/* --- Items -------------------------------------------------- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Items Going Out</h3>
                <p className="text-xs text-muted-foreground">
                  Quantities recorded here are what the gate will physically verify.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...EMPTY_LINE })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {errors.items_input?.message ? (
              <p className="text-sm text-destructive">{errors.items_input.message}</p>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Item Name</th>
                    <th className="px-3 py-2 text-left font-medium">Serial No</th>
                    <th className="px-3 py-2 text-left font-medium">Make / Model</th>
                    <th className="px-3 py-2 text-left font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">UOM</th>
                    <th className="px-3 py-2 text-left font-medium">Condition</th>
                    <th className="px-3 py-2 text-left font-medium">Est. Value</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="px-3 py-2">
                        <Input {...register(`items_input.${index}.item_name`)} />
                        {errors.items_input?.[index]?.item_name ? (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.items_input[index]?.item_name?.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <Input {...register(`items_input.${index}.serial_no`)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input {...register(`items_input.${index}.make_model`)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="w-24"
                          inputMode="decimal"
                          {...register(`items_input.${index}.quantity_out`)}
                        />
                        {errors.items_input?.[index]?.quantity_out ? (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.items_input[index]?.quantity_out?.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <Input className="w-20" {...register(`items_input.${index}.uom`)} />
                      </td>
                      <td className="px-3 py-2">
                        <NativeSelect {...register(`items_input.${index}.condition_out`)}>
                          {CONDITION_OUT_OPTIONS.map((option) => (
                            <SelectOption key={option.value} value={option.value}>
                              {option.label}
                            </SelectOption>
                          ))}
                        </NativeSelect>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="w-28"
                          inputMode="decimal"
                          {...register(`items_input.${index}.estimated_value`)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ReturnableAttachmentsField
            value={attachments}
            onChange={setAttachments}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isUploading
              ? 'Uploading attachments…'
              : isPending
                ? 'Saving…'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Gate Pass'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
