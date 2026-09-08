/**
 * Vehicle-linking derivation for the Warehouse Control board.
 *
 * The linking feed is one read of every dispatch-dated bill in the window; both
 * halves of the board come out of it here rather than from two fetches. Trucks
 * are folded on `plan.vehicle_id` — there is no vehicle-shaped endpoint for a
 * booked (not yet gated-in) truck, and each bill already carries the transport
 * snapshot. Pure, so the fold can be tested without the network.
 */
import type { DispatchBill, DispatchPlanStatus } from '@/modules/dashboards/dispatch-plans/types';

import type { ControlLinkedTruck, ControlLinkingBoard } from '../types';

/** A booking nobody can act on any more. */
function isClosed(status: DispatchPlanStatus): boolean {
  return status === 'DISPATCHED' || status === 'CANCELLED';
}

/** A bill is "linked" once planning has booked a master vehicle onto it. */
function isLinked(bill: DispatchBill): boolean {
  return bill.plan.vehicle_id !== null && !isClosed(bill.plan.booking_status);
}

/** A bill still waiting for a truck: dated, open, and holding no vehicle. */
function isAwaitingVehicle(bill: DispatchBill): boolean {
  return (
    Boolean(bill.plan.dispatch_date) &&
    bill.plan.vehicle_id === null &&
    !isClosed(bill.plan.booking_status)
  );
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNonEmpty(values: (string | null | undefined)[]): string {
  return values.find((value) => value?.trim())?.trim() ?? '';
}

/** ISO dates compare correctly as strings, so no parsing is needed. */
function compareIsoDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
}

function buildTruck(vehicleId: number, bills: DispatchBill[]): ControlLinkedTruck {
  const plans = bills.map((bill) => bill.plan);
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
  };
}

export interface LinkingBoardInput {
  bills: DispatchBill[];
  /** Today, as `yyyy-MM-dd`. */
  today: string;
}

export function buildLinkingBoard({ bills, today }: LinkingBoardInput): ControlLinkingBoard {
  const dated = bills.filter((bill) => Boolean(bill.plan.dispatch_date));

  // -- Trucks running today -------------------------------------------------
  const byVehicle = new Map<number, DispatchBill[]>();
  for (const bill of dated) {
    if (!isLinked(bill) || bill.plan.dispatch_date !== today) continue;
    const vehicleId = bill.plan.vehicle_id as number;
    const list = byVehicle.get(vehicleId);
    if (list) list.push(bill);
    else byVehicle.set(vehicleId, [bill]);
  }

  const trucks = [...byVehicle.entries()]
    .map(([vehicleId, truckBills]) => buildTruck(vehicleId, truckBills))
    .sort((a, b) => b.bills.length - a.bills.length || a.vehicleNo.localeCompare(b.vehicleNo));

  // -- Bills still waiting for a truck --------------------------------------
  const awaiting = dated.filter(isAwaitingVehicle);
  const pendingOverdue = awaiting.filter((bill) => (bill.plan.dispatch_date as string) < today);
  const pendingToday = awaiting.filter((bill) => bill.plan.dispatch_date === today);
  const pendingUpcoming = awaiting.filter((bill) => (bill.plan.dispatch_date as string) > today);

  // Oldest overdue first inside each bucket — that is the queue to work through.
  const byDate = (a: DispatchBill, b: DispatchBill) =>
    compareIsoDate(a.plan.dispatch_date, b.plan.dispatch_date);

  return {
    trucks,
    pending: [
      ...pendingOverdue.sort(byDate),
      ...pendingToday.sort(byDate),
      ...pendingUpcoming.sort(byDate),
    ],
    counts: {
      trucksToday: trucks.length,
      linkedBillsToday: trucks.reduce((sum, truck) => sum + truck.bills.length, 0),
      pendingToday: pendingToday.length,
      pendingOverdue: pendingOverdue.length,
      pendingUpcoming: pendingUpcoming.length,
    },
  };
}
