import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import type { DispatchVehicleLinkPayload } from '../types';

/** The payload fields that describe one invoice rather than the transport. */
export type DispatchLinkInvoiceFields = Pick<
  DispatchVehicleLinkPayload,
  | 'sap_invoice_doc_num'
  | 'invoice_weight'
  | 'invoice_amount'
  | 'place_of_supply'
  | 'product_variety'
  | 'total_litres'
  | 'effective_month'
  | 'budget_delivery_point'
>;

export function numberToString(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

// Backend caps invoice_weight precision (DecimalField). Round to 3 decimals to
// match the displayed Load and stay safely within the allowed decimal places.
const INVOICE_WEIGHT_DECIMALS = 3;

function roundWeight(value: number): number {
  const factor = 10 ** INVOICE_WEIGHT_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function invoiceWeightForPayload(bill: DispatchBill): string | null {
  const raw =
    bill.plan.invoice_weight !== null && bill.plan.invoice_weight !== undefined
      ? Number(bill.plan.invoice_weight)
      : bill.total_weight;
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return numberToString(roundWeight(raw));
}

export function inferProductVariety(itemSummary: string): string {
  const normalized = itemSummary.toLowerCase();
  if (
    ['water', 'mineral', 'drink', 'beverage', 'juice'].some((token) => normalized.includes(token))
  ) {
    return 'Beverage';
  }
  return itemSummary.trim() ? 'Oil' : '';
}

export function monthValue(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * The invoice-specific half of a link payload, derived from the bill itself.
 *
 * A batch link sends one payload for many bills and the backend re-derives these
 * per bill — but only when the batch actually holds more than one. A caller that
 * fans a link out (the Vehicle Linking page issues one call per company, since a
 * plan write is company-scoped) must therefore re-seed them for each call's
 * primary bill, or the second company's bill would inherit the first's invoice.
 */
export function invoiceFieldsFromBill(bill: DispatchBill): DispatchLinkInvoiceFields {
  return {
    sap_invoice_doc_num: bill.doc_num,
    invoice_weight: invoiceWeightForPayload(bill),
    invoice_amount: bill.plan.invoice_amount ?? numberToString(bill.doc_total),
    place_of_supply: bill.plan.place_of_supply || bill.state || bill.city || '',
    product_variety: bill.plan.product_variety || inferProductVariety(bill.item_summary),
    total_litres: bill.plan.total_litres ?? numberToString(bill.total_litres),
    effective_month: bill.plan.effective_month || monthValue(bill.doc_date),
    budget_delivery_point: bill.plan.budget_delivery_point || bill.city || '',
  };
}
