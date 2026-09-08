/**
 * Vehicle-linking derivation for the Warehouse Control board.
 *
 * One read of the Bills Linking feed produces both halves of today's linked
 * work: the bill-side list (each bill naming its truck) and the truck-side fold
 * (each vehicle naming its bills). Trucks fold on `plan.vehicle_id` — there is
 * no vehicle-shaped endpoint for a booked, not-yet-gated-in truck, and each bill
 * already carries the transport snapshot. Pure, so the fold can be tested
 * without the network.
 */
import type { DispatchBill, DispatchPlanStatus } from '@/modules/dashboards/dispatch-plans/types';

import type { ControlLinkedTruck, ControlLinkingBoard } from '../types';
import { toNumber } from './number';

/** A booking nobody can act on any more. */
function isClosed(status: DispatchPlanStatus): boolean {
  return status === 'DISPATCHED' || status === 'CANCELLED';
}

/**
 * A bill riding on a truck.
 *
 * Dispatched bills count: the truck was loaded and left, which is part of the
 * day, not an absence from it. Only a cancelled booking is excluded — its
 * vehicle link is a leftover, not a load.
 */
function isLinked(bill: DispatchBill): boolean {
  return bill.plan.vehicle_id !== null && bill.plan.booking_status !== 'CANCELLED';
}

/** Already gated out. */
function isDispatched(bill: DispatchBill): boolean {
  return bill.plan.booking_status === 'DISPATCHED';
}

function firstNonEmpty(values: (string | null | undefined)[]): string {
  return values.find((value) => value?.trim())?.trim() ?? '';
}

function buildTruck(vehicleId: number, bills: DispatchBill[]): ControlLinkedTruck {
  const plans = bills.map((bill) => bill.plan);
  const dispatchedBills = bills.filter(isDispatched).length;
  return {
    vehicleId,
    vehicleNo: firstNonEmpty(plans.map((plan) => plan.vehicle_no)) || `Vehicle #${vehicleId}`,
    transporterName: firstNonEmpty(plans.map((plan) => plan.transporter_name)),
    driverName: firstNonEmpty(plans.map((plan) => plan.driver_name)),
    companyCodes: [
      ...new Set(bills.map((bill) => bill.company_code?.trim()).filter(Boolean) as string[]),
    ].sort(),
    dispatchDates: [
      ...new Set(plans.map((plan) => plan.dispatch_date).filter(Boolean) as string[]),
    ].sort(),
    bills,
    totals: {
      litres: bills.reduce((sum, bill) => sum + toNumber(bill.total_litres), 0),
      weight: bills.reduce((sum, bill) => sum + toNumber(bill.total_weight), 0),
      amount: bills.reduce((sum, bill) => sum + toNumber(bill.doc_total), 0),
      boxes: bills.reduce((sum, bill) => sum + toNumber(bill.total_boxes), 0),
    },
    // Frozen only when every bill is frozen: one still-editable bill means the
    // planner can still change the load.
    isLocked: bills.every((bill) => bill.plan.is_vehicle_link_locked),
    dispatchedBills,
    // The truck has left only when nothing is left on it to send.
    isDispatched: bills.length > 0 && dispatchedBills === bills.length,
  };
}

export interface LinkingBoardInput {
  bills: DispatchBill[];
  /** Today, as `yyyy-MM-dd`. */
  today: string;
}

export function buildLinkingBoard({ bills, today }: LinkingBoardInput): ControlLinkingBoard {
  const datedToday = bills.filter((bill) => bill.plan.dispatch_date === today);

  // -- The bill-side view: today's bills that have a truck ------------------
  // Still-to-go first, gone last: the board is read to decide what to act on,
  // and a dispatched row is a record rather than a task.
  const linkedBills = datedToday.filter(isLinked).sort((a, b) => {
    const aGone = isDispatched(a) ? 1 : 0;
    const bGone = isDispatched(b) ? 1 : 0;
    if (aGone !== bGone) return aGone - bGone;
    return toNumber(b.doc_num) - toNumber(a.doc_num) || b.doc_entry - a.doc_entry;
  });

  const unlinkedToday = datedToday.filter(
    (bill) => bill.plan.vehicle_id === null && !isClosed(bill.plan.booking_status),
  ).length;

  // -- The truck-side view: the same set, folded on the vehicle -------------
  const byVehicle = new Map<number, DispatchBill[]>();
  for (const bill of linkedBills) {
    const vehicleId = bill.plan.vehicle_id as number;
    const list = byVehicle.get(vehicleId);
    if (list) list.push(bill);
    else byVehicle.set(vehicleId, [bill]);
  }

  const trucks = [...byVehicle.entries()]
    .map(([vehicleId, truckBills]) => buildTruck(vehicleId, truckBills))
    // Same rule as the bills: trucks still loading come before trucks that left.
    .sort(
      (a, b) =>
        Number(a.isDispatched) - Number(b.isDispatched) ||
        b.bills.length - a.bills.length ||
        a.vehicleNo.localeCompare(b.vehicleNo),
    );

  return {
    trucks,
    linkedBills,
    counts: {
      trucksToday: trucks.length,
      linkedBillsToday: linkedBills.length,
      dispatchedBillsToday: linkedBills.filter(isDispatched).length,
      dispatchedTrucksToday: trucks.filter((truck) => truck.isDispatched).length,
      unlinkedToday,
    },
    totals: {
      litres: linkedBills.reduce((sum, bill) => sum + toNumber(bill.total_litres), 0),
      boxes: linkedBills.reduce((sum, bill) => sum + toNumber(bill.total_boxes), 0),
      amount: linkedBills.reduce((sum, bill) => sum + toNumber(bill.doc_total), 0),
    },
  };
}
