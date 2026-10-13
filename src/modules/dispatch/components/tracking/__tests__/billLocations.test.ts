import { describe, expect, it } from 'vitest';

import type { TruckDispatchBill } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';

import {
  coveredDocuments,
  deliveredStopsSummary,
  groupBillsByStop,
  openStops,
  stopPlace,
} from '../billLocations';

const AGRA = {
  ship_to_code: 'CSD AGRA',
  ship_to_address: 'STATION ROAD\rAGRA-282001\rIN',
  place_of_supply: 'UP',
};
const HISAR = {
  ship_to_code: 'CSD HISAR',
  ship_to_address: 'OPP POLICE CHECK POST\rHISAR-125004\rIN',
  place_of_supply: 'HR',
};

const bill = (
  id: number,
  stop: typeof AGRA,
  overrides: Partial<TruckDispatchBill> = {},
): TruckDispatchBill => ({
  id,
  sap_doc_num: `6261${id}`,
  sap_doc_entry: id,
  customer_name: 'THE AREA MANAGER CANTEEN STORE DEPARTMENT',
  company: 'Jivo Oil',
  total_quantity: '100.000',
  sap_doc_total: null,
  delivery_status: null,
  delivered_date: null,
  items: [],
  ...stop,
  ...overrides,
});

describe('groupBillsByStop', () => {
  it('groups bills by customer + ship-to, in the order they come', () => {
    const stops = groupBillsByStop([bill(1, AGRA), bill(2, HISAR), bill(3, HISAR)]);

    expect(stops.map((stop) => [stop.ship_to_code, stop.documents])).toEqual([
      ['CSD AGRA', ['62611']],
      ['CSD HISAR', ['62612', '62613']],
    ]);
    expect(stops[1].bills.map((b) => b.id)).toEqual([2, 3]);
  });

  it("reads a stop's delivery off its bills", () => {
    const stops = groupBillsByStop([
      bill(1, AGRA, { delivery_status: 'DELIVERED', delivered_date: '2026-10-11' }),
      bill(2, HISAR, { delivery_status: 'DELIVERED', delivered_date: '2026-10-12' }),
      bill(3, HISAR),
      bill(4, { ...HISAR, ship_to_code: 'CSD BATHINDA' }),
    ]);

    expect(stops.map((stop) => [stop.delivery_status, stop.delivered_date])).toEqual([
      ['DELIVERED', '2026-10-11'],
      ['PARTIALLY_DELIVERED', '2026-10-12'],
      [null, null],
    ]);
  });

  it('a short bill makes its stop partially delivered', () => {
    const [stop] = groupBillsByStop([
      bill(1, AGRA, { delivery_status: 'PARTIALLY_DELIVERED', delivered_date: '2026-10-11' }),
    ]);
    expect(stop.delivery_status).toBe('PARTIALLY_DELIVERED');
  });

  it('still forms a stop for a bill from a backend that sends no ship-to', () => {
    const legacy = bill(1, AGRA) as Partial<TruckDispatchBill>;
    delete legacy.ship_to_code;
    delete legacy.ship_to_address;
    delete legacy.place_of_supply;
    delete legacy.delivery_status;

    const stops = groupBillsByStop([legacy as TruckDispatchBill]);
    expect(stops).toHaveLength(1);
    expect(stops[0].delivery_status).toBeNull();
    expect(stopPlace(stops[0])).toBe('');
  });
});

describe('openStops', () => {
  const stops = () =>
    groupBillsByStop([bill(1, AGRA, { delivery_status: 'DELIVERED' }), bill(2, HISAR)]);

  it('offers the stops not delivered in full yet', () => {
    expect(openStops(stops()).map((s) => s.ship_to_code)).toEqual(['CSD HISAR']);
  });

  it('offers every stop once all are made', () => {
    const all = groupBillsByStop([
      bill(1, AGRA, { delivery_status: 'DELIVERED' }),
      bill(2, HISAR, { delivery_status: 'DELIVERED' }),
    ]);
    expect(openStops(all)).toHaveLength(2);
  });
});

describe('coveredDocuments', () => {
  const stops = groupBillsByStop([bill(1, AGRA), bill(2, HISAR), bill(3, HISAR)]);

  it('names the bills of the stops ticked', () => {
    expect(coveredDocuments(stops, new Set([stops[1].key]))).toEqual([2, 3]);
  });

  it('names nothing when every stop is ticked — the whole truck', () => {
    expect(coveredDocuments(stops, new Set(stops.map((s) => s.key)))).toBeUndefined();
  });

  it('names nothing when no stop is ticked', () => {
    expect(coveredDocuments(stops, new Set())).toBeUndefined();
  });
});

describe('stopPlace', () => {
  it('is the last line of the address, without the country', () => {
    expect(stopPlace(AGRA)).toBe('AGRA-282001');
    expect(stopPlace({ ship_to_address: 'ONE LINE' })).toBe('ONE LINE');
  });
});

describe('deliveredStopsSummary', () => {
  it('counts the stops made while the truck is between them', () => {
    expect(
      deliveredStopsSummary([
        { delivery_status: 'DELIVERED' },
        { delivery_status: 'DELIVERED' },
        { delivery_status: 'PARTIALLY_DELIVERED' },
        { delivery_status: null },
        {},
      ]),
    ).toBe('2 of 5 locations delivered');
  });

  it('says nothing before the first stop, after the last, or on a one-stop truck', () => {
    expect(deliveredStopsSummary([{ delivery_status: null }, { delivery_status: null }])).toBe('');
    expect(
      deliveredStopsSummary([{ delivery_status: 'DELIVERED' }, { delivery_status: 'DELIVERED' }]),
    ).toBe('');
    expect(deliveredStopsSummary([{ delivery_status: 'DELIVERED' }])).toBe('');
  });
});
