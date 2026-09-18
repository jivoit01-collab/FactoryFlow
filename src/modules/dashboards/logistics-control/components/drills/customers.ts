import type { BillRow } from '../../../dispatch-fulfilment/types';
import { billWarehouse } from '../../utils';
import { collect, sharedLabel } from './format';

/** The customer a dispatched bill went to, never a blank group. */
export function billCustomer(row: BillRow): string {
  return (row.customer_name ?? '').trim() || 'Unnamed customer';
}

/** One customer's share of what cleared the gate in a window. */
export interface DispatchedCustomer {
  customer: string;
  warehouse: string;
  bills: number;
  tonnes: number;
  boxes: number;
  value: number;
  /** Trucks, de-duplicated: two bills on one vehicle are one truck. */
  trucks: number;
}

/**
 * Dispatched bills rolled up by customer, heaviest first.
 *
 * A PARTITION of the rows it is given: every bill lands under exactly one
 * customer, so these tonnes add back to the figure above them. The bills are
 * not gone — they are one click down, under the customer they went to.
 *
 * Pure, and in its own file, because two panels roll bills up this way — the
 * day's dispatches and a single day inside the month — and a second
 * implementation would let the two disagree about what a customer's tonnage is.
 */
export function dispatchedCustomers(rows: readonly BillRow[]): DispatchedCustomer[] {
  return [...collect(rows, billCustomer).entries()]
    .map(([customer, bills]) => ({
      customer,
      warehouse: sharedLabel(
        bills.map((bill) => billWarehouse(bill.warehouses)),
        'warehouses',
      ),
      bills: bills.length,
      tonnes: bills.reduce((total, bill) => total + (bill.dispatched_weight ?? 0), 0) / 1000,
      boxes: bills.reduce((total, bill) => total + (bill.dispatched_boxes ?? 0), 0),
      value: bills.reduce((total, bill) => total + (bill.dispatched_amount ?? 0), 0),
      // A bill with no vehicle on it is not a truck. Counting the blank would
      // add a phantom truck to every customer whose paperwork is behind.
      trucks: new Set(
        bills.map((bill) => bill.vehicle_no?.trim()).filter((vehicle) => Boolean(vehicle)),
      ).size,
    }))
    .sort((a, b) => b.tonnes - a.tonnes);
}
