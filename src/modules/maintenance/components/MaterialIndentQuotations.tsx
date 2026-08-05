import {
  Award,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useCreateMaterialIndentQuotation,
  useDeleteMaterialIndentQuotation,
  useReturnMaterialIndentQuotations,
  useSelectMaterialIndentQuotation,
  useSubmitMaterialIndentQuotations,
  useUpdateMaterialIndentQuotation,
  useUploadMaterialIndentAttachment,
} from '../api/materialIndent.queries';
import type {
  MaterialIndent,
  MaterialIndentQuotation,
  MaterialIndentQuotationLineInput,
} from '../types';

interface MaterialIndentQuotationsProps {
  indent: MaterialIndent;
  /** Purchaser — raises and edits the company quotes. */
  canPurchase: boolean;
  /** Higher authority — picks the company, or sends the quotes back. */
  canApprove: boolean;
}

/** The two stages where the quote sheet is still the purchaser's to edit. */
const EDITABLE_STATUSES = ['APPROVED', 'PENDING_QUOTATION_SELECTION'] as const;

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function qty(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? '0' : String(n);
}

/**
 * The quotation round that sits between purchase approval and the actual buy:
 * the purchaser records what each company charges for the same items, the
 * approver compares them and picks one, and only then does the purchaser buy.
 */
export function MaterialIndentQuotations({
  indent,
  canPurchase,
  canApprove,
}: MaterialIndentQuotationsProps) {
  const createQuotation = useCreateMaterialIndentQuotation();
  const updateQuotation = useUpdateMaterialIndentQuotation();
  const deleteQuotation = useDeleteMaterialIndentQuotation();
  const submitQuotations = useSubmitMaterialIndentQuotations();
  const selectQuotation = useSelectMaterialIndentQuotation();
  const returnQuotations = useReturnMaterialIndentQuotations();
  const uploadAttachment = useUploadMaterialIndentAttachment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialIndentQuotation | null>(null);
  const [selectTarget, setSelectTarget] = useState<MaterialIndentQuotation | null>(null);
  const [selectRemarks, setSelectRemarks] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnError, setReturnError] = useState('');

  const quotations = useMemo(() => indent.quotations ?? [], [indent.quotations]);
  const isEditable =
    canPurchase &&
    (EDITABLE_STATUSES as readonly string[]).includes(indent.status);
  const awaitingSelection = indent.status === 'PENDING_QUOTATION_SELECTION';
  const decided = Boolean(indent.selected_quotation);

  // Only worth flagging a winner while there is still a choice to make.
  const cheapestId = useMemo(() => {
    if (quotations.length < 2) return null;
    return quotations.reduce((best, q) =>
      Number(q.total_amount) < Number(best.total_amount) ? q : best,
    ).id;
  }, [quotations]);

  const busy =
    createQuotation.isPending ||
    updateQuotation.isPending ||
    deleteQuotation.isPending ||
    submitQuotations.isPending ||
    selectQuotation.isPending ||
    returnQuotations.isPending;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (quotation: MaterialIndentQuotation) => {
    setEditing(quotation);
    setFormOpen(true);
  };

  const handleDelete = async (quotation: MaterialIndentQuotation) => {
    try {
      await deleteQuotation.mutateAsync(quotation.id);
      toast.success(`${quotation.company_name} removed`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not remove this quotation'));
    }
  };

  const handleAttach = async (quotation: MaterialIndentQuotation, file: File) => {
    try {
      await uploadAttachment.mutateAsync({
        indent: indent.id,
        quotation: quotation.id,
        file,
        doc_type: 'QUOTATION',
        title: `${quotation.company_name} quote`,
      });
      toast.success('Quote attached');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not attach that file'));
    }
  };

  const handleSubmit = async () => {
    try {
      await submitQuotations.mutateAsync(indent.id);
      toast.success('Sent for company selection');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send the quotations'));
    }
  };

  const confirmSelect = async () => {
    if (!selectTarget) return;
    try {
      await selectQuotation.mutateAsync({
        indentId: indent.id,
        payload: {
          quotation: selectTarget.id,
          quotation_remarks: selectRemarks.trim(),
        },
      });
      toast.success(`${selectTarget.company_name} selected — sent back to the purchaser`);
      setSelectTarget(null);
      setSelectRemarks('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this selection'));
    }
  };

  const confirmReturn = async () => {
    const trimmed = returnRemarks.trim();
    if (!trimmed) {
      setReturnError('Say what the purchaser should change.');
      return;
    }
    try {
      await returnQuotations.mutateAsync({
        indentId: indent.id,
        payload: { quotation_remarks: trimmed },
      });
      toast.success('Sent back to the purchaser');
      setReturnOpen(false);
      setReturnRemarks('');
      setReturnError('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send these back'));
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Company Quotations</p>
          <p className="text-xs text-muted-foreground">
            {decided
              ? `Buying from ${indent.selected_company_name}.`
              : awaitingSelection
                ? 'Waiting for the approver to pick a company.'
                : 'Record what each company charges for the same items.'}
          </p>
        </div>
        {isEditable && (
          <Button type="button" size="sm" variant="outline" onClick={openAdd} disabled={busy}>
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        )}
      </div>

      {indent.quotation_remarks && (
        <p className="rounded-md border bg-amber-50/60 p-2 text-sm">
          <span className="font-medium">Note from approver: </span>
          {indent.quotation_remarks}
        </p>
      )}

      {quotations.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {isEditable
            ? 'No quotations yet. Add each company that gave you a price.'
            : 'No quotations recorded.'}
        </p>
      ) : (
        <div className="space-y-3">
          {quotations.map((quotation) => (
            <QuotationCard
              key={quotation.id}
              quotation={quotation}
              isCheapest={quotation.id === cheapestId && !decided}
              isSelected={indent.selected_quotation === quotation.id}
              canEdit={isEditable}
              canSelect={canApprove && awaitingSelection}
              busy={busy}
              onEdit={() => openEdit(quotation)}
              onDelete={() => void handleDelete(quotation)}
              onSelect={() => {
                setSelectTarget(quotation);
                setSelectRemarks('');
              }}
              onAttach={(file) => handleAttach(quotation, file)}
              isAttaching={uploadAttachment.isPending}
            />
          ))}
        </div>
      )}

      {/* Purchaser hands the sheet over for a decision. */}
      {isEditable && indent.status === 'APPROVED' && quotations.length > 0 && (
        <Button type="button" className="w-full sm:w-auto" onClick={() => void handleSubmit()} disabled={busy}>
          {submitQuotations.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IndianRupee className="h-4 w-4" />
          )}
          Send for Company Selection
        </Button>
      )}

      {/* Approver can bounce the whole sheet back for better prices. */}
      {canApprove && awaitingSelection && (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setReturnOpen(true)}
          disabled={busy}
        >
          <Undo2 className="h-4 w-4" />
          Send Back for More Quotes
        </Button>
      )}

      <QuotationFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        indent={indent}
        quotation={editing}
        isSaving={createQuotation.isPending || updateQuotation.isPending}
        onOpenChange={setFormOpen}
        onSave={async (payload, lines) => {
          if (editing) {
            await updateQuotation.mutateAsync({
              quotationId: editing.id,
              payload: { ...payload, lines_input: lines },
            });
            toast.success(`${payload.company_name} updated`);
          } else {
            await createQuotation.mutateAsync({
              indent: indent.id,
              ...payload,
              lines_input: lines,
            });
            toast.success(`${payload.company_name} added`);
          }
          setFormOpen(false);
        }}
      />

      <Dialog
        open={Boolean(selectTarget)}
        onOpenChange={(open) => (!open ? setSelectTarget(null) : null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-base sm:text-lg">
              Buy from {selectTarget?.company_name}?
            </DialogTitle>
            <DialogDescription className="text-left">
              The indent goes back to the purchaser to place the order with this company at{' '}
              {money(selectTarget?.total_amount)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quotation-select-remarks">Reason (optional)</Label>
            <Textarea
              id="quotation-select-remarks"
              value={selectRemarks}
              onChange={(event) => setSelectRemarks(event.target.value)}
              placeholder="e.g. lowest total, or fastest delivery"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSelectTarget(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void confirmSelect()}
              disabled={busy}
            >
              {selectQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Select Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-base sm:text-lg">
              Send Quotations Back
            </DialogTitle>
            <DialogDescription className="text-left">
              The purchaser can edit these and add more companies, then resend. The purchase
              approval itself still stands.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quotation-return-remarks">What should change?</Label>
            <Textarea
              id="quotation-return-remarks"
              value={returnRemarks}
              onChange={(event) => {
                setReturnRemarks(event.target.value);
                setReturnError('');
              }}
              placeholder="e.g. get one more quote, prices look high"
            />
            {returnError ? <p className="text-sm text-destructive">{returnError}</p> : null}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setReturnOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => void confirmReturn()}
              disabled={busy}
            >
              {returnQuotations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuotationCardProps {
  quotation: MaterialIndentQuotation;
  isCheapest: boolean;
  isSelected: boolean;
  canEdit: boolean;
  canSelect: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onAttach: (file: File) => Promise<void>;
  isAttaching: boolean;
}

function QuotationCard({
  quotation,
  isCheapest,
  isSelected,
  canEdit,
  canSelect,
  busy,
  onEdit,
  onDelete,
  onSelect,
  onAttach,
  isAttaching,
}: QuotationCardProps) {
  const fileInputId = `quotation-file-${quotation.id}`;
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        isSelected && 'border-emerald-300 bg-emerald-50/50',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{quotation.company_name}</span>
            {isSelected && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Selected
              </Badge>
            )}
            {isCheapest && !isSelected && (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                <Award className="mr-1 h-3 w-3" />
                Lowest
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {[
              quotation.contact_person,
              quotation.contact_no,
              quotation.quotation_no && `Quote ${quotation.quotation_no}`,
              quotation.delivery_days != null && `${quotation.delivery_days} day delivery`,
              quotation.payment_terms,
            ]
              .filter(Boolean)
              .join(' · ') || 'No contact details'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">{money(quotation.total_amount)}</div>
          {Number(quotation.other_charges) > 0 && (
            <div className="text-xs text-muted-foreground">
              incl. {money(quotation.other_charges)} charges
            </div>
          )}
        </div>
      </div>

      {quotation.lines.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-md bg-muted/40">
          <table className="w-full text-sm">
            <tbody>
              {quotation.lines.map((line) => (
                <tr key={line.id} className="border-b last:border-b-0">
                  <td className="p-2">
                    <div className="break-words">{line.item_particulars}</div>
                    {line.remarks && (
                      <div className="text-xs text-muted-foreground">{line.remarks}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right text-muted-foreground">
                    {qty(line.quantity)} {line.item_unit} × {money(line.unit_price)}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right font-medium tabular-nums">
                    {money(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quotation.remarks && (
        <p className="mt-2 break-words text-xs text-muted-foreground">{quotation.remarks}</p>
      )}

      {/* The written quote itself — proof behind the numbers. */}
      {(quotation.attachments.length > 0 || canEdit) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {quotation.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.file}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              <Paperclip className="h-3 w-3" />
              {attachment.title || 'Quote file'}
            </a>
          ))}
          {canEdit && (
            <>
              <input
                id={fileInputId}
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void onAttach(file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={busy || isAttaching}
                onClick={() => document.getElementById(fileInputId)?.click()}
              >
                {isAttaching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Paperclip className="h-3 w-3" />
                )}
                Attach quote
              </Button>
            </>
          )}
        </div>
      )}

      {(canEdit || canSelect) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canSelect && (
            <Button type="button" size="sm" className="h-10 flex-1 sm:h-9 sm:flex-none" onClick={onSelect} disabled={busy}>
              <CheckCircle2 className="h-4 w-4" />
              Select
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 flex-1 sm:h-9 sm:flex-none"
                onClick={onEdit}
                disabled={busy}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 flex-1 border-red-200 text-red-700 hover:bg-red-50 sm:h-9 sm:flex-none"
                onClick={onDelete}
                disabled={busy || isSelected}
                title={isSelected ? 'The selected company cannot be removed' : undefined}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface QuotationFormValues {
  company_name: string;
  contact_person: string;
  contact_no: string;
  quotation_no: string;
  delivery_days: string;
  payment_terms: string;
  other_charges: string;
  remarks: string;
}

interface QuotationFormDialogProps {
  open: boolean;
  indent: MaterialIndent;
  quotation: MaterialIndentQuotation | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    values: {
      company_name: string;
      contact_person: string;
      contact_no: string;
      quotation_no: string;
      delivery_days: number | null;
      payment_terms: string;
      other_charges: string;
      remarks: string;
    },
    lines: MaterialIndentQuotationLineInput[],
  ) => Promise<void>;
}

/**
 * One company's price sheet. Every item still to be bought gets a row, so the
 * approver can compare the same list across companies line for line.
 */
function QuotationFormDialog({
  open,
  indent,
  quotation,
  isSaving,
  onOpenChange,
  onSave,
}: QuotationFormDialogProps) {
  // Only what actually has to be purchased is quotable; anything the store
  // issued from stock is already handled.
  const items = useMemo(
    () => indent.items.filter((item) => Number(item.shortfall_quantity) > 0 || !item.issued_quantity),
    [indent.items],
  );

  const [values, setValues] = useState<QuotationFormValues>(() => ({
    company_name: quotation?.company_name ?? '',
    contact_person: quotation?.contact_person ?? '',
    contact_no: quotation?.contact_no ?? '',
    quotation_no: quotation?.quotation_no ?? '',
    delivery_days: quotation?.delivery_days != null ? String(quotation.delivery_days) : '',
    payment_terms: quotation?.payment_terms ?? '',
    other_charges: quotation?.other_charges ?? '',
    remarks: quotation?.remarks ?? '',
  }));

  const [rates, setRates] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (quotation?.lines ?? []).map((line) => [line.item, String(Number(line.unit_price))]),
    ),
  );
  const [error, setError] = useState('');

  const total = useMemo(() => {
    const lineSum = items.reduce((sum, item) => {
      const rate = Number(rates[item.id] ?? 0);
      const quantity = Number(item.shortfall_quantity || item.quantity);
      return sum + (Number.isNaN(rate) ? 0 : rate * quantity);
    }, 0);
    const charges = Number(values.other_charges || 0);
    return lineSum + (Number.isNaN(charges) ? 0 : charges);
  }, [items, rates, values.other_charges]);

  const set = (field: keyof QuotationFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const submit = async () => {
    if (!values.company_name.trim()) {
      setError('Enter the company name.');
      return;
    }
    const lines: MaterialIndentQuotationLineInput[] = items
      .filter((item) => (rates[item.id] ?? '').trim() !== '')
      .map((item) => ({ item: item.id, unit_price: String(Number(rates[item.id])) }));
    if (lines.length === 0) {
      setError('Enter a rate for at least one item.');
      return;
    }
    try {
      await onSave(
        {
          company_name: values.company_name.trim(),
          contact_person: values.contact_person.trim(),
          contact_no: values.contact_no.trim(),
          quotation_no: values.quotation_no.trim(),
          delivery_days: values.delivery_days ? Number(values.delivery_days) : null,
          payment_terms: values.payment_terms.trim(),
          other_charges: values.other_charges ? String(Number(values.other_charges)) : '0',
          remarks: values.remarks.trim(),
        },
        lines,
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Could not save this quotation'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left text-base sm:text-lg">
            {quotation ? `Edit ${quotation.company_name}` : 'Add Company Quotation'}
          </DialogTitle>
          <DialogDescription className="text-left">
            Enter this company's rate for each item. The total is worked out for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Company name *</Label>
              <Input
                value={values.company_name}
                onChange={(event) => set('company_name', event.target.value)}
                placeholder="e.g. Sagar Traders"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact person</Label>
              <Input
                value={values.contact_person}
                onChange={(event) => set('contact_person', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact number</Label>
              <Input
                value={values.contact_no}
                onChange={(event) => set('contact_no', event.target.value)}
                inputMode="tel"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quotation no.</Label>
              <Input
                value={values.quotation_no}
                onChange={(event) => set('quotation_no', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivery (days)</Label>
              <Input
                value={values.delivery_days}
                onChange={(event) => set('delivery_days', event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment terms</Label>
              <Input
                value={values.payment_terms}
                onChange={(event) => set('payment_terms', event.target.value)}
                placeholder="e.g. 30 days credit"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="border-b bg-muted/50 p-2 text-sm font-medium">Rate per item</div>
            <div className="divide-y">
              {items.map((item) => {
                const quantity = Number(item.shortfall_quantity || item.quantity);
                const rate = Number(rates[item.id] ?? 0);
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm">{item.particulars}</div>
                      <div className="text-xs text-muted-foreground">
                        {qty(quantity)} {item.unit}
                        {item.specification ? ` · ${item.specification}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-28"
                        value={rates[item.id] ?? ''}
                        onChange={(event) => {
                          setRates((prev) => ({ ...prev, [item.id]: event.target.value }));
                          setError('');
                        }}
                        placeholder="Rate"
                        inputMode="decimal"
                      />
                      <span className="w-24 text-right text-sm tabular-nums text-muted-foreground">
                        {money(Number.isNaN(rate) ? 0 : rate * quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Nothing on this indent needs purchasing.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Freight / other charges</Label>
              <Input
                value={values.other_charges}
                onChange={(event) => set('other_charges', event.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <Input
                value={values.remarks}
                onChange={(event) => set('remarks', event.target.value)}
                placeholder="Anything worth knowing about this offer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void submit()}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {quotation ? 'Save Changes' : 'Add Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
