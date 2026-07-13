import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Paperclip, Plus, Trash2, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  Button,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
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
import { SapItemSelect } from './SapItemSelect';

interface ReturnableFormProps {
  /** Present when editing. Only DRAFT passes are editable. */
  gatePass?: ReturnableGatePass | null;
  /** Called with the saved pass id — the page navigates to its detail view. */
  onSaved: (passId: number) => void;
  onCancel: () => void;
}

const EMPTY_LINE = {
  item_code: '',
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
      is_returnable: true,
      purpose: 'REPAIR',
      party_name: '',
      recipient_name: '',
      issued_by_name: '',
      expected_return_date: '',
      items_input: [{ ...EMPTY_LINE }],
    } as ReturnableGatePassFormValues;
  }
  return {
    is_returnable: gatePass.is_returnable,
    department: gatePass.department,
    requested_by_name: gatePass.requested_by_name,
    contact_no: gatePass.contact_no,
    purpose: gatePass.purpose,
    purpose_detail: gatePass.purpose_detail,
    party_name: gatePass.party_name,
    party_contact: gatePass.party_contact,
    party_address: gatePass.party_address,
    party_gstin: gatePass.party_gstin,
    recipient_name: gatePass.recipient_name,
    recipient_contact: gatePass.recipient_contact,
    recipient_department: gatePass.recipient_department,
    issued_by_name: gatePass.issued_by_name,
    expected_return_date: gatePass.expected_return_date ?? '',
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

/** A numbered form section with a heading and an optional hint line. */
function Section({
  step,
  title,
  hint,
  action,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-start justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {step}
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-6">{title}</h2>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </section>
  );
}

/** Label + control + inline error, in one consistent block. */
function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ReturnableForm({ gatePass, onSaved, onCancel }: ReturnableFormProps) {
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturnableGatePassFormValues>({
    resolver: zodResolver(returnableGatePassSchema),
    defaultValues: toFormValues(gatePass),
  });

  const isReturnable = watch('is_returnable');
  const { fields, append, remove } = useFieldArray({ control, name: 'items_input' });

  // Re-seed once the pass being edited actually arrives from the server.
  useEffect(() => {
    reset(toFormValues(gatePass));
    setAttachments([]);
  }, [gatePass, reset]);

  const submit = handleSubmit(async (values) => {
    const payload: ReturnableGatePassPayload = {
      ...values,
      // Never send the half of the form the user could not see.
      expected_return_date: values.is_returnable ? values.expected_return_date : null,
      recipient_name: values.is_returnable ? '' : values.recipient_name,
      recipient_contact: values.is_returnable ? '' : values.recipient_contact,
      recipient_department: values.is_returnable ? '' : values.recipient_department,
      issued_by_name: values.is_returnable ? '' : values.issued_by_name,
      requested_by_name: values.is_returnable ? values.requested_by_name : '',
      contact_no: values.is_returnable ? values.contact_no : '',
      items_input: values.items_input.map((item) => ({
        ...item,
        // Empty strings fail the backend's decimal parsing.
        estimated_value: item.estimated_value ? item.estimated_value : null,
        // Non-returnable lines hide serial, make/model, condition and value.
        // Send neutral values — "FAULTY" would misdescribe stock being issued.
        ...(values.is_returnable
          ? {}
          : { serial_no: '', make_model: '', condition_out: 'NEW' as const, estimated_value: null }),
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

    // Files need the pass id, so they upload after the save. The pass is already
    // stored — a failed upload is a warning, not a rollback.
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
    onSaved(saved.id);
  });

  const saveLabel = isUploading
    ? 'Uploading attachments…'
    : isPending
      ? 'Saving…'
      : isEdit
        ? 'Save Changes'
        : 'Create Gate Pass';

  return (
    <form
      className="space-y-5 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {/* 1 — what kind of pass is this */}
      <Section
        step={1}
        title="Pass Type"
        hint={
          isReturnable
            ? 'The material is expected back by a date and is tracked until every item returns.'
            : 'The material is issued to a person and never comes back. The pass closes at gate out.'
        }
        action={
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium ${isReturnable ? 'text-muted-foreground' : 'text-orange-700'}`}
            >
              {isReturnable ? 'Returnable' : 'Non-returnable'}
            </span>
            <Switch
              id="is_returnable"
              checked={isReturnable}
              disabled={isEdit}
              onChange={(checked) => setValue('is_returnable', checked, { shouldValidate: true })}
            />
          </div>
        }
      >
        {isEdit ? (
          <p className="text-xs text-amber-700">
            The type is fixed once created — {gatePass!.pass_no} already carries its number series.
            To change it, cancel this pass and raise a new one.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Switch this off for material that will never return: samples, scrap, or stock issued to
            a person.
          </p>
        )}
      </Section>

      {/* 2 — where it goes and when (or who receives it) */}
      <Section
        step={2}
        title={isReturnable ? 'Party & Return' : 'Recipient'}
        hint={
          isReturnable
            ? 'Who the material goes to, and the date it must be back by.'
            : 'The person receiving the material, and where it is going.'
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="purpose" label="Purpose">
            <NativeSelect id="purpose" {...register('purpose')}>
              {RETURNABLE_PURPOSE_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value}>
                  {option.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </Field>

          {isReturnable ? (
            <>
              <Field
                id="expected_return_date"
                label="Expected Return Date"
                error={errors.expected_return_date?.message}
              >
                <Input id="expected_return_date" type="date" {...register('expected_return_date')} />
              </Field>

              <Field id="party_name" label="Party / Vendor Name" error={errors.party_name?.message}>
                <Input id="party_name" placeholder="Sharma Motors" {...register('party_name')} />
              </Field>

              <Field id="party_contact" label="Party Contact">
                <Input id="party_contact" {...register('party_contact')} />
              </Field>

              <Field id="party_gstin" label="Party GSTIN">
                <Input id="party_gstin" {...register('party_gstin')} />
              </Field>

              <Field id="party_address" label="Party Address" className="lg:col-span-3">
                <Textarea id="party_address" rows={2} {...register('party_address')} />
              </Field>

              <Field id="requested_by_name" label="Requested By">
                <Input id="requested_by_name" {...register('requested_by_name')} />
              </Field>

              <Field id="contact_no" label="Contact No">
                <Input id="contact_no" {...register('contact_no')} />
              </Field>
            </>
          ) : (
            <>
              <Field
                id="recipient_name"
                label="Issued To (Person)"
                error={errors.recipient_name?.message}
              >
                <div className="relative">
                  <User className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recipient_name"
                    className="pl-8"
                    placeholder="Suresh Patel"
                    {...register('recipient_name')}
                  />
                </div>
              </Field>

              <Field id="recipient_contact" label="Recipient Contact">
                <Input id="recipient_contact" {...register('recipient_contact')} />
              </Field>

              <Field id="recipient_department" label="Recipient Department">
                <Input
                  id="recipient_department"
                  placeholder="Production"
                  {...register('recipient_department')}
                />
              </Field>

              {/* Nobody is "requesting" material back on a non-returnable pass —
                  it is issued. So this replaces Requested By and Contact No. */}
              <Field id="issued_by_name" label="Issued By">
                <Input
                  id="issued_by_name"
                  placeholder="Storekeeper's name"
                  {...register('issued_by_name')}
                />
              </Field>

              <Field id="party_name" label="Destination / Firm (optional)">
                <Input id="party_name" {...register('party_name')} />
              </Field>
            </>
          )}

          <Field id="purpose_detail" label="Purpose Details" className="sm:col-span-2 lg:col-span-3">
            <Textarea
              id="purpose_detail"
              rows={2}
              placeholder="Bearing seized, sending the gear motor for rewinding."
              {...register('purpose_detail')}
            />
          </Field>
        </div>
      </Section>

      {/* 3 — the items. Cards, not a table: a scrolling table clips the SAP
             search dropdown, because overflow-x:auto forces overflow-y:auto. */}
      <Section
        step={3}
        title={isReturnable ? 'Items Going Out' : 'Items Being Issued'}
        hint={
          isReturnable
            ? 'Search the SAP item master, or type an item that has no SAP code.'
            : 'Pick each item from the SAP item master and enter how much is being issued.'
        }
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_LINE })}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        }
      >
        {errors.items_input?.message ? (
          <p className="mb-3 text-sm text-destructive">{errors.items_input.message}</p>
        ) : null}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-md border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Item {index + 1}
                </span>
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
              </div>

              <div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <SapItemSelect
                    inputId={`sap-item-${index}`}
                    label="SAP Item"
                    defaultDisplayText={watch(`items_input.${index}.item_name`) || undefined}
                    onSelect={(item) => {
                      setValue(`items_input.${index}.item_code`, item.item_code);
                      setValue(`items_input.${index}.item_name`, item.item_name, {
                        shouldValidate: true,
                      });
                      if (item.uom) setValue(`items_input.${index}.uom`, item.uom);
                    }}
                    onClear={() => {
                      setValue(`items_input.${index}.item_code`, '');
                      setValue(`items_input.${index}.item_name`, '');
                      // Don't leave the previous item's unit behind.
                      setValue(`items_input.${index}.uom`, 'NOS');
                    }}
                  />
                </div>

                <Field
                  id={`item-name-${index}`}
                  label="Item Name"
                  className={isReturnable ? 'sm:col-span-2' : 'sm:col-span-3'}
                  error={errors.items_input?.[index]?.item_name?.message}
                >
                  <Input
                    id={`item-name-${index}`}
                    {...register(`items_input.${index}.item_name`)}
                  />
                </Field>

                <Field
                  label="SAP Code"
                  className={isReturnable ? 'sm:col-span-1' : 'sm:col-span-2'}
                >
                  <p className="truncate pt-2 font-mono text-xs text-muted-foreground">
                    {watch(`items_input.${index}.item_code`) || '—'}
                  </p>
                </Field>

                {/* UOM comes from the SAP item master. Read-only — the unit is a
                    property of the item, not a choice the clerk makes. */}
                {!isReturnable ? (
                  <Field id={`uom-${index}`} label="UOM" className="sm:col-span-2">
                    <Input
                      id={`uom-${index}`}
                      readOnly
                      placeholder="From SAP"
                      className="bg-muted/40"
                      {...register(`items_input.${index}.uom`)}
                    />
                  </Field>
                ) : null}

                <Field
                  id={`qty-${index}`}
                  label="Quantity"
                  className="sm:col-span-2"
                  error={errors.items_input?.[index]?.quantity_out?.message}
                >
                  <Input
                    id={`qty-${index}`}
                    inputMode="decimal"
                    {...register(`items_input.${index}.quantity_out`)}
                  />
                </Field>

                {isReturnable ? (
                  <>
                    <Field id={`serial-${index}`} label="Serial No" className="sm:col-span-2">
                      <Input id={`serial-${index}`} {...register(`items_input.${index}.serial_no`)} />
                    </Field>

                    <Field id={`model-${index}`} label="Make / Model" className="sm:col-span-2">
                      <Input id={`model-${index}`} {...register(`items_input.${index}.make_model`)} />
                    </Field>

                    <Field id={`uom-${index}`} label="UOM" className="sm:col-span-2">
                      <Input id={`uom-${index}`} {...register(`items_input.${index}.uom`)} />
                    </Field>

                    <Field id={`condition-${index}`} label="Condition Out" className="sm:col-span-2">
                      <NativeSelect
                        id={`condition-${index}`}
                        {...register(`items_input.${index}.condition_out`)}
                      >
                        {CONDITION_OUT_OPTIONS.map((option) => (
                          <SelectOption key={option.value} value={option.value}>
                            {option.label}
                          </SelectOption>
                        ))}
                      </NativeSelect>
                    </Field>

                    <Field
                      id={`value-${index}`}
                      label="Estimated Value"
                      className="sm:col-span-2"
                    >
                      <Input
                        id={`value-${index}`}
                        inputMode="decimal"
                        {...register(`items_input.${index}.estimated_value`)}
                      />
                    </Field>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — supporting documents */}
      <Section
        step={4}
        title="Attachments"
        hint="Delivery challan, photos of the item before it leaves, vendor quotation."
        action={<Paperclip className="h-4 w-4 text-muted-foreground" />}
      >
        <ReturnableAttachmentsField
          value={attachments}
          onChange={setAttachments}
          disabled={isPending}
        />
      </Section>

      {/* The form is tall — keep the actions reachable without scrolling back. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {isReturnable ? 'Returnable gate pass' : 'Non-returnable gate pass'} ·{' '}
            {fields.length} item{fields.length === 1 ? '' : 's'}
          </p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
