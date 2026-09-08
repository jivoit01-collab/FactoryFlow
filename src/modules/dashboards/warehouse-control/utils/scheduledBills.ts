/**
 * The scheduled-but-unbooked queue.
 *
 * Reads the Dispatch Plans feed and keeps the bills that carry a dispatch date
 * and are still waiting for a truck. This is the work queue: a bill that has
 * already been booked onto a vehicle is somebody else's problem now, and it
 * appears on the Vehicle Linking and Today's Bills panels instead.
 *
 * Dispatched and cancelled bookings are dropped too — the first has gone, and
 * nobody is waiting on the second. Leaving either in turns a work queue into an
 * archive.
 */
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import type { ControlScheduledQueue } from '../types';
import { toNumber } from './number';

export interface ScheduledQueueInput {
  bills: DispatchBill[];
  /** Today, as `yyyy-MM-dd`. */
  today: string;
}

/** ISO dates compare correctly as strings, so no parsing is needed. */
function byDispatchDate(a: DispatchBill, b: DispatchBill): number {
  const left = a.plan.dispatch_date ?? '';
  const right = b.plan.dispatch_date ?? '';
  if (left === right) return a.doc_entry - b.doc_entry;
  return left < right ? -1 : 1;
}

/** Carries a planned dispatch date, whatever has happened to it since. */
function isScheduled(bill: DispatchBill): boolean {
  return Boolean(bill.plan.dispatch_date);
}

/**
 * Still waiting for a truck.
 *
 * Both halves are checked on purpose: `PENDING` is the status the backend sets
 * before a vehicle is linked, and a null `vehicle_id` is the fact underneath it.
 * They agree in practice, and requiring both keeps a bill whose status drifted
 * out of a queue whose whole point is "these have no truck".
 */
function isAwaitingVehicle(bill: DispatchBill): boolean {
  return bill.plan.booking_status === 'PENDING' && bill.plan.vehicle_id === null;
}

/** Booked onto a truck, but not yet gone. */
function isBooked(bill: DispatchBill): boolean {
  return bill.plan.booking_status === 'BOOKED';
}

export function buildScheduledQueue({ bills, today }: ScheduledQueueInput): ControlScheduledQueue {
  const scheduled = bills.filter(isScheduled);
  const awaiting = scheduled.filter(isAwaitingVehicle);

  const overdue = awaiting.filter((bill) => (bill.plan.dispatch_date as string) < today);
  const dueToday = awaiting.filter((bill) => bill.plan.dispatch_date === today);
  const upcoming = awaiting.filter((bill) => (bill.plan.dispatch_date as string) > today);

  // Oldest overdue first — that is the order the queue has to be worked.
  const rows = [
    ...overdue.sort(byDispatchDate),
    ...dueToday.sort(byDispatchDate),
    ...upcoming.sort(byDispatchDate),
  ];

  return {
    rows,
    counts: {
      total: rows.length,
      overdue: overdue.length,
      today: dueToday.length,
      upcoming: upcoming.length,
      alreadyBooked: scheduled.filter(isBooked).length,
    },
    // Over `rows`, so the totals and the counts always describe the same set.
    totals: {
      litres: rows.reduce((sum, bill) => sum + toNumber(bill.total_litres), 0),
      weightKg: rows.reduce((sum, bill) => sum + toNumber(bill.total_weight), 0),
      amount: rows.reduce((sum, bill) => sum + toNumber(bill.doc_total), 0),
    },
  };
}
