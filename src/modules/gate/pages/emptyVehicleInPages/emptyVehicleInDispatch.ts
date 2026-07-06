import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { EmptyVehicleGateInEntry } from '@/modules/gate/api';

export interface ExpectedDispatchVehicle {
  vehicleId: number;
  vehicleNo: string;
  dispatchDate: string | null;
  transporterName: string;
  biltyNo: string;
  docEntries: number[];
  docNums: string[];
  customers: string[];
  totalWeight: number;
  totalBoxes: number;
  alreadyInside: boolean;
  insideEntryNo: string | null;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export function buildExpectedDispatchVehicles(
  bills: DispatchBill[],
  entries: EmptyVehicleGateInEntry[] = [],
): ExpectedDispatchVehicle[] {
  // `entries` are the vehicle's live (inside) DISPATCH gate-ins, fetched with
  // inside_only=true. Index them by vehicle so a truck that is still inside is
  // *flagged* rather than silently dropped -- the gate user can see it and is
  // stopped from starting a second gate-in for the same physical truck.
  const insideEntryByVehicle = new Map<number, EmptyVehicleGateInEntry>();
  for (const entry of entries) {
    if (entry.reason !== 'DISPATCH') continue;
    if (!insideEntryByVehicle.has(entry.vehicle)) insideEntryByVehicle.set(entry.vehicle, entry);
  }
  const grouped = new Map<number, ExpectedDispatchVehicle>();

  bills.forEach((bill) => {
    const vehicleId = bill.plan.vehicle_id;
    if (!vehicleId || bill.plan.booking_status !== 'BOOKED') return;
    if (bill.plan.linked_vehicle_entry_id) return;

    const current = grouped.get(vehicleId);
    const insideEntry = insideEntryByVehicle.get(vehicleId);
    const vehicleNo = compactText(
      bill.plan.vehicle_no || bill.sap_vehicle_no || bill.gst_vehicle_no,
      `Vehicle #${vehicleId}`,
    );
    const docNum = compactText(bill.doc_num);

    if (!current) {
      grouped.set(vehicleId, {
        vehicleId,
        vehicleNo,
        dispatchDate: bill.plan.dispatch_date || bill.sap_dispatch_date || bill.doc_date,
        transporterName: compactText(
          bill.plan.transporter_name || bill.sap_transporter_name,
          '',
        ),
        biltyNo: compactText(bill.plan.bilty_no || bill.sap_bilty_no || bill.sap_lr_number, ''),
        docEntries: [bill.doc_entry],
        docNums: [docNum],
        customers: [compactText(bill.card_name, '')].filter(Boolean),
        totalWeight: bill.total_weight || 0,
        totalBoxes: bill.total_boxes || 0,
        alreadyInside: Boolean(insideEntry),
        insideEntryNo: insideEntry?.entry_no ?? null,
      });
      return;
    }

    current.docEntries.push(bill.doc_entry);
    current.docNums.push(docNum);
    const customer = compactText(bill.card_name, '');
    if (customer && !current.customers.includes(customer)) current.customers.push(customer);
    current.totalWeight += bill.total_weight || 0;
    current.totalBoxes += bill.total_boxes || 0;
    if (!current.dispatchDate) {
      current.dispatchDate = bill.plan.dispatch_date || bill.sap_dispatch_date || bill.doc_date;
    }
    if (!current.biltyNo) {
      current.biltyNo = compactText(bill.plan.bilty_no || bill.sap_bilty_no || bill.sap_lr_number, '');
    }
  });

  return Array.from(grouped.values()).sort((left, right) => {
    const dateCompare = compactText(left.dispatchDate, '').localeCompare(
      compactText(right.dispatchDate, ''),
    );
    if (dateCompare !== 0) return dateCompare;
    return left.vehicleNo.localeCompare(right.vehicleNo);
  });
}

export function findExpectedDispatchVehicle(
  expectedVehicles: ExpectedDispatchVehicle[],
  docEntry?: number | null,
  vehicleId?: number | null,
) {
  if (docEntry) {
    const byDocEntry = expectedVehicles.find((vehicle) => vehicle.docEntries.includes(docEntry));
    if (byDocEntry) return byDocEntry;
  }

  if (vehicleId) {
    return expectedVehicles.find((vehicle) => vehicle.vehicleId === vehicleId) || null;
  }

  return null;
}

export function buildExpectedDispatchDescription(vehicle: ExpectedDispatchVehicle) {
  const docs = vehicle.docNums.slice(0, 2).join(', ');
  const extraDocs = vehicle.docNums.length > 2 ? ` +${vehicle.docNums.length - 2}` : '';
  const customers =
    vehicle.customers.length > 1
      ? `${vehicle.customers.length} customers`
      : vehicle.customers[0] || 'Dispatch';

  return [docs ? `Bills ${docs}${extraDocs}` : '', customers, vehicle.dispatchDate]
    .filter(Boolean)
    .join(' - ');
}

export function buildDispatchDocumentReference(vehicle: ExpectedDispatchVehicle) {
  return `Dispatch ${vehicle.docNums.join(', ')}`;
}

export function buildDispatchDocumentNotes(vehicle: ExpectedDispatchVehicle) {
  const parts = [
    vehicle.customers.length ? `Customers: ${vehicle.customers.join(', ')}` : '',
    vehicle.biltyNo ? `Bilty: ${vehicle.biltyNo}` : '',
    vehicle.totalBoxes > 0 ? `Boxes: ${formatDispatchNumber(vehicle.totalBoxes)}` : '',
    vehicle.totalWeight > 0 ? `Weight: ${formatDispatchNumber(vehicle.totalWeight, 3)} kg` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

export function formatDispatchNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * One physical truck's gate-in rows, grouped so the "Empty Vehicle Entries"
 * board can show a single expandable entry per vehicle instead of one row per
 * company gate-in. Grouping is presentational only — each company keeps its own
 * `EmptyVehicleGateIn` record underneath. Preferred key is the cross-company
 * arrival (keeps distinct trips apart, folds cross-company siblings together);
 * falls back to the vehicle for legacy/arrival-less gate-ins.
 */
export interface EmptyVehicleGroup {
  key: string;
  vehicleNumber: string;
  arrivalNo: string | null;
  companies: string[];
  subEntries: EmptyVehicleGateInEntry[];
}

export function buildEmptyVehicleGroups(
  entries: EmptyVehicleGateInEntry[],
): EmptyVehicleGroup[] {
  const groups = new Map<string, EmptyVehicleGroup>();
  const order: string[] = [];
  for (const entry of entries) {
    const key =
      entry.arrival != null
        ? `arv:${entry.arrival}`
        : entry.vehicle != null
          ? `veh:${entry.vehicle}`
          : `vno:${entry.vehicle_number ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        vehicleNumber: entry.vehicle_number || '',
        arrivalNo: entry.arrival_no ?? null,
        companies: [],
        subEntries: [],
      };
      groups.set(key, group);
      order.push(key);
    }
    group.subEntries.push(entry);
    if (!group.vehicleNumber && entry.vehicle_number) group.vehicleNumber = entry.vehicle_number;
    if (!group.arrivalNo && entry.arrival_no) group.arrivalNo = entry.arrival_no;
    const company = entry.company_name || entry.company_code;
    if (company && !group.companies.includes(company)) group.companies.push(company);
  }
  return order.map((key) => groups.get(key)!);
}
