import { describe, expect, it } from 'vitest';

import type { BillRow } from '../../../dispatch-fulfilment/types';
import { dispatchedCustomers } from './customers';

/**
 * The roll-up behind "who took it".
 *
 * Two panels read bills this way — the day's dispatches, and one day inside
 * the month — and both print the result above the bills it was made from. So
 * what is pinned here is the property that makes the panel trustworthy: the
 * customer rows have to add back up to the bills they were built from.
 */

function bill(over: Partial<BillRow>): BillRow {
  return {
    id: 1,
    invoice_number: 'INV-1',
    sap_doc_entry: 1,
    sap_doc_num: '1',
    customer_code: 'C1',
    customer_name: 'Canteen Store',
    dispatch_date: '2026-09-12',
    booking_status: 'DISPATCHED',
    billed_amount: 0,
    planned_weight: 0,
    planned_litres: 0,
    dispatched_amount: 0,
    dispatched_weight: 0,
    dispatched_boxes: 0,
    fulfillment_rate: null,
    dispatch_stage: null,
    gatepass_no: null,
    gateout_count: 1,
    last_dispatched_at: '2026-09-12T10:00:00Z',
    place_of_supply: '',
    transporter_name: '',
    vehicle_no: '',
    eway_bill: '',
    priority: '',
    product_variety: '',
    dispatches: [],
    ...over,
  };
}

describe('dispatchedCustomers', () => {
  it('adds a customer’s bills back up to the customer', () => {
    const rows = dispatchedCustomers([
      bill({ id: 1, dispatched_weight: 4000, dispatched_boxes: 100, dispatched_amount: 50_000 }),
      bill({ id: 2, dispatched_weight: 2000, dispatched_boxes: 60, dispatched_amount: 30_000 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].bills).toBe(2);
    expect(rows[0].tonnes).toBeCloseTo(6);
    expect(rows[0].boxes).toBe(160);
    expect(rows[0].value).toBe(80_000);
  });

  it('orders customers heaviest first', () => {
    const rows = dispatchedCustomers([
      bill({ id: 1, customer_name: 'Light', dispatched_weight: 1000 }),
      bill({ id: 2, customer_name: 'Heavy', dispatched_weight: 9000 }),
    ]);

    expect(rows.map((row) => row.customer)).toEqual(['Heavy', 'Light']);
  });

  it('counts a truck once however many bills rode on it', () => {
    // Two bills on one vehicle are one truck at the gate, and a customer row
    // that said two would disagree with the yard.
    const rows = dispatchedCustomers([
      bill({ id: 1, vehicle_no: 'HR69F9627' }),
      bill({ id: 2, vehicle_no: 'HR69F9627' }),
      bill({ id: 3, vehicle_no: '  ' }),
    ]);

    expect(rows[0].trucks).toBe(1);
  });

  it('names the warehouse where they agree and counts them where they do not', () => {
    const one = dispatchedCustomers([
      bill({ id: 1, warehouses: 'BH-FG, BH-FG' }),
      bill({ id: 2, warehouses: 'BH-FG' }),
    ]);
    expect(one[0].warehouse).toBe('BH-FG');

    const two = dispatchedCustomers([
      bill({ id: 1, warehouses: 'BH-FG' }),
      bill({ id: 2, warehouses: 'BH-JW' }),
    ]);
    expect(two[0].warehouse).toBe('BH-FG + BH-JW');
  });

  it('gives a nameless bill a group rather than dropping it', () => {
    // A bill with no customer on it still moved tonnage through the gate, and
    // a panel that dropped it would not add up to the tile that opened it.
    const rows = dispatchedCustomers([bill({ customer_name: '  ', dispatched_weight: 1000 })]);

    expect(rows).toHaveLength(1);
    expect(rows[0].customer).toBe('Unnamed customer');
    expect(rows[0].tonnes).toBeCloseTo(1);
  });
});
