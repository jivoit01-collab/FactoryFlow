import type {
  DeliveryStatus,
  DispatchShipTo,
  TruckDispatchBill,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';

/** One stop of a multi-drop truck: a customer's ship-to and the bills bound
 *  there, as the delivery form offers them. */
export interface BillStop extends DispatchShipTo {
  /** Stable key for the pick list: customer + ship-to. */
  key: string;
  bills: TruckDispatchBill[];
  /** Where the stop stands, from its bills: DELIVERED when every bill is
   *  delivered in full, PARTIALLY_DELIVERED when only some are or any was
   *  short, null until a delivery reached it. */
  delivery_status: DeliveryStatus;
  delivered_date: string | null;
}

type ShipToKey = Pick<DispatchShipTo, 'customer_name' | 'ship_to_code' | 'ship_to_address'>;

export function stopKey(stop: ShipToKey): string {
  return `${stop.customer_name}|${stop.ship_to_code}|${stop.ship_to_address}`;
}

/** SAP's address block as display lines: CR-separated, closing on the country
 *  code ("IN"), which is dropped — every customer here is in India. */
export function addressLines(address: string): string[] {
  const lines = address
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 1 && lines[lines.length - 1] === 'IN' ? lines.slice(0, -1) : lines;
}

/** The place a stop is at, as SAP's address block names it on its last line
 *  ("AGRA-282001"); blank when the bill carries no address. */
export function stopPlace(stop: Pick<DispatchShipTo, 'ship_to_address'>): string {
  const lines = addressLines(stop.ship_to_address ?? '');
  return lines[lines.length - 1] ?? '';
}

/** Group a truck's bills into its stops, in the order the bills come. Bills
 *  naming no customer or address still form a stop (an unnamed one), so they
 *  can be delivered like any other. */
export function groupBillsByStop(bills: TruckDispatchBill[]): BillStop[] {
  const stops = new Map<string, BillStop>();
  for (const bill of bills) {
    const key = stopKey(bill);
    let stop = stops.get(key);
    if (!stop) {
      stop = {
        key,
        customer_name: bill.customer_name ?? '',
        ship_to_code: bill.ship_to_code ?? '',
        ship_to_address: bill.ship_to_address ?? '',
        place_of_supply: bill.place_of_supply ?? '',
        documents: [],
        bills: [],
        delivery_status: null,
        delivered_date: null,
      };
      stops.set(key, stop);
    }
    stop.bills.push(bill);
    if (bill.sap_doc_num && !stop.documents.includes(bill.sap_doc_num)) {
      stop.documents.push(bill.sap_doc_num);
    }
  }
  for (const stop of stops.values()) {
    const statuses = stop.bills.map((bill) => bill.delivery_status ?? null);
    if (!statuses.some(Boolean)) continue;
    stop.delivery_status = statuses.every((status) => status === 'DELIVERED')
      ? 'DELIVERED'
      : 'PARTIALLY_DELIVERED';
    const dates = stop.bills
      .map((bill) => bill.delivered_date)
      .filter((date): date is string => !!date)
      .sort();
    stop.delivered_date = dates[dates.length - 1] ?? null;
  }
  return [...stops.values()];
}

/** The stops ticked by default on a delivery: the ones the truck has not
 *  delivered at in full yet — or every stop, once all have been (the operator
 *  is then re-logging the whole truck). */
export function openStops(stops: BillStop[]): BillStop[] {
  const open = stops.filter((stop) => stop.delivery_status !== 'DELIVERED');
  return open.length ? open : stops;
}

/** The `documents` to send for the stops the operator ticked: the bills of a
 *  strict subset of stops. Every stop ticked means the whole truck, and the
 *  update then names no bills — the way a delivery has always been logged. */
export function coveredDocuments(
  stops: BillStop[],
  picked: ReadonlySet<string>,
): number[] | undefined {
  const chosen = stops.filter((stop) => picked.has(stop.key));
  if (chosen.length === 0 || chosen.length === stops.length) return undefined;
  return chosen.flatMap((stop) => stop.bills.map((bill) => bill.id));
}

/** "2 of 5 locations delivered" while a multi-drop truck is between stops;
 *  blank before the first stop and once every stop is made, when the truck's
 *  own status already says it. */
export function deliveredStopsSummary(
  locations: ReadonlyArray<{ delivery_status?: DeliveryStatus }>,
): string {
  const total = locations.length;
  const delivered = locations.filter((location) => location.delivery_status === 'DELIVERED').length;
  if (total < 2 || delivered === 0 || delivered === total) return '';
  return `${delivered} of ${total} locations delivered`;
}
