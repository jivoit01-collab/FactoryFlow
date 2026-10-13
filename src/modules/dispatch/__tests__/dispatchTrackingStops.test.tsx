/**
 * Delivering a multi-drop truck one stop at a time from the tracking sheet:
 * the Delivered form offers the truck's stops, ticks the ones still to make,
 * and sends only their bills — so Agra can be delivered without Hisar.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DispatchTrackingPage as TrackingPage,
  DispatchTrackingTruck,
  TruckDispatchBill,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

import DispatchTrackingPage from '../pages/DispatchTrackingPage';

const AGRA = {
  customer_name: 'THE AREA MANAGER CANTEEN STORE DEPARTMENT',
  ship_to_code: 'CSD AGRA',
  ship_to_address: 'STATION ROAD\rAGRA-282001\rIN',
  place_of_supply: 'UP',
};
const HISAR = {
  customer_name: 'THE AREA MANAGER CANTEEN STORE DEPARTMENT',
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
  sap_doc_num: `62610803${id}`,
  sap_doc_entry: id,
  company: 'Jivo Oil',
  total_quantity: '100.000',
  sap_doc_total: null,
  delivery_status: null,
  delivered_date: null,
  items: [
    {
      id: id * 10,
      line_num: 1,
      item_code: `FG000${id}`,
      item_name: 'MUSTARD 1L',
      quantity: '100.000',
      uom: 'PCS',
    },
  ],
  ...stop,
  ...overrides,
});

const truck: DispatchTrackingTruck = {
  arrival: 1,
  arrival_no: 'ARV-0001',
  arrival_status: 'DEPARTED',
  vehicle: 1,
  vehicle_number: 'PB10AB1234',
  transporter_name: '',
  driver_name: 'Rinku',
  driver_mobile: '',
  gatepass_no: null,
  dispatched_at: '2026-10-10T17:48:00',
  companies: ['Jivo Oil'],
  documents: ['626108031', '626108032', '626108033'],
  customers: ['THE AREA MANAGER CANTEEN STORE DEPARTMENT'],
  customer_locations: [
    {
      ...AGRA,
      documents: ['626108031'],
      delivery_status: 'DELIVERED',
      delivered_date: '2026-10-11',
    },
    {
      ...HISAR,
      documents: ['626108032', '626108033'],
      delivery_status: null,
      delivered_date: null,
    },
  ],
  current_status: 'PARTIALLY_DELIVERED',
  current_status_display: 'Partially Delivered',
  last_update_at: '2026-10-11T12:00:00',
  update_count: 1,
  expected_reach_date: null,
  is_late: false,
  days_overdue: 0,
};

const mutateAsync = vi.hoisted(() => vi.fn());
const bills = vi.hoisted(() => ({ current: [] as TruckDispatchBill[] }));
const board = vi.hoisted(() => ({ current: null as TrackingPage | null }));

vi.mock('@/modules/dispatch/components/tracking/trackingExport', () => ({
  downloadTrackingSheet: vi.fn(),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('@/core/store/hooks', () => ({
  useGlobalDateRange: () => ({
    dateRange: { from: '2026-10-01', to: '2026-10-13' },
    dateRangeAsDateObjects: { from: new Date(2026, 9, 1), to: new Date(2026, 9, 13) },
    setDateRange: vi.fn(),
  }),
}));

vi.mock('@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries', () => ({
  useDispatchTrackingTrucks: () => ({
    data: board.current,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useTruckDispatchUpdates: () => ({ data: [], isLoading: false }),
  useTruckDispatchBills: () => ({ data: bills.current, isLoading: false }),
  useAddTruckDispatchUpdate: () => ({ mutateAsync, isPending: false }),
  useUploadReturnNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadProof: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSendDeliveryToSap: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const openSheet = () => {
  render(<DispatchTrackingPage />);
  fireEvent.click(screen.getByText('PB10AB1234').closest('[role="button"]') as HTMLElement);
  return screen.getByRole('dialog');
};

const pickDelivered = (sheet: HTMLElement) => {
  fireEvent.change(within(sheet).getByLabelText('Status'), { target: { value: 'DELIVERED' } });
};

const sentData = () => mutateAsync.mock.calls.at(-1)?.[0].data as { documents?: number[] };

describe('delivering one stop at a time', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ sap_receipts: [] });
    board.current = {
      results: [truck],
      count: 1,
      page: 1,
      page_size: 25,
      total_pages: 1,
      next: false,
      previous: false,
    };
    bills.current = [
      bill(1, AGRA, { delivery_status: 'DELIVERED', delivered_date: '2026-10-11' }),
      bill(2, HISAR),
      bill(3, HISAR),
    ];
  });

  it('shows which stops are made', () => {
    const sheet = openSheet();
    expect(within(sheet).getByText('1 of 2 locations delivered')).toBeInTheDocument();
    expect(within(sheet).getByText('Delivered 11 Oct 2026')).toBeInTheDocument();
  });

  it('offers the stops, ticks the ones still to deliver, and sends only their bills', async () => {
    const sheet = openSheet();
    pickDelivered(sheet);

    const agra = within(sheet).getByRole('checkbox', { name: 'Delivered at CSD AGRA' });
    const hisar = within(sheet).getByRole('checkbox', { name: 'Delivered at CSD HISAR' });
    expect(agra).toHaveAttribute('aria-checked', 'false');
    expect(hisar).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(within(sheet).getByRole('button', { name: 'Add update' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(sentData().documents).toEqual([2, 3]);
  });

  it('ticking every stop logs the whole truck, as a delivery always did', async () => {
    const sheet = openSheet();
    pickDelivered(sheet);
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Delivered at CSD AGRA' }));

    fireEvent.click(within(sheet).getByRole('button', { name: 'Add update' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(sentData().documents).toBeUndefined();
  });

  it('refuses a delivery at no stop', async () => {
    const sheet = openSheet();
    pickDelivered(sheet);
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Delivered at CSD HISAR' }));

    fireEvent.click(within(sheet).getByRole('button', { name: 'Add update' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('asks what came back only for the stops being delivered', () => {
    const sheet = openSheet();
    fireEvent.change(within(sheet).getByLabelText('Status'), {
      target: { value: 'PARTIALLY_DELIVERED' },
    });

    // Hisar's two bills are listed for the short split; Agra's, delivered
    // earlier, is not. (The stop picker and the locations block name the bill
    // too, so look only inside the split section.)
    const section = within(sheet)
      .getByText('What came back?')
      .closest('.rounded-md') as HTMLElement;
    expect(within(section).getByText('626108032')).toBeInTheDocument();
    expect(within(section).getByText('626108033')).toBeInTheDocument();
    expect(within(section).queryByText('626108031')).not.toBeInTheDocument();
  });

  it('does not ask on a one-stop truck', () => {
    bills.current = [bill(2, HISAR), bill(3, HISAR)];
    const sheet = openSheet();
    pickDelivered(sheet);

    expect(within(sheet).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
