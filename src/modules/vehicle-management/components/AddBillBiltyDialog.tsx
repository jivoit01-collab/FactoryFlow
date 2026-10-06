import { Loader2, PackagePlus } from 'lucide-react';
import { useState } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
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

/** A bilty already on the truck for the same consignee, offered for the new bill. */
export interface TruckBiltySuggestion {
  bilty_no: string;
  bilty_date: string;
  /** The bill on the truck that carries it. */
  docNum: string;
}

export interface AddBillBiltyTarget {
  bill: DispatchBill;
  vehicleNo: string;
  suggestion: TruckBiltySuggestion | null;
}

export interface AddedBilty {
  bilty_no: string;
  bilty_date: string;
}

interface AddBillBiltyDialogProps {
  target: AddBillBiltyTarget | null;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (bilty: AddedBilty) => void;
}

/**
 * The consignee's bilty, asked for as a bill joins a truck that is already inside.
 *
 * Linking will not take a truck without each consignee's bilty number and date.
 * Add Bill, Add other bill and Attach used to skip that, so a bill could go on
 * a truck with no LR. Its bill summary then went to the warehouse with no bilty
 * and was sent straight back. The server refuses that now, and this is where
 * the desk gives the bilty instead.
 *
 * Prefilled from the bill's own plan, else from the same consignee's bill
 * already on this truck. Linking puts one LR on all of a consignee's bills on a
 * truck, but a new bill can still have its own, so the suggestion is shown as a
 * suggestion and can be changed.
 */
export function AddBillBiltyDialog({
  target,
  isSaving,
  onCancel,
  onConfirm,
}: AddBillBiltyDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-w-md">
        {target && (
          // Keyed so each bill opens on its own bilty, not the last one typed.
          <BiltyForm
            key={`${target.bill.company_code ?? ''}-${target.bill.doc_entry}`}
            target={target}
            isSaving={isSaving}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BiltyForm({
  target,
  isSaving,
  onCancel,
  onConfirm,
}: AddBillBiltyDialogProps & { target: AddBillBiltyTarget }) {
  const { bill, vehicleNo, suggestion } = target;
  const planNo = bill.plan.bilty_no?.trim() ?? '';
  const fromPlan = planNo !== '';
  const [bilty, setBilty] = useState<AddedBilty>(() =>
    fromPlan
      ? { bilty_no: planNo, bilty_date: bill.plan.bilty_date?.slice(0, 10) ?? '' }
      : {
          bilty_no: suggestion?.bilty_no ?? '',
          bilty_date: suggestion?.bilty_date ?? '',
        },
  );
  const ready = bilty.bilty_no.trim() !== '' && bilty.bilty_date !== '';
  const suggested =
    !fromPlan &&
    suggestion !== null &&
    bilty.bilty_no.trim() === suggestion.bilty_no &&
    bilty.bilty_date === suggestion.bilty_date;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !isSaving) {
          onConfirm({ bilty_no: bilty.bilty_no.trim(), bilty_date: bilty.bilty_date });
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Bilty for {bill.doc_num}</DialogTitle>
        <DialogDescription>
          {[bill.card_name, vehicleNo].filter(Boolean).join(' · ')}. Every bill on a truck needs its
          consignee&apos;s bilty, as at linking. Without it, the warehouse sends its bill summary
          back.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 py-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="add-bill-bilty-no">Bilty number</Label>
          <Input
            id="add-bill-bilty-no"
            value={bilty.bilty_no}
            placeholder="NCR-4494"
            autoFocus
            onChange={(event) => setBilty({ ...bilty, bilty_no: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-bill-bilty-date">Bilty date</Label>
          <Input
            id="add-bill-bilty-date"
            type="date"
            value={bilty.bilty_date}
            onChange={(event) => setBilty({ ...bilty, bilty_date: event.target.value })}
          />
        </div>
        {(fromPlan || suggested) && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {fromPlan
              ? 'The bilty already on this bill’s dispatch plan.'
              : `The same LR as bill ${suggestion?.docNum}, already on this truck for this customer. Change it if this bill has its own.`}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PackagePlus className="mr-2 h-4 w-4" />
          )}
          Add bill
        </Button>
      </DialogFooter>
    </form>
  );
}
