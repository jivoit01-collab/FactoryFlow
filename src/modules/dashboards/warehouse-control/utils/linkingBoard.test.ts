import { describe, expect, it } from 'vitest';

import type {
  DispatchBill,
  DispatchPlan,
  DispatchPlanStatus,
} from '@/modules/dashboards/dispatch-plans/types';

import { buildLinkingBoard } from './linkingBoard';

const TODAY = '2026-09-08';

interface BillSpec {
  docEntry: number;
  docNum?: string;
  dispatchDate?: string | null;
  vehicleId?: number | null;
  vehicleNo?: string;
  status?: DispatchPlanStatus;
  locked?: boolean;
  litres?: number;
  boxes?: number;
  total?: number;
  companyCode?: string | null;
}

function makeBill(spec: BillSpec): DispatchBill {
  const plan = {
    id: spec.docEntry,
    sap_invoice_doc_entry: spec.docEntry,
    sap_invoice_doc_num: spec.docNum ?? String(spec.docEntry),
    dispatch_date: spec.dispatchDate === undefined ? TODAY : spec.dispatchDate,
    vehicle_id: spec.vehicleId ?? null,
    vehicle_no: spec.vehicleNo ?? '',
    transporter_id: null,
    transporter_name: 'Sharma Roadways',
    driver_name: 'Ramesh',
    booking_status: spec.status ?? 'PENDING',
    is_vehicle_link_locked: spec.locked ?? false,
  } as unknown as DispatchPlan;

  return {
    doc_entry: spec.docEntry,
    doc_num: spec.docNum ?? String(spec.docEntry),
    card_name: 'Some Customer',
    doc_total: spec.total ?? 0,
    total_litres: spec.litres ?? 0,
    total_boxes: spec.boxes ?? 0,
    total_weight: 0,
    company_code: spec.companyCode ?? null,
    plan,
  } as unknown as DispatchBill;
}

describe('buildLinkingBoard', () => {
  it('folds today’s linked bills onto one card per vehicle', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, vehicleNo: 'PB11AA1111', status: 'BOOKED' }),
        makeBill({ docEntry: 2, vehicleId: 7, vehicleNo: 'PB11AA1111', status: 'BOOKED' }),
        makeBill({ docEntry: 3, vehicleId: 9, vehicleNo: 'PB11BB2222', status: 'BOOKED' }),
      ],
    });

    expect(board.trucks).toHaveLength(2);
    expect(board.trucks[0]?.vehicleNo).toBe('PB11AA1111');
    expect(board.trucks[0]?.bills).toHaveLength(2);
    expect(board.counts.trucksToday).toBe(2);
    expect(board.counts.linkedBillsToday).toBe(3);
  });

  it('adds up litres, boxes and value across a truck’s bills', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED', litres: 1000, boxes: 50, total: 250000 }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'BOOKED', litres: 500, boxes: 25, total: 125000 }),
      ],
    });

    expect(board.trucks[0]?.totals).toEqual({
      litres: 1500,
      boxes: 75,
      amount: 375000,
      weight: 0,
    });
  });

  it('leaves dispatched and cancelled bookings off the truck board', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, vehicleId: 8, status: 'CANCELLED' }),
      ],
    });

    expect(board.trucks).toEqual([]);
    expect(board.counts.linkedBillsToday).toBe(0);
  });

  it('queues unlinked bills overdue-first, then today, then upcoming', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, dispatchDate: '2026-09-10' }),
        makeBill({ docEntry: 2, dispatchDate: TODAY }),
        makeBill({ docEntry: 3, dispatchDate: '2026-09-05' }),
        makeBill({ docEntry: 4, dispatchDate: '2026-09-01' }),
      ],
    });

    expect(board.pending.map((bill) => bill.doc_entry)).toEqual([4, 3, 2, 1]);
    expect(board.counts.pendingOverdue).toBe(2);
    expect(board.counts.pendingToday).toBe(1);
    expect(board.counts.pendingUpcoming).toBe(1);
  });

  it('does not queue a bill that already holds a vehicle, or one already closed', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED' }),
        makeBill({ docEntry: 2, status: 'DISPATCHED' }),
        makeBill({ docEntry: 3, status: 'CANCELLED' }),
        makeBill({ docEntry: 4 }),
      ],
    });

    expect(board.pending.map((bill) => bill.doc_entry)).toEqual([4]);
  });

  it('ignores bills with no dispatch date on both halves', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, dispatchDate: null }),
        makeBill({ docEntry: 2, dispatchDate: null, vehicleId: 7, status: 'BOOKED' }),
      ],
    });

    expect(board.pending).toEqual([]);
    expect(board.trucks).toEqual([]);
  });

  it('marks a truck locked only when every bill on it is frozen', () => {
    const mixed = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED', locked: true }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'BOOKED', locked: false }),
      ],
    });
    expect(mixed.trucks[0]?.isLocked).toBe(false);

    const frozen = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED', locked: true }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'BOOKED', locked: true }),
      ],
    });
    expect(frozen.trucks[0]?.isLocked).toBe(true);
  });

  it('collects every company riding on one truck', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED', companyCode: 'OIL' }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'BOOKED', companyCode: 'MART' }),
        makeBill({ docEntry: 3, vehicleId: 7, status: 'BOOKED', companyCode: 'OIL' }),
      ],
    });

    expect(board.trucks[0]?.companyCodes).toEqual(['MART', 'OIL']);
  });

  it('falls back to a readable label when no bill carries the vehicle number', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [makeBill({ docEntry: 1, vehicleId: 42, vehicleNo: '', status: 'BOOKED' })],
    });

    expect(board.trucks[0]?.vehicleNo).toBe('Vehicle #42');
  });
});
