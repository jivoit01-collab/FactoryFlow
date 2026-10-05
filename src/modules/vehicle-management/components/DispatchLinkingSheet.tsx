import { Loader2, Plus, Save, Unlink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { TruckFreightInput } from '@/modules/dispatch/api/freightApproval.api';
import {
  EMPTY_TRUCK_FREIGHT,
  freightBillsOf,
  toTruckFreightInput,
  type TruckFreightDraft,
  truckFreightProblem,
} from '@/modules/dispatch/components/freight-approval/truckFreight';
import { TruckFreightFields } from '@/modules/dispatch/components/freight-approval/TruckFreightFields';
import { useTruckFreight } from '@/modules/dispatch/components/freight-approval/useTruckFreight';
import type { Vehicle, VehicleName } from '@/modules/gate/api/vehicle/vehicle.api';
import { useVehicleById, useVehicleNames } from '@/modules/gate/api/vehicle/vehicle.queries';
import { CreateVehicleDialog } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
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
import { useScrollToError } from '@/shared/hooks';

import type {
  CustomerBiltyPayload,
  DispatchLinkingVehicleSeed,
  DispatchVehicleLinkPayload,
} from '../types';
import {
  inferProductVariety,
  invoiceWeightForPayload,
  monthValue,
  numberToString,
  totalLitresForPayload,
} from '../utils/dispatchLinkPayload';

interface DispatchLinkingSheetProps {
  bill: DispatchBill | null;
  selectedBills: DispatchBill[];
  /**
   * Transport to open the form with, overriding whatever the bill's own plan
   * holds. The vehicle-based Vehicle Linking page passes the card's vehicle so
   * bills added to an existing truck inherit its transporter instead of
   * re-seeding from the (still unlinked) bill.
   */
  vehicleSeed?: DispatchLinkingVehicleSeed | null;
  open: boolean;
  isSaving: boolean;
  isUnlinking: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The link itself, plus one bilty per consignee on the truck. The two go
   * together but are written separately: the payload is shared across every
   * bill on the vehicle, and a bilty (LR) is issued per consignee.
   *
   * `freight` is the truck's, entered once for the whole truck and recorded
   * after the link against its benchmark (see `recordTruckFreight`).
   */
  onSave: (
    docEntry: number,
    payload: DispatchVehicleLinkPayload,
    bilties: CustomerBiltyPayload[],
    freight: TruckFreightInput,
  ) => Promise<void>;
  onUnlink: (docEntry: number) => Promise<void>;
}

/** A consignee on the truck, with the bills of theirs it is carrying. */
interface BiltyCustomer {
  key: string;
  name: string;
  docEntries: number[];
  /** What the plans already hold, so a re-link does not ask for it all again. */
  existingNo: string;
  existingDate: string;
  existingFileName: string;
}

interface BiltyEntry {
  bilty_no: string;
  bilty_date: string;
  file: File | null;
}

interface FormState {
  invoice_number: string;
  invoice_amount: string;
  place_of_supply: string;
  budget_delivery_point: string;
  vehicle_id: number | null;
  transporter_id: number | null;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
  vehicle_no: string;
  remarks: string;
}

interface VehicleSelection {
  vehicleId: number;
  vehicleNumber: string;
  vehicleType: string;
  vehicleCapacity: string;
  transporterId: number;
  transporterName: string;
  transporterGstin: string;
  transporterContactPerson: string;
  transporterMobile: string;
}

const EMPTY_FORM: FormState = {
  invoice_number: '',
  invoice_amount: '',
  place_of_supply: '',
  budget_delivery_point: '',
  vehicle_id: null,
  transporter_id: null,
  transporter_name: '',
  transporter_gstin: '',
  contact_person: '',
  mobile_no: '',
  vehicle_no: '',
  remarks: '',
};

function formFromBill(
  bill: DispatchBill | null,
  vehicleSeed?: DispatchLinkingVehicleSeed | null,
): FormState {
  if (!bill) return EMPTY_FORM;
  const sapVehicleNo = bill.sap_vehicle_no || bill.gst_vehicle_no || '';
  const placeOfSupply = bill.state || bill.city || '';

  if (vehicleSeed) {
    return {
      ...formFromBill(bill),
      vehicle_id: vehicleSeed.vehicle_id,
      vehicle_no: vehicleSeed.vehicle_no,
      transporter_id: vehicleSeed.transporter_id,
      transporter_name: vehicleSeed.transporter_name,
      transporter_gstin: vehicleSeed.transporter_gstin,
      contact_person: vehicleSeed.contact_person,
      mobile_no: vehicleSeed.mobile_no,
    };
  }

  return {
    invoice_number: bill.plan.invoice_number || bill.doc_num || '',
    invoice_amount: bill.plan.invoice_amount ?? numberToString(bill.doc_total),
    place_of_supply: bill.plan.place_of_supply || placeOfSupply,
    budget_delivery_point: bill.plan.budget_delivery_point || bill.city || '',
    vehicle_id: bill.plan.vehicle_id ?? null,
    transporter_id: bill.plan.transporter_id ?? null,
    transporter_name: bill.plan.transporter_name || bill.sap_transporter_name || '',
    transporter_gstin: bill.plan.transporter_gstin ?? '',
    contact_person: bill.plan.contact_person ?? '',
    mobile_no: bill.plan.mobile_no ?? '',
    vehicle_no: bill.plan.vehicle_no || sapVehicleNo,
    remarks: bill.plan.remarks ?? '',
  };
}

function stringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatLoadLabel(totalBoxes: number, totalWeight: number): string {
  const weightLabel =
    Number.isFinite(totalWeight) && totalWeight > 0
      ? `${formatNumber(totalWeight, 3)} kg`
      : 'Weight not available';
  return Number.isFinite(totalBoxes) && totalBoxes > 0
    ? `${formatNumber(totalBoxes, 2)} boxes / ${weightLabel}`
    : weightLabel;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function cleanSapSeed(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed && trimmed !== '-' ? trimmed : '';
}

function normalizeVehicleNumber(value: string | null | undefined) {
  return cleanSapSeed(value).toUpperCase().replace(/\s/g, '');
}

export function DispatchLinkingSheet({
  bill,
  selectedBills,
  vehicleSeed = null,
  open,
  isSaving,
  isUnlinking,
  onOpenChange,
  onSave,
  onUnlink,
}: DispatchLinkingSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFromBill(bill, vehicleSeed));
  const [formError, setFormError] = useState('');
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  /** The bilty being typed for each consignee, keyed the way `customers` is. */
  const [bilties, setBilties] = useState<Record<string, BiltyEntry>>({});
  const [freightDraft, setFreightDraft] = useState<TruckFreightDraft>(EMPTY_TRUCK_FREIGHT);
  const [freightError, setFreightError] = useState('');
  const formErrors = useMemo(
    () => (formError ? { 'dispatch-linking-form-error': { message: formError } } : {}),
    [formError],
  );
  const { scrollToFirstError } = useScrollToError(formErrors);
  const sapTransporterDetails = useMemo(
    () => ({
      name: cleanSapSeed(form.transporter_name),
      contact_person: cleanSapSeed(form.contact_person),
      mobile_no: cleanSapSeed(form.mobile_no),
      gstin: cleanSapSeed(form.transporter_gstin),
    }),
    [form.contact_person, form.mobile_no, form.transporter_gstin, form.transporter_name],
  );
  const activeBills = useMemo(
    () => (selectedBills.length > 0 ? selectedBills : bill ? [bill] : []),
    [bill, selectedBills],
  );
  const isBatchLink = activeBills.length > 1;

  /* A bilty (LR) is issued per consignee, so the truck is asked for one per
     distinct customer rather than one overall. Keyed on the SAP customer code,
     falling back to the name for the rare bill that carries no code. */
  const customers = useMemo<BiltyCustomer[]>(() => {
    const byKey = new Map<string, BiltyCustomer>();
    for (const item of activeBills) {
      const key = (item.card_code || '').trim() || (item.card_name || '').trim();
      if (!key) continue;
      let customer = byKey.get(key);
      if (!customer) {
        customer = {
          key,
          name: item.card_name || item.card_code || key,
          docEntries: [],
          existingNo: '',
          existingDate: '',
          existingFileName: '',
        };
        byKey.set(key, customer);
      }
      customer.docEntries.push(item.doc_entry);
      // Whatever any of this customer's bills already carries — a re-link, or a
      // truck being added to, should not make somebody re-type a bilty that is
      // already on the plan.
      customer.existingNo ||= item.plan.bilty_no || '';
      customer.existingDate ||= item.plan.bilty_date?.slice(0, 10) || '';
      customer.existingFileName ||= item.plan.bilty_attachment_name || '';
    }
    return [...byKey.values()];
  }, [activeBills]);

  const biltyFor = useCallback(
    (customer: BiltyCustomer): BiltyEntry =>
      bilties[customer.key] ?? {
        bilty_no: customer.existingNo,
        bilty_date: customer.existingDate,
        file: null,
      },
    [bilties],
  );

  /* Every consignee needs a number, a date and a scan before the truck can be
     linked. The file counts as supplied when the plan already holds one. */
  const missingBilties = useMemo(
    () =>
      customers.filter((customer) => {
        const entry = biltyFor(customer);
        return (
          !entry.bilty_no.trim() ||
          !entry.bilty_date ||
          !(entry.file || customer.existingFileName)
        );
      }),
    [biltyFor, customers],
  );
  const selectedTotals = useMemo(
    () => ({
      invoices: activeBills.length,
      litres: activeBills.reduce((sum, item) => sum + (item.total_litres || 0), 0),
      weight: activeBills.reduce((sum, item) => sum + (item.total_weight || 0), 0),
      amount: activeBills.reduce((sum, item) => sum + (item.doc_total || 0), 0),
    }),
    [activeBills],
  );
  const truckFreight = useTruckFreight(
    form.vehicle_id,
    freightDraft,
    selectedTotals.weight > 0 ? selectedTotals.weight : null,
  );
  const updateFreight = useCallback((draft: TruckFreightDraft) => {
    setFreightDraft(draft);
    setFreightError('');
  }, []);

  const showFormError = useCallback(
    (message: string) => {
      setFormError(message);
      scrollToFirstError();
    },
    [scrollToFirstError],
  );

  useEffect(() => {
    // The sheet's form follows the selected bill, and the bilties are cleared
    // with it: they are typed against the customers of THIS truck, and carrying
    // them into the next one would attach somebody else's LR number.
    if (!open) return;
    setForm(formFromBill(bill, vehicleSeed));
    setFormError('');
    setConfirmingUnlink(false);
    setBilties({});
    setFreightDraft(EMPTY_TRUCK_FREIGHT);
    setFreightError('');
  }, [bill, open, vehicleSeed]);

  function updateBilty(key: string, patch: Partial<BiltyEntry>) {
    setBilties((prev) => {
      const customer = customers.find((item) => item.key === key);
      const base =
        prev[key] ?? {
          bilty_no: customer?.existingNo ?? '',
          bilty_date: customer?.existingDate ?? '',
          file: null,
        };
      return { ...prev, [key]: { ...base, ...patch } };
    });
    setFormError('');
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  }

  const canUnlink = Boolean(
    bill && !isBatchLink && bill.plan.vehicle_id && !bill.plan.is_vehicle_link_locked,
  );

  async function handleUnlink() {
    if (!bill) return;
    await onUnlink(bill.doc_entry);
  }

  function handleVehicleSelect(vehicle: VehicleSelection) {
    setForm((prev) => ({
      ...prev,
      vehicle_id: vehicle.vehicleId || null,
      vehicle_no: vehicle.vehicleNumber,
      transporter_id: vehicle.transporterId || null,
      transporter_name: vehicle.transporterName || '',
      transporter_gstin: vehicle.transporterGstin || '',
      contact_person: vehicle.transporterContactPerson || '',
      mobile_no: vehicle.transporterMobile || '',
    }));
    setFormError('');
    // Another truck has its own freight, or none yet.
    if (vehicle.vehicleId !== form.vehicle_id) setFreightDraft(EMPTY_TRUCK_FREIGHT);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill) return;
    if (!form.vehicle_id) {
      const sapVehicleNo = normalizeVehicleNumber(form.vehicle_no);
      showFormError(
        sapVehicleNo
          ? `Vehicle ${sapVehicleNo} is coming from SAP but is not linked to Vehicle Master. Select an existing vehicle or add it before saving.`
          : 'Please select a vehicle.',
      );
      return;
    }
    // The bilty is the LR the driver carries and the gatepass prints, and the
    // desk assigning the truck is the one holding it. Refused here rather than
    // left for the gate to discover with the load already on the vehicle.
    if (missingBilties.length > 0) {
      showFormError(
        missingBilties.length === customers.length
          ? 'Add the bilty number, date and scan for each customer on this truck before linking.'
          : `The bilty is incomplete for ${missingBilties
              .map((customer) => customer.name)
              .join(', ')}.`,
      );
      return;
    }
    // The truck's freight, held against the benchmark for where it is going.
    // Asked for here, with the load, because this is where it is agreed.
    const freightProblem = truckFreightProblem(freightDraft, truckFreight.quote);
    if (freightProblem) {
      setFreightError(freightProblem);
      showFormError(freightProblem);
      return;
    }
    await onSave(
      bill.doc_entry,
      {
      sap_invoice_doc_num: bill.doc_num,
      linked_invoice_doc_entries: activeBills.map((selected) => selected.doc_entry),
      invoice_weight: invoiceWeightForPayload(bill),
      invoice_amount: stringOrNull(form.invoice_amount),
      place_of_supply: form.place_of_supply.trim(),
      product_variety: bill.plan.product_variety || inferProductVariety(bill.item_summary),
      total_litres: totalLitresForPayload(bill),
      effective_month: bill.plan.effective_month || monthValue(bill.doc_date),
      budget_delivery_point: form.budget_delivery_point.trim(),
      service_location_code: bill.plan.service_location_code ?? null,
      service_location_name: bill.plan.service_location_name || '',
      sac_entry: bill.plan.sac_entry ?? null,
      sac_code: bill.plan.sac_code || '',
      vehicle_id: form.vehicle_id,
      transporter_id: form.transporter_id,
      booking_status: 'BOOKED',
      dispatch_date: bill.plan.dispatch_date,
      transporter_name: form.transporter_name.trim(),
      transporter_gstin: form.transporter_gstin.trim(),
      contact_person: form.contact_person.trim(),
      mobile_no: form.mobile_no.trim(),
        vehicle_no: form.vehicle_no.trim(),
        remarks: form.remarks.trim(),
      },
      customers.map((customer) => {
        const entry = biltyFor(customer);
        return {
          doc_entries: customer.docEntries,
          bilty_no: entry.bilty_no.trim(),
          bilty_date: entry.bilty_date || null,
          // Left out when the plan already holds the scan: re-sending it would
          // rewrite the file and post a "replaced" row to the audit trail over
          // a document nobody changed.
          bilty_attachment: entry.file,
        };
      }),
      // The bills this link adds, on top of whatever the truck's freight
      // already covers. Never the truck's every booking: an old bill left on it
      // is not part of today's freight.
      toTruckFreightInput(
        form.vehicle_id,
        freightDraft,
        truckFreight.quote,
        freightBillsOf(activeBills),
        true,
      ),
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Link Dispatch Vehicle</SheetTitle>
          {bill && (
            <div className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{bill.doc_num}</span>
              <span className="mx-2">-</span>
              <span>{bill.card_name}</span>
            </div>
          )}
        </SheetHeader>

        {bill && (
          <div className="mt-4 grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-3">
            <InfoItem label="Dispatch Date" value={bill.plan.dispatch_date} />
            <InfoItem
              label="SAP Location"
              value={
                isBatchLink
                  ? 'Multiple invoices'
                  : `${compactText(bill.city)} ${compactText(bill.state)}`
              }
            />
            <InfoItem
              label="Location"
              value={isBatchLink ? 'Multiple invoices' : compactText(bill.plan.location)}
            />
            <InfoItem
              label="Total Litres"
              value={
                isBatchLink
                  ? `${formatNumber(selectedTotals.litres, 2)} L`
                  : bill.total_litres > 0
                    ? `${formatNumber(bill.total_litres, 2)} L`
                    : '-'
              }
            />
            <InfoItem
              label="Load"
              value={
                isBatchLink
                  ? formatLoadLabel(0, selectedTotals.weight)
                  : formatLoadLabel(bill.total_boxes, bill.total_weight)
              }
            />
          </div>
        )}

        {activeBills.length > 1 && (
          <div className="mt-4 rounded-md border bg-primary/5 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {activeBills.length} invoices selected for one vehicle link
              </div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(selectedTotals.litres, 3)} L /{' '}
                {formatNumber(selectedTotals.weight, 3)} kg / Rs{' '}
                {formatNumber(selectedTotals.amount)}
              </div>
            </div>
            <div className="mt-3 max-h-48 overflow-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Invoice</th>
                    <th className="px-2 py-1 text-left font-medium">Customer</th>
                    <th className="px-2 py-1 text-left font-medium">State</th>
                    <th className="px-2 py-1 text-left font-medium">Delivery Point</th>
                    <th className="px-2 py-1 text-right font-medium">Litres</th>
                    <th className="px-2 py-1 text-right font-medium">Weight</th>
                    <th className="px-2 py-1 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBills.map((selected) => (
                    <tr key={selected.doc_entry} className="border-b last:border-b-0">
                      <td className="px-2 py-1 font-mono">{selected.doc_num}</td>
                      <td className="px-2 py-1">{selected.card_name}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{compactText(selected.state)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{compactText(selected.city)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {selected.total_litres > 0
                          ? `${formatNumber(selected.total_litres, 2)} L`
                          : '-'}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatNumber(selected.total_weight, 3)} kg
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        Rs {formatNumber(selected.doc_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            tabIndex={-1}
            data-field="dispatch-linking-form-error"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none"
          >
            {formError}
          </div>
        )}

        <form className="mt-4 flex flex-1 flex-col gap-6" noValidate onSubmit={handleSubmit}>
          <DispatchVehicleSelect
            selectedId={form.vehicle_id}
            value={form.vehicle_no}
            sapTransporterDetails={sapTransporterDetails}
            sheetOpen={open}
            onChange={handleVehicleSelect}
          />

          {!isBatchLink && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-invoice-number">Invoice Number</Label>
                {/* The invoice number is the SAP document number; it is shown for
                    reference and is no longer an editable override. */}
                <Input
                  id="dispatch-link-invoice-number"
                  value={form.invoice_number}
                  readOnly
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-invoice-amount">Amount</Label>
                <Input
                  id="dispatch-link-invoice-amount"
                  type="number"
                  step="0.01"
                  value={form.invoice_amount}
                  onChange={(event) => updateField('invoice_amount', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-place-of-supply">Place of Supply</Label>
                <Input
                  id="dispatch-link-place-of-supply"
                  value={form.place_of_supply}
                  onChange={(event) => updateField('place_of_supply', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-delivery-point">Delivery Point</Label>
                <Input
                  id="dispatch-link-delivery-point"
                  value={form.budget_delivery_point}
                  onChange={(event) => updateField('budget_delivery_point', event.target.value)}
                />
              </div>
            </div>
          )}

          {/* The bilty, per consignee. This is where it is collected now: the
              LR is issued per customer and the dispatch desk has it in hand
              when it assigns the truck. The gatepass prints it, the Service
              GRPO sends the scan to SAP, and the warehouse cannot approve a
              bill summary without the number — all of them read it off the
              plan this writes to. */}
          {customers.length > 0 && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-medium">
                  Bilty (LR){customers.length > 1 ? ` — ${customers.length} customers` : ''}
                </div>
                <p className="text-xs text-muted-foreground">
                  One per customer. The gatepass will not print without it.
                </p>
              </div>

              {customers.map((customer) => {
                const entry = biltyFor(customer);
                const incomplete = missingBilties.some((item) => item.key === customer.key);
                return (
                  <div
                    key={customer.key}
                    className={`space-y-2 rounded-md border p-3 ${
                      incomplete ? 'border-amber-400 dark:border-amber-500/40' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {customer.docEntries.length} bill
                        {customer.docEntries.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`bilty-no-${customer.key}`}>Bilty number</Label>
                        <Input
                          id={`bilty-no-${customer.key}`}
                          value={entry.bilty_no}
                          placeholder="NCR-4494"
                          onChange={(event) =>
                            updateBilty(customer.key, { bilty_no: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`bilty-date-${customer.key}`}>Bilty date</Label>
                        <Input
                          id={`bilty-date-${customer.key}`}
                          type="date"
                          value={entry.bilty_date}
                          onChange={(event) =>
                            updateBilty(customer.key, { bilty_date: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`bilty-file-${customer.key}`}>Bilty scan</Label>
                        <Input
                          id={`bilty-file-${customer.key}`}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(event) =>
                            updateBilty(customer.key, {
                              file: event.target.files?.[0] ?? null,
                            })
                          }
                        />
                        {/* Already on the plan: the file box can stay empty, and
                            the number or date can still be corrected. */}
                        {!entry.file && customer.existingFileName && (
                          <p className="text-xs text-muted-foreground">
                            Already attached: {customer.existingFileName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {form.vehicle_id && (
            <TruckFreightFields
              idPrefix="dispatch-link-freight"
              draft={freightDraft}
              onChange={updateFreight}
              freight={truckFreight}
              loadKg={selectedTotals.weight > 0 ? selectedTotals.weight : null}
              error={freightError}
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dispatch-link-remarks">Transport Remarks</Label>
            <Textarea
              id="dispatch-link-remarks"
              rows={4}
              value={form.remarks}
              onChange={(event) => updateField('remarks', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If the Total Litres above looks wrong, note the correct litres here.
            </p>
          </div>

          <SheetFooter className="mt-auto flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            {canUnlink ? (
              confirmingUnlink ? (
                <div className="flex w-full flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:w-auto sm:flex-row sm:items-center">
                  <span className="text-sm text-destructive">
                    Unlink this vehicle and set the booking back to Pending?
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingUnlink(false)}
                      disabled={isUnlinking}
                    >
                      Keep
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleUnlink}
                      disabled={isUnlinking}
                    >
                      {isUnlinking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="mr-2 h-4 w-4" />
                      )}
                      Confirm Unlink
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmingUnlink(true)}
                  disabled={isSaving || isUnlinking}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Unlink Vehicle
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isUnlinking}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Link
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface DispatchVehicleSelectProps {
  selectedId: number | null;
  value: string;
  sapTransporterDetails?: {
    name?: string;
    contact_person?: string;
    mobile_no?: string;
    gstin?: string;
  };
  sheetOpen: boolean;
  onChange: (vehicle: VehicleSelection) => void;
}

function DispatchVehicleSelect({
  selectedId,
  value,
  sapTransporterDetails,
  sheetOpen,
  onChange,
}: DispatchVehicleSelectProps) {
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedId);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: vehicleNames = [], isLoading } = useVehicleNames(sheetOpen);
  const { data: vehicleDetails } = useVehicleById(
    localSelectedId,
    sheetOpen && localSelectedId !== null,
  );
  const sapVehicleNo = normalizeVehicleNumber(value);
  const hasUnlinkedSapVehicle = Boolean(sapVehicleNo && !localSelectedId);

  const prevSelectedIdRef = useRef(selectedId);
  const prevVehicleDetailsRef = useRef(vehicleDetails);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (selectedId === prevSelectedIdRef.current) return;
    prevSelectedIdRef.current = selectedId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet edit mode must sync selected id from the opened bill.
    setLocalSelectedId(selectedId);
    if (!selectedId) {
      setSelectedVehicleDetails(null);
      prevVehicleDetailsRef.current = undefined;
    }
  }, [selectedId]);

  useEffect(() => {
    if (localSelectedId || !sapVehicleNo || vehicleNames.length === 0) return;

    const matchingVehicle = vehicleNames.find(
      (vehicle) => normalizeVehicleNumber(vehicle.vehicle_number) === sapVehicleNo,
    );
    if (matchingVehicle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Auto-link exact SAP vehicle matches from Vehicle Master.
      setLocalSelectedId(matchingVehicle.id);
    }
  }, [localSelectedId, sapVehicleNo, vehicleNames]);

  const applyVehicle = useCallback((vehicle: Vehicle) => {
    prevVehicleDetailsRef.current = vehicle;
    setSelectedVehicleDetails(vehicle);
    onChangeRef.current({
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      vehicleType: vehicle.vehicle_type.name,
      vehicleCapacity: `${vehicle.capacity_ton} Tons`,
      transporterId: vehicle.transporter?.id || 0,
      transporterName: vehicle.transporter?.name || '',
      transporterGstin: vehicle.transporter?.gstin || '',
      transporterContactPerson: vehicle.transporter?.contact_person || '',
      transporterMobile: vehicle.transporter?.mobile_no || '',
    });
  }, []);

  const syncVehicleDetails = useCallback(() => {
    if (!vehicleDetails || vehicleDetails === prevVehicleDetailsRef.current) return;

    applyVehicle(vehicleDetails);
  }, [applyVehicle, vehicleDetails]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync fetched vehicle details into sheet form.
    syncVehicleDetails();
  }, [syncVehicleDetails]);

  return (
    <div className="space-y-2">
      <SearchableSelect<VehicleName>
        value={localSelectedId !== null ? String(localSelectedId) : ''}
        defaultDisplayText={selectedVehicleDetails?.vehicle_number || ''}
        items={vehicleNames}
        isLoading={isLoading}
        label="Vehicle No."
        labelAction={
          hasUnlinkedSapVehicle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vehicle
            </Button>
          ) : undefined
        }
        required
        placeholder={sapVehicleNo ? `Select or add ${sapVehicleNo}` : 'Select vehicle'}
        inputId="dispatch-link-vehicle-select"
        getItemKey={(vehicle) => vehicle.id}
        getItemLabel={(vehicle) => vehicle.vehicle_number}
        loadingText="Loading vehicles..."
        emptyText="No vehicles available"
        notFoundText="No vehicles found"
        addNewLabel={sapVehicleNo ? `Add ${sapVehicleNo} as New Vehicle` : 'Add New Vehicle'}
        onSelectedKeyChange={(key) => {
          setLocalSelectedId(key as number | null);
          if (!key) setSelectedVehicleDetails(null);
        }}
        onItemSelect={(vehicle) => {
          setLocalSelectedId(vehicle.id);
        }}
        onClear={() => {
          setLocalSelectedId(null);
          setSelectedVehicleDetails(null);
          prevVehicleDetailsRef.current = undefined;
          onChange({
            vehicleId: 0,
            vehicleNumber: '',
            vehicleType: '',
            vehicleCapacity: '',
            transporterId: 0,
            transporterName: '',
            transporterGstin: '',
            transporterContactPerson: '',
            transporterMobile: '',
          });
        }}
        renderPopoverContent={(activeKey) =>
          selectedVehicleDetails ? (
            <div className="space-y-1.5 text-sm">
              <div>
                <span className="font-medium">Vehicle Number:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.vehicle_number}
                </span>
              </div>
              <div>
                <span className="font-medium">Vehicle Type:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.vehicle_type.name}
                </span>
              </div>
              <div>
                <span className="font-medium">Capacity:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.capacity_ton} Tons
                </span>
              </div>
              {selectedVehicleDetails.transporter && (
                <div>
                  <span className="font-medium">Transporter:</span>{' '}
                  <span className="text-muted-foreground">
                    {selectedVehicleDetails.transporter.name}
                  </span>
                </div>
              )}
            </div>
          ) : activeKey ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vehicle details...
            </div>
          ) : sapVehicleNo ? (
            <div className="text-sm text-muted-foreground">
              SAP shows vehicle {sapVehicleNo}. Add it to Vehicle Master or select an existing
              vehicle.
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Please select a vehicle to view details.
            </div>
          )
        }
        renderCreateDialog={(open, onOpenChange, updateSelection) => (
          <CreateVehicleDialog
            open={open}
            onOpenChange={onOpenChange}
            initialVehicleNumber={sapVehicleNo}
            initialTransporterDetails={sapTransporterDetails}
            onSuccess={(vehicle) => {
              updateSelection(vehicle.id, vehicle.vehicle_number);
              setLocalSelectedId(vehicle.id);
              applyVehicle(vehicle);
            }}
          />
        )}
      />

      {hasUnlinkedSapVehicle && (
        <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-400">
          SAP shows vehicle <span className="font-semibold">{sapVehicleNo}</span>, but it is not
          linked to Vehicle Master yet. Add it or select the matching master vehicle before saving.
        </div>
      )}

      <CreateVehicleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialVehicleNumber={sapVehicleNo}
        initialTransporterDetails={sapTransporterDetails}
        onSuccess={(vehicle) => {
          setLocalSelectedId(vehicle.id);
          applyVehicle(vehicle);
        }}
      />
    </div>
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
