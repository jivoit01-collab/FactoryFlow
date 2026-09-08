import { describe, expect, it } from 'vitest';

import { buildLinkingBoard } from './linkingBoard';
import { makeBill, TODAY } from './testBills';

describe('buildLinkingBoard', () => {
  it('lists today’s linked bills and folds the same set onto one card per vehicle', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, vehicleNo: 'PB11AA1111', status: 'BOOKED' }),
        makeBill({ docEntry: 2, vehicleId: 7, vehicleNo: 'PB11AA1111', status: 'BOOKED' }),
        makeBill({ docEntry: 3, vehicleId: 9, vehicleNo: 'PB11BB2222', status: 'BOOKED' }),
      ],
    });

    expect(board.linkedBills).toHaveLength(3);
    expect(board.trucks).toHaveLength(2);
    expect(board.trucks[0]?.vehicleNo).toBe('PB11AA1111');
    expect(board.trucks[0]?.bills).toHaveLength(2);
    expect(board.counts.trucksToday).toBe(2);
    expect(board.counts.linkedBillsToday).toBe(3);
  });

  it('keeps only bills that carry a vehicle out of today’s dated set', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED' }),
        makeBill({ docEntry: 2 }),
        makeBill({ docEntry: 3 }),
      ],
    });

    expect(board.linkedBills.map((bill) => bill.doc_entry)).toEqual([1]);
    expect(board.counts.unlinkedToday).toBe(2);
  });

  it('counts only open bills as unlinked — a cancelled one is not waiting', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, status: 'CANCELLED' }),
        makeBill({ docEntry: 2, status: 'DISPATCHED' }),
        makeBill({ docEntry: 3, status: 'PENDING' }),
      ],
    });

    expect(board.counts.unlinkedToday).toBe(1);
  });

  it('ignores bills dated any day but today', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'BOOKED', dispatchDate: '2026-09-01' }),
        makeBill({ docEntry: 2, vehicleId: 8, status: 'BOOKED', dispatchDate: '2026-09-20' }),
        makeBill({ docEntry: 3, vehicleId: 9, status: 'BOOKED', dispatchDate: null }),
        makeBill({ docEntry: 4, vehicleId: 10, status: 'BOOKED' }),
      ],
    });

    expect(board.linkedBills.map((bill) => bill.doc_entry)).toEqual([4]);
    expect(board.trucks).toHaveLength(1);
  });

  it('keeps dispatched work on both views and counts it', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, vehicleNo: 'PB11AA1111', status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, vehicleId: 8, vehicleNo: 'PB11BB2222', status: 'BOOKED' }),
      ],
    });

    expect(board.linkedBills.map((bill) => bill.doc_entry)).toEqual([2, 1]);
    expect(board.counts.linkedBillsToday).toBe(2);
    expect(board.counts.dispatchedBillsToday).toBe(1);
    expect(board.counts.dispatchedTrucksToday).toBe(1);
  });

  it('drops cancelled bookings — a cancelled link is a leftover, not a load', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [makeBill({ docEntry: 1, vehicleId: 7, status: 'CANCELLED' })],
    });

    expect(board.trucks).toEqual([]);
    expect(board.linkedBills).toEqual([]);
  });

  it('sorts still-to-go bills and trucks ahead of dispatched ones', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, docNum: '900', vehicleId: 7, status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, docNum: '800', vehicleId: 7, status: 'DISPATCHED' }),
        makeBill({ docEntry: 3, docNum: '100', vehicleId: 9, status: 'BOOKED' }),
      ],
    });

    // Booked first despite the lower bill number, then dispatched newest-first.
    expect(board.linkedBills.map((bill) => bill.doc_num)).toEqual(['100', '900', '800']);
    expect(board.trucks[0]?.vehicleId).toBe(9);
    expect(board.trucks[1]?.isDispatched).toBe(true);
  });

  it('marks a truck dispatched only when its whole load has gone', () => {
    const partly = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'BOOKED' }),
      ],
    });
    expect(partly.trucks[0]?.isDispatched).toBe(false);
    expect(partly.trucks[0]?.dispatchedBills).toBe(1);
    expect(partly.counts.dispatchedTrucksToday).toBe(0);

    const gone = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({ docEntry: 1, vehicleId: 7, status: 'DISPATCHED' }),
        makeBill({ docEntry: 2, vehicleId: 7, status: 'DISPATCHED' }),
      ],
    });
    expect(gone.trucks[0]?.isDispatched).toBe(true);
    expect(gone.trucks[0]?.dispatchedBills).toBe(2);
  });

  it('adds up litres, boxes and value per truck and across the day', () => {
    const board = buildLinkingBoard({
      today: TODAY,
      bills: [
        makeBill({
          docEntry: 1,
          vehicleId: 7,
          status: 'BOOKED',
          litres: 1000,
          boxes: 50,
          total: 250000,
        }),
        makeBill({
          docEntry: 2,
          vehicleId: 7,
          status: 'BOOKED',
          litres: 500,
          boxes: 25,
          total: 125000,
        }),
        makeBill({
          docEntry: 3,
          vehicleId: 9,
          status: 'BOOKED',
          litres: 200,
          boxes: 10,
          total: 50000,
        }),
      ],
    });

    expect(board.trucks[0]?.totals).toEqual({
      litres: 1500,
      boxes: 75,
      amount: 375000,
      weight: 0,
    });
    expect(board.totals).toEqual({ litres: 1700, boxes: 85, amount: 425000 });
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
