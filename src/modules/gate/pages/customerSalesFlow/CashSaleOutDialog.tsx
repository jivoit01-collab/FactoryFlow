import { AlertTriangle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type CashSalePendingBill,
  useCashSalePendingBills,
  useCreateCashSaleOut,
} from '@/modules/gate/api';
import { SearchableSelect } from '@/shared/components';
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
  Textarea,
} from '@/shared/components/ui';
import { formatCurrency, getErrorMessage } from '@/shared/utils';

/**
 * Marks counter (cash-sale) bills out with whoever is carrying them. These never
 * reach Docking -- no truck is booked for them -- so this is the only way the
 * gate records them leaving.
 */
export function CashSaleOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cash sale out</DialogTitle>
          <DialogDescription>
            Add every bill the person is carrying and say who is taking them out.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from a clean form. */}
        {open ? <CashSaleOutForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function billKey(bill: CashSalePendingBill) {
  return `${bill.company_id}:${bill.doc_entry}`;
}

function billLabel(bill: CashSalePendingBill) {
  return `${bill.doc_num ?? bill.doc_entry} · ${bill.customer_ref || bill.customer_name}`;
}

function billMatches(bill: CashSalePendingBill, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    bill.doc_num,
    bill.customer_name,
    bill.customer_ref,
    bill.comments,
    bill.item_summary,
    bill.company_name,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function CashSaleOutForm({ onDone }: { onDone: () => void }) {
  const { data, isLoading, isError } = useCashSalePendingBills();
  const createOut = useCreateCashSaleOut();
  const [picked, setPicked] = useState<CashSalePendingBill[]>([]);
  const [takenByName, setTakenByName] = useState('');
  const [takenByMobile, setTakenByMobile] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // One entry is one company's bills: each company's book is its own SAP. So
  // once a bill is added, only that company's other bills are offered.
  const company = picked[0] ?? null;
  const available = useMemo(() => {
    const pickedKeys = new Set(picked.map(billKey));
    return (data?.bills ?? []).filter(
      (bill) =>
        !pickedKeys.has(billKey(bill)) && (!company || bill.company_id === company.company_id),
    );
  }, [data?.bills, picked, company]);
  const otherCompanyWaiting =
    company !== null && (data?.bills ?? []).some((bill) => bill.company_id !== company.company_id);
  const total = picked.reduce((sum, bill) => sum + (bill.doc_total ?? 0), 0);

  const canSave = picked.length > 0 && takenByName.trim() !== '' && !createOut.isPending;

  const handleSave = async () => {
    if (!canSave || !company) return;
    try {
      const entry = await createOut.mutateAsync({
        company_id: company.company_id,
        doc_entries: picked.map((bill) => bill.doc_entry),
        taken_by_name: takenByName.trim(),
        taken_by_mobile: takenByMobile.trim(),
        vehicle_no: vehicleNo.trim(),
        remarks: remarks.trim(),
      });
      toast.success(`${entry.entry_no}: marked out with ${entry.taken_by_name}`);
      onDone();
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Could not mark the bills out'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchableSelect<CashSalePendingBill>
          // Remounted after every add, so the box is empty for the next bill
          // instead of holding the one just added.
          key={picked.length}
          inputId="cash-out-bill"
          label={picked.length ? 'Add another bill' : 'Bills'}
          required={picked.length === 0}
          items={available}
          isLoading={isLoading}
          isError={isError}
          getItemKey={billKey}
          getItemLabel={billLabel}
          filterFn={billMatches}
          renderItem={(item) => (
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">
                  {item.doc_num ?? item.doc_entry}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {item.doc_date} · {item.company_name}
                  </span>
                </span>
                {item.doc_total !== null ? (
                  <span className="text-xs tabular-nums">{formatCurrency(item.doc_total)}</span>
                ) : null}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {item.customer_ref ? `${item.customer_ref} · ` : ''}
                {item.item_summary || item.customer_name}
              </div>
            </div>
          )}
          placeholder="Search bill no., name, item"
          loadingText="Reading cash-sale bills from SAP..."
          emptyText={
            company
              ? `No other ${company.company_name} bill is waiting to go out`
              : 'No cash-sale bill is waiting to go out'
          }
          notFoundText="No bill matches this search"
          errorText="Could not load the cash-sale bills. Please try again."
          onItemSelect={(bill) => setPicked((current) => [...current, bill])}
          onClear={() => {}}
        />
        {data ? (
          <p className="text-xs text-muted-foreground">
            Cash sales billed {data.date_from} to {data.date_to} that have not gone out yet.
            {data.truncated
              ? ' The week holds more bills than fit, so the oldest are left out.'
              : ''}
            {otherCompanyWaiting
              ? ` Only ${company?.company_name} bills can go on this entry; mark another company's bill out separately.`
              : ''}
          </p>
        ) : null}

        {data?.errors.map((failure) => (
          <p
            key={failure.company_code}
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Could not read {failure.company_name}&apos;s bills from SAP, so they are missing here.
            Try again in a moment.
          </p>
        ))}

        {/* What the guard checks the goods against before letting them go. */}
        {picked.length > 0 ? (
          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
              <span className="font-medium">
                {picked.length === 1 ? '1 bill' : `${picked.length} bills`}
              </span>
              <span className="tabular-nums text-muted-foreground">{formatCurrency(total)}</span>
            </div>
            <ul className="divide-y">
              {picked.map((bill) => (
                <li key={billKey(bill)} className="flex items-start gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">
                        {bill.doc_num ?? bill.doc_entry}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {bill.doc_date} · {bill.company_name}
                        </span>
                      </span>
                      {bill.doc_total !== null ? (
                        <span className="tabular-nums">{formatCurrency(bill.doc_total)}</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5">
                      {bill.customer_ref ? `${bill.customer_ref} · ` : ''}
                      <span className="text-muted-foreground">{bill.customer_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {bill.item_summary || 'No lines'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove bill ${bill.doc_num ?? bill.doc_entry}`}
                    onClick={() =>
                      setPicked((current) =>
                        current.filter((other) => billKey(other) !== billKey(bill)),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cash-out-taken-by">
            Taken out by <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cash-out-taken-by"
            value={takenByName}
            onChange={(event) => setTakenByName(event.target.value)}
            placeholder="Name of the person"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash-out-mobile">Mobile</Label>
          <Input
            id="cash-out-mobile"
            value={takenByMobile}
            onChange={(event) => setTakenByMobile(event.target.value)}
            inputMode="tel"
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash-out-vehicle">Vehicle no.</Label>
          <Input
            id="cash-out-vehicle"
            value={vehicleNo}
            onChange={(event) => setVehicleNo(event.target.value.toUpperCase())}
            placeholder="Leave blank if on foot"
            maxLength={30}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cash-out-remarks">Remarks</Label>
          <Textarea
            id="cash-out-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={!canSave}>
          {createOut.isPending
            ? 'Saving…'
            : picked.length > 1
              ? `Mark ${picked.length} bills out`
              : 'Mark out'}
        </Button>
      </DialogFooter>
    </div>
  );
}
