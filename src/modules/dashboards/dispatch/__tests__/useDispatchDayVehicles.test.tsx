import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SalesDispatchGateOut } from '@/modules/gate/api/salesDispatch/salesDispatch.api';

import { useBoardDay } from '../hooks/boardDay.context';
import { BoardDayProvider } from '../hooks/BoardDayProvider';
import { useDispatchDayVehicles } from '../hooks/useDispatchDayVehicles';

const list = vi.fn();
vi.mock('@/modules/gate/api/salesDispatch/salesDispatch.api', () => ({
  salesDispatchApi: { list: () => list() as Promise<SalesDispatchGateOut[]> },
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
});
