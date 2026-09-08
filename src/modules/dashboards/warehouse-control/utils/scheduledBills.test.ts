import { describe, expect, it } from 'vitest';

import { buildScheduledQueue } from './scheduledBills';
import { makeBill, TODAY } from './testBills';

describe('buildScheduledQueue', () => {
  it('keeps dated bills that are still pending a vehicle', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'PENDING' }),
        makeBill({ docEntry: 2, status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([1, 2]);
    expect(queue.counts.total).toBe(2);
  });

  it('leaves booked bills out — they already have a truck', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'BOOKED', vehicleId: 7, vehicleNo: 'PB11AA1111' }),
        makeBill({ docEntry: 2, status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([2]);
    expect(queue.counts.alreadyBooked).toBe(1);
  });

  it('drops dispatched and cancelled bookings', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, status: 'CANCELLED' }),
        makeBill({ docEntry: 3, status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([3]);
    expect(queue.counts.alreadyBooked).toBe(0);
  });

  it('drops bills with no dispatch date — an unscheduled bill is not late', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, dispatchDate: null, status: 'PENDING' }),
        makeBill({ docEntry: 2, status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([2]);
  });

  it('drops a bill whose status drifted but which already holds a vehicle', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'PENDING', vehicleId: 7 }),
        makeBill({ docEntry: 2, status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([2]);
  });

  it('orders overdue first (oldest first), then today, then upcoming', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, dispatchDate: '2026-09-12', status: 'PENDING' }),
        makeBill({ docEntry: 2, dispatchDate: TODAY, status: 'PENDING' }),
        makeBill({ docEntry: 3, dispatchDate: '2026-09-05', status: 'PENDING' }),
        makeBill({ docEntry: 4, dispatchDate: '2026-09-01', status: 'PENDING' }),
        makeBill({ docEntry: 5, dispatchDate: '2026-09-10', status: 'PENDING' }),
      ],
    });

    expect(queue.rows.map((bill) => bill.doc_entry)).toEqual([4, 3, 2, 5, 1]);
    expect(queue.counts).toEqual({
      total: 5,
      overdue: 2,
      today: 1,
      upcoming: 2,
      alreadyBooked: 0,
    });
  });

  it('counts booked bills only when they carry a dispatch date', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'BOOKED', vehicleId: 7 }),
        makeBill({ docEntry: 2, status: 'BOOKED', vehicleId: 8, dispatchDate: null }),
      ],
    });

    expect(queue.rows).toEqual([]);
    expect(queue.counts.alreadyBooked).toBe(1);
  });

  it('returns an empty queue rather than throwing when nothing is scheduled', () => {
    const queue = buildScheduledQueue({ today: TODAY, bills: [] });

    expect(queue.rows).toEqual([]);
    expect(queue.counts).toEqual({
      total: 0,
      overdue: 0,
      today: 0,
      upcoming: 0,
      alreadyBooked: 0,
    });
  });

  it('totals litres, weight and value over the queued rows only', () => {
    const queue = buildScheduledQueue({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'PENDING', litres: 1000, weight: 950, total: 250000 }),
        makeBill({ docEntry: 2, status: 'PENDING', litres: 500, weight: 480, total: 125000 }),
        // Booked, dispatched and undated bills are not in the queue, so their
        // load must not show up in the backlog either.
        makeBill({ docEntry: 3, status: 'BOOKED', vehicleId: 7, litres: 9000, weight: 9000, total: 9 }),
        makeBill({ docEntry: 4, status: 'DISPATCHED', litres: 9000, weight: 9000, total: 9 }),
        makeBill({ docEntry: 5, status: 'PENDING', dispatchDate: null, litres: 9000, weight: 9000 }),
      ],
    });

    expect(queue.counts.total).toBe(2);
    expect(queue.totals).toEqual({ litres: 1500, weightKg: 1430, amount: 375000 });
  });

  it('reports zero totals for an empty queue rather than NaN', () => {
    const queue = buildScheduledQueue({ today: TODAY, bills: [] });

    expect(queue.totals).toEqual({ litres: 0, weightKg: 0, amount: 0 });
  });
});
