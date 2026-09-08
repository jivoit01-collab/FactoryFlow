import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmptyVehicleGateInEntry } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api';
import type {
  SalesDispatchGateOut,
  SalesDispatchPendingBooking,
} from '@/modules/gate/api/salesDispatch/salesDispatch.api';

import { useBoardDay } from '../hooks/boardDay.context';
import { BoardDayProvider } from '../hooks/BoardDayProvider';
import { useDispatchDayVehicles } from '../hooks/useDispatchDayVehicles';

const list = vi.fn();
const pendingBookings = vi.fn();
vi.mock('@/modules/gate/api/salesDispatch/salesDispatch.api', () => ({
  salesDispatchApi: {
    list: () => list() as Promise<SalesDispatchGateOut[]>,
    pendingBookings: () => pendingBookings() as Promise<SalesDispatchPendingBooking[]>,
  },
}));

const gateIns = vi.fn();
vi.mock('@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api', () => ({
  emptyVehicleInApi: { list: () => gateIns() as Promise<EmptyVehicleGateInEntry[]> },
}));

/** 2026-08-27 14:00 local — the day every fixture below is written against. */
const NOW = new Date(2026, 7, 27, 14, 0, 0);
const TODAY = '2026-08-27';
const YESTERDAY = '2026-08-26';

let nextId = 1;

/** Only the fields the wall reads; the rest of the docking is irrelevant here. */
function docking(overrides: Partial<SalesDispatchGateOut>) {
  nextId += 1;
  return {
    id: nextId,
    entry_no: `DCK-${nextId}`,
    company: 1,
    company_code: 'OIL',
    company_name: 'JIVO OIL',
    vehicle_entry: 1,
    vehicle_entry_no: `VE-${nextId}`,
    vehicle_entry_status: 'IN_PROGRESS',
    vehicle: 1,
    driver: 1,
    document_type: 'INVOICE',
    sap_doc_entry: nextId,
    sap_doc_num: `INV-${nextId}`,
    vehicle_no: 'HR55AB1234',
    driver_name: 'Driver',
    driver_mobile_no: '',
    status: 'DOCKED',
    gatepass_readiness: {},
    items: [],
    attachments: [],
    created_at: `${TODAY}T04:00:00Z`,
    updated_at: `${TODAY}T04:00:00Z`,
    ...overrides,
  } as unknown as SalesDispatchGateOut;
}

/** A dispatch truck standing inside the plant, as the gate register reports it. */
function gateIn(overrides: Partial<EmptyVehicleGateInEntry>) {
  nextId += 1;
  return {
    id: nextId,
    entry_no: `EVGI-${nextId}`,
    company_code: 'BEV',
    company_name: 'JIVO BEVERAGES',
    vehicle_number: 'DL01LA0000',
    transporter_name: 'Bhargave Road Carrier',
    reason: 'DISPATCH',
    gate_in_date: TODAY,
    in_time: '09:53:00',
    ...overrides,
  } as unknown as EmptyVehicleGateInEntry;
}

/** A bill booked to a truck that has arrived and has no docking yet. */
function pending(overrides: Partial<SalesDispatchPendingBooking>) {
  nextId += 1;
  return {
    row_type: 'PENDING_BOOKING',
    id: `pending-${nextId}`,
    company_code: 'BEV',
    company_name: 'JIVO BEVERAGES',
    vehicle_no: 'DL01LA0000',
    transporter_name: 'Bhargave Road Carrier',
    document_count: 1,
    status: 'PENDING_DOCKING',
    ...overrides,
  } as unknown as SalesDispatchPendingBooking;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <BoardDayProvider>{children}</BoardDayProvider>
    </QueryClientProvider>
  );
}

async function renderVehicles() {
  const view = renderHook(() => useDispatchDayVehicles(), { wrapper });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

/** Same, but with the board back-dated to `date` before it reads anything. */
async function renderVehiclesOn(date: string) {
  const view = renderHook(
    () => {
      const day = useBoardDay();
      const setDate = day.setDate;
      useEffect(() => {
        setDate(date);
      }, [setDate]);
      return useDispatchDayVehicles();
    },
    { wrapper },
  );
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  list.mockReset();
  // The gate reads are additive, so most cases want them silent.
  gateIns.mockReset();
  gateIns.mockResolvedValue([]);
  pendingBookings.mockReset();
  pendingBookings.mockResolvedValue([]);
  nextId = 1;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDispatchDayVehicles', () => {
  it('counts a truck once however many dockings it carries', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-1',
        company_code: 'OIL',
        company_name: 'JIVO OIL',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 11, 0).toISOString(),
        sap_doc_total: '100000',
        total_boxes: '200',
      }),
      docking({
        arrival_no: 'ARV-1',
        company_code: 'MART',
        company_name: 'JIVO MART',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 11, 5).toISOString(),
        sap_doc_total: '50000',
        total_boxes: '80',
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.totalCount).toBe(1);
    expect(result.current.outCount).toBe(1);
    expect(result.current.out[0].companies).toEqual(['JIVO OIL', 'JIVO MART']);
    expect(result.current.out[0].amount).toBe(150_000);
    expect(result.current.out[0].boxes).toBe(280);
  });

  it('keeps a shared truck IN until every company on it has been dispatched', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-2',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 9, 0).toISOString(),
      }),
      docking({ arrival_no: 'ARV-2', status: 'GATEPASS_PRINTED' }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.inCount).toBe(1);
    expect(result.current.outCount).toBe(0);
    // The stale out-stamp must not survive: the truck has not left.
    expect(result.current.inside[0].outAt).toBeNull();
    // Headline status is the furthest-along docking on the truck.
    expect(result.current.inside[0].status).toBe('GATEPASS_PRINTED');
  });

  it('keeps a truck that docked days ago and is still inside', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-3',
        status: 'DOCKED',
        created_at: '2026-08-24T05:00:00Z',
        docked_at: '2026-08-24T05:00:00Z',
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.inCount).toBe(1);
    expect(result.current.inside[0].inAt).toBe('2026-08-24T05:00:00Z');
  });

  it('drops trucks that left before today, and dead dockings', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-4',
        status: 'DISPATCHED',
        gate_out_date: YESTERDAY,
        dispatched_at: new Date(2026, 7, 26, 16, 0).toISOString(),
      }),
      docking({ arrival_no: 'ARV-5', status: 'REJECTED' }),
      docking({ arrival_no: 'ARV-6', status: 'CANCELLED' }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.totalCount).toBe(0);
  });

  it('splits value by company on the docking, not on the truck', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-7',
        company_code: 'OIL',
        company_name: 'JIVO OIL',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 10, 0).toISOString(),
        sap_doc_total: '300000',
      }),
      docking({
        arrival_no: 'ARV-7',
        company_code: 'BEV',
        company_name: 'JIVO BEVERAGES',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 10, 2).toISOString(),
        sap_doc_total: '100000',
      }),
    ]);

    const { result } = await renderVehicles();

    const oil = result.current.byCompany.find((row) => row.code === 'OIL');
    const bev = result.current.byCompany.find((row) => row.code === 'BEV');
    expect(oil?.amount).toBe(300_000);
    expect(bev?.amount).toBe(100_000);
    // One physical truck, but it counts for both companies it served.
    expect(oil?.trucksOut).toBe(1);
    expect(bev?.trucksOut).toBe(1);
    // Biggest first.
    expect(result.current.byCompany[0].code).toBe('OIL');
  });

  it('counts a vendor once per truck and only bills the ones that left', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-8',
        transporter_name: 'Amod Kumar Tpt.',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 8, 0).toISOString(),
        sap_doc_total: '80000',
      }),
      docking({
        arrival_no: 'ARV-8',
        transporter_name: 'Amod Kumar Tpt.',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 8, 1).toISOString(),
        sap_doc_total: '20000',
      }),
      docking({ arrival_no: 'ARV-9', transporter_name: 'Amod Kumar Tpt.', status: 'DOCKED' }),
    ]);

    const { result } = await renderVehicles();

    const vendor = result.current.byVendor[0];
    expect(vendor.name).toBe('Amod Kumar Tpt.');
    expect(vendor.trucks).toBe(2);
    expect(vendor.trucksOut).toBe(1);
    expect(vendor.trucksIn).toBe(1);
    // The truck still inside has earned nothing yet.
    expect(vendor.amount).toBe(100_000);
  });

  it('totals a vendor by litres, which SAP records more reliably than weight', async () => {
    list.mockResolvedValue([
      // Taken from a real docking: SAP put 195 kg against 2,195 litres of olive
      // oil -- the litres figure with its leading digit lost. The panel leads
      // with litres precisely so one row like this cannot make a vendor look
      // like it shipped nothing.
      docking({
        arrival_no: 'ARV-OIL',
        transporter_name: 'Jivo Wellness',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 10, 0).toISOString(),
        sap_doc_total: '504850',
        total_litres: '2195',
        total_weight: '195',
        total_boxes: '0',
      }),
    ]);

    const { result } = await renderVehicles();

    const vendor = result.current.byVendor[0];
    expect(vendor.litres).toBe(2195);
    expect(vendor.boxes).toBe(0);
    // The bad figure is still carried, just not what the row leads with.
    expect(vendor.weightKg).toBe(195);
  });

  it('bins departures by local hour', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-10',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 9, 15).toISOString(),
      }),
      docking({
        arrival_no: 'ARV-11',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 9, 50).toISOString(),
      }),
      docking({
        arrival_no: 'ARV-12',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 13, 5).toISOString(),
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.outByHour[9]).toBe(2);
    expect(result.current.outByHour[13]).toBe(1);
  });

  it('sorts trucks inside by longest wait and departures by most recent', async () => {
    list.mockResolvedValue([
      docking({ arrival_no: 'IN-late', status: 'DOCKED', docked_at: `${TODAY}T09:00:00Z` }),
      docking({ arrival_no: 'IN-early', status: 'DOCKED', docked_at: `${TODAY}T05:00:00Z` }),
      docking({
        arrival_no: 'OUT-old',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 8, 0).toISOString(),
      }),
      docking({
        arrival_no: 'OUT-new',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 12, 0).toISOString(),
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.inside.map((truck) => truck.arrivalNo)).toEqual(['IN-early', 'IN-late']);
    expect(result.current.out.map((truck) => truck.arrivalNo)).toEqual(['OUT-new', 'OUT-old']);
  });

  it('reads IN as "was inside when that day ended", not as "inside now"', async () => {
    list.mockResolvedValue([
      // Docked on the 25th and dispatched on the 27th. On the 26th it was
      // standing in the yard, even though today it is long gone — a live status
      // flag would call it dispatched and lose it from that Wednesday entirely.
      docking({
        arrival_no: 'ARV-SLOW',
        status: 'DISPATCHED',
        docked_at: new Date(2026, 7, 25, 10, 0).toISOString(),
        created_at: new Date(2026, 7, 25, 10, 0).toISOString(),
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 9, 0).toISOString(),
      }),
    ]);

    const { result } = await renderVehiclesOn('2026-08-26');

    expect(result.current.inCount).toBe(1);
    expect(result.current.outCount).toBe(0);
    expect(result.current.inside[0].arrivalNo).toBe('ARV-SLOW');
  });

  it('counts a truck as OUT on the day it actually left, not on today', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-GONE',
        status: 'DISPATCHED',
        docked_at: new Date(2026, 7, 26, 8, 0).toISOString(),
        created_at: new Date(2026, 7, 26, 8, 0).toISOString(),
        gate_out_date: '2026-08-26',
        dispatched_at: new Date(2026, 7, 26, 15, 0).toISOString(),
        sap_doc_total: '70000',
      }),
    ]);

    const onThatDay = await renderVehiclesOn('2026-08-26');
    expect(onThatDay.result.current.outCount).toBe(1);
    expect(onThatDay.result.current.byVendor[0].amount).toBe(70_000);

    // …and it is simply absent from today, which it had nothing to do with.
    const { result } = await renderVehicles();
    expect(result.current.totalCount).toBe(0);
  });

  it('splits one customer into trucks out and trucks still inside', async () => {
    list.mockResolvedValue([
      // Two loads for the same customer on the same day. One cleared the gate,
      // the other is still at the dock. The summary endpoint counts gate-outs
      // only and would show this customer as a single shipped truck.
      docking({
        arrival_no: 'ARV-GONE',
        customer_name: 'WAL MART INDIA PVT LTD',
        customer_code: 'CUSTA000441',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 11, 0).toISOString(),
        sap_doc_total: '400000',
        total_litres: '4000',
      }),
      docking({
        arrival_no: 'ARV-LOADING',
        customer_name: 'WAL MART INDIA PVT LTD',
        customer_code: 'CUSTA000441',
        status: 'DOCKED',
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.byCustomer).toHaveLength(1);
    const customer = result.current.byCustomer[0];
    expect(customer.name).toBe('WAL MART INDIA PVT LTD');
    expect(customer.trucks).toBe(2);
    expect(customer.trucksOut).toBe(1);
    expect(customer.trucksIn).toBe(1);
    // Only the load that actually left is worth anything yet.
    expect(customer.amount).toBe(400_000);
    expect(customer.litres).toBe(4000);
  });

  it('keeps a customer whose every truck is still loading', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-WAIT',
        customer_name: 'SHRI HARI TRADERS',
        customer_code: 'CUSTA001147',
        status: 'DOCKED',
      }),
    ]);

    const { result } = await renderVehicles();

    const customer = result.current.byCustomer[0];
    expect(customer.trucksOut).toBe(0);
    expect(customer.trucksIn).toBe(1);
    // Nothing shipped, so no value — but the row must still exist, because a
    // loaded truck that has not left is the one somebody has to chase.
    expect(customer.amount).toBe(0);
  });

  it('splits a shared docking into its real customers instead of inventing one', async () => {
    list.mockResolvedValue([
      // A docking carrying bills for two customers stores them joined in one
      // field. Grouping on the raw string would create a third "customer"
      // called "RAJEEV TRADING COMPANY, ANAND ENTERPRISES".
      docking({
        arrival_no: 'ARV-SHARED',
        customer_name: 'RAJEEV TRADING COMPANY, ANAND ENTERPRISES',
        customer_code: 'CUSTA000926, CUSTA000171',
        document_count: 3,
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 12, 0).toISOString(),
        sap_doc_total: '300000',
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.byCustomer.map((c) => c.name).sort()).toEqual([
      'ANAND ENTERPRISES',
      'RAJEEV TRADING COMPANY',
    ]);
    // One SAP total covers every bill on the docking and the joined field does
    // not say which bill belongs to whom, so it is divided evenly — and the two
    // halves still add up to the money the headline reports.
    const total = result.current.byCustomer.reduce((sum, c) => sum + c.amount, 0);
    expect(total).toBe(300_000);
    for (const customer of result.current.byCustomer) {
      expect(customer.amount).toBe(150_000);
      expect(customer.sharedLoads).toBe(1);
      // One physical truck, counted once for each customer it served.
      expect(customer.trucks).toBe(1);
      expect(customer.trucksOut).toBe(1);
    }
  });

  it('keys customers on the SAP code, so a renamed account stays one row', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-A',
        customer_name: 'VARDHMAN TRADERS',
        customer_code: 'CUSTA000777',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 9, 0).toISOString(),
        sap_doc_total: '100000',
      }),
      docking({
        arrival_no: 'ARV-B',
        customer_name: 'VARDHMAN TRADERS LUDHIANA',
        customer_code: 'CUSTA000777',
        status: 'DISPATCHED',
        gate_out_date: TODAY,
        dispatched_at: new Date(2026, 7, 27, 10, 0).toISOString(),
        sap_doc_total: '50000',
      }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.byCustomer).toHaveLength(1);
    expect(result.current.byCustomer[0].amount).toBe(150_000);
    expect(result.current.byCustomer[0].trucksOut).toBe(2);
  });

  it('shows a truck from the moment it gate-ins, before anybody docks it', async () => {
    list.mockResolvedValue([]);
    gateIns.mockResolvedValue([
      gateIn({ vehicle_number: 'DL01LAR2914', arrival_no: 'ARV-G1' }),
      gateIn({ vehicle_number: 'DL01LAR7060', arrival_no: 'ARV-G2', in_time: '09:55:00' }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.totalCount).toBe(2);
    expect(result.current.inCount).toBe(2);
    expect(result.current.outCount).toBe(0);
    // Longest inside leads.
    expect(result.current.inside.map((truck) => truck.vehicleNo)).toEqual([
      'DL01LAR2914',
      'DL01LAR7060',
    ]);
    expect(result.current.inside[0].status).toBe('PENDING_DOCKING');
    // Nothing is loaded yet, so no truck is claimed to be scanning.
    expect(result.current.scanningCount).toBe(0);
    // The company panel has to agree with the vehicle list beside it.
    expect(result.current.byCompany).toHaveLength(1);
    expect(result.current.byCompany[0].trucksIn).toBe(2);
    expect(result.current.byCompany[0].amount).toBe(0);
  });

  it('folds a gate-in onto its own docking instead of listing the truck twice', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-H',
        vehicle_no: 'RJ10GB3459',
        status: 'DOCKED',
        docked_at: `${TODAY}T13:33:00Z`,
      }),
    ]);
    gateIns.mockResolvedValue([
      gateIn({
        vehicle_number: 'rj10gb3459',
        arrival_no: 'ARV-H',
        company_code: 'OIL',
        company_name: 'JIVO OIL',
        in_time: '15:53:00',
      }),
    ]);

    const { result } = await renderVehicles();

    // Matched on the plate whatever case the register wrote it in.
    expect(result.current.totalCount).toBe(1);
    // The dwell clock runs from the barrier, not from the dock: 15:53 local is
    // the earlier of the two stamps, though it sorts later as a string than the
    // docking's 13:33Z. Comparing them lexically is what would pick the wrong one.
    expect(result.current.inside[0].inAt).toBe(new Date(`${TODAY}T15:53:00`).toISOString());
    // A real docking status always outranks "waiting to dock".
    expect(result.current.inside[0].status).toBe('DOCKED');
    expect(result.current.inside[0].companies).toEqual(['JIVO OIL']);
  });

  it('takes the gate-in stamp when it beats the docking stamp', async () => {
    list.mockResolvedValue([
      docking({
        arrival_no: 'ARV-I',
        vehicle_no: 'RJ10GB3459',
        status: 'DOCKED',
        docked_at: new Date(2026, 7, 27, 13, 30).toISOString(),
      }),
    ]);
    gateIns.mockResolvedValue([
      gateIn({ vehicle_number: 'RJ10GB3459', arrival_no: 'ARV-I', in_time: '09:53:00' }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.inside[0].inAt).toBe(new Date(2026, 7, 27, 9, 53).toISOString());
  });

  it('carries the bills a waiting truck is still owed', async () => {
    list.mockResolvedValue([]);
    gateIns.mockResolvedValue([gateIn({ vehicle_number: 'DL01LAC8007', arrival_no: 'ARV-J' })]);
    pendingBookings.mockResolvedValue([
      pending({
        vehicle_no: 'DL01LAC8007',
        company_code: 'OIL',
        company_name: 'JIVO OIL',
        customer_code: 'CUSTA000555',
        customer_name: 'BANWARI LAL GARG & CO.',
        document_count: 2,
      }),
      pending({ vehicle_no: 'DL01LAC8007', document_count: 1 }),
    ]);

    const { result } = await renderVehicles();

    expect(result.current.totalCount).toBe(1);
    expect(result.current.inside[0].bills).toBe(3);
    expect(result.current.inside[0].companies).toEqual(['JIVO BEVERAGES', 'JIVO OIL']);
    expect(result.current.inside[0].customers).toEqual(['BANWARI LAL GARG & CO.']);
    // Waiting is not shipping: the customer is on the board with no money.
    expect(result.current.byCustomer).toHaveLength(1);
    expect(result.current.byCustomer[0].trucksIn).toBe(1);
    expect(result.current.byCustomer[0].amount).toBe(0);
  });

  it('leaves a back-dated board to the docking register alone', async () => {
    list.mockResolvedValue([]);
    gateIns.mockResolvedValue([gateIn({ vehicle_number: 'DL01LAR2914', arrival_no: 'ARV-K' })]);

    const { result } = await renderVehiclesOn(YESTERDAY);

    // "Still inside" is a fact about this minute; asking it about yesterday
    // would strand today's trucks in a day they were not in.
    expect(result.current.totalCount).toBe(0);
    expect(result.current.trucks).toEqual([]);
  });

  it('still paints the docked trucks when the gate read fails', async () => {
    list.mockResolvedValue([docking({ arrival_no: 'ARV-L', status: 'DOCKED' })]);
    gateIns.mockRejectedValue(Object.assign(new Error('nope'), { status: 500 }));
    pendingBookings.mockRejectedValue(Object.assign(new Error('nope'), { status: 500 }));

    const { result } = await renderVehicles();

    expect(result.current.totalCount).toBe(1);
    expect(result.current.isError).toBe(false);
  });
});
