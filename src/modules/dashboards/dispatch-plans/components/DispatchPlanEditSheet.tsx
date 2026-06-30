import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';

import type { DispatchBill, DispatchPlanUpdatePayload } from '../types';
import { StatusBadge } from './StatusBadge';

interface DispatchPlanEditSheetProps {
  bill: DispatchBill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (docEntry: number, payload: DispatchPlanUpdatePayload) => Promise<void>;
  isSaving: boolean;
}

interface FormState {
  dispatch_date: string;
  priority: string;
  location: string;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  dispatch_date: '',
  priority: '',
  location: '',
  remarks: '',
};

function formFromBill(bill: DispatchBill | null): FormState {
  if (!bill) return EMPTY_FORM;

  return {
    dispatch_date: bill.plan.dispatch_date ?? '',
    priority: bill.plan.priority ?? '',
    location: bill.plan.location ?? '',
    remarks: bill.plan.remarks ?? '',
  };
}

function stringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatLitres(value: number | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '-';
  return `${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
}

function locationText(bill: DispatchBill): string {
  return (
    [bill.city, bill.state]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ') || '-'
  );
}

export function DispatchPlanEditSheet({
  bill,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: DispatchPlanEditSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFromBill(bill));

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet form must follow the selected bill.
    setForm(formFromBill(bill));
  }, [bill, open]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill) return;

    await onSave(bill.doc_entry, {
      sap_invoice_doc_num: bill.doc_num,
      dispatch_date: stringOrNull(form.dispatch_date),
      priority: form.priority.trim(),
      location: form.location.trim(),
      remarks: form.remarks.trim(),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Dispatch Plan</SheetTitle>
          {bill && (
            <div className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{bill.doc_num}</span>
              <span className="mx-2">-</span>
              <span>{bill.card_name}</span>
            </div>
          )}
        </SheetHeader>

        {bill && (
          <div className="mt-4 grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Transport Status</div>
              <div className="mt-1">
                <StatusBadge status={bill.plan.booking_status} />
              </div>
            </div>
            <InfoItem label="Linked Vehicle" value={bill.plan.vehicle_no} />
            <InfoItem label="Driver" value={bill.plan.driver_name} />
            <InfoItem
              label="Transporter"
              value={bill.plan.transporter_name || bill.sap_transporter_name}
            />
            <InfoItem label="SAP Location" value={locationText(bill)} />
            <InfoItem label="Total Litres" value={formatLitres(bill.total_litres)} />
          </div>
        )}

        <form className="mt-4 flex flex-1 flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-date">Dispatch Date</Label>
              <Input
                id="dispatch-date"
                type="date"
                value={form.dispatch_date}
                onChange={(event) => updateField('dispatch_date', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-priority">Priority</Label>
              <Input
                id="dispatch-priority"
                value={form.priority}
                onChange={(event) => updateField('priority', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispatch-location">Location</Label>
            <Input
              id="dispatch-location"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Delivery location"
            />
            <p className="text-xs text-muted-foreground">
              Planning-entered location, shown alongside the read-only SAP location.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispatch-remarks">Planning Remarks</Label>
            <Textarea
              id="dispatch-remarks"
              rows={4}
              value={form.remarks}
              onChange={(event) => updateField('remarks', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If the Total Litres above looks wrong, note the correct litres here.
            </p>
          </div>

          <SheetFooter className="mt-auto border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{compactText(value)}</div>
    </div>
  );
}
