import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DispatchTrackingPage as TrackingPage,
  DispatchTrackingTruck,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

import DispatchTrackingPage from '../pages/DispatchTrackingPage';

const truck = (overrides: Partial<DispatchTrackingTruck>): DispatchTrackingTruck => ({
  arrival: 1,
  arrival_no: 'ARV-0001',
  arrival_status: 'DEPARTED',
  vehicle: 1,
  vehicle_number: 'PB10AB1234',
  transporter_name: '',
  driver_name: 'Gurpreet',
  driver_mobile: '',
  gatepass_no: null,
  dispatched_at: '2026-09-20T09:15:00',
  companies: ['Jivo Oil'],
  documents: ['626030549'],
  customers: ['R K WORLDINFOCOM PVT LTD'],
  customer_locations: [],
  current_status: 'DISPATCHED',
  current_status_display: 'Dispatched',
  last_update_at: null,
  update_count: 0,
  expected_reach_date: null,
  is_late: false,
  days_overdue: 0,
  ...overrides,
});

const board = vi.hoisted(() => ({ current: null as TrackingPage | null }));
const mockDownload = vi.hoisted(() => vi.fn());

vi.mock('@/modules/dispatch/components/tracking/trackingExport', () => ({
  downloadTrackingSheet: (args: unknown) => mockDownload(args),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => false }),
}));

vi.mock('@/core/store/hooks', () => ({
  useGlobalDateRange: () => ({
    dateRange: { from: '2026-09-01', to: '2026-09-24' },
    dateRangeAsDateObjects: { from: new Date(2026, 8, 1), to: new Date(2026, 8, 24) },
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
  useTruckDispatchBills: () => ({ data: [], isLoading: false }),
  useAddTruckDispatchUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadReturnNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const pageOf = (results: DispatchTrackingTruck[], extra: Partial<TrackingPage> = {}) => ({
  results,
  count: results.length,
  page: 1,
  page_size: 25,
  total_pages: 1,
  next: false,
  previous: false,
  ...extra,
});

describe('Export Excel', () => {
  beforeEach(() => mockDownload.mockClear());

  it('hands over exactly the trucks on screen, with the page they are', () => {
    board.current = pageOf(
      [
        truck({ arrival: 1, vehicle_number: 'PB10AB1234' }),
        truck({ arrival: 2, vehicle_number: 'HR55C0001' }),
      ],
      { count: 60, page: 2, total_pages: 3 },
    );
    render(<DispatchTrackingPage />);

    fireEvent.click(screen.getByRole('button', { name: /export excel/i }));

    const args = mockDownload.mock.calls.at(-1)?.[0] as {
      trucks: DispatchTrackingTruck[];
      page: number;
      totalPages: number;
      dateFrom: string;
      dateTo: string;
    };
    expect(args.trucks.map((t) => t.vehicle_number)).toEqual(['PB10AB1234', 'HR55C0001']);
    expect(args).toMatchObject({
      page: 2,
      totalPages: 3,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-24',
    });
  });

  it('is off when there is nothing on screen to export', () => {
    board.current = pageOf([]);
    render(<DispatchTrackingPage />);

    expect(screen.getByRole('button', { name: /export excel/i })).toBeDisabled();
  });
});

describe('the truck sheet', () => {
  const open = (vehicle: string) => {
    render(<DispatchTrackingPage />);
    fireEvent.click(screen.getByText(vehicle).closest('[role="button"]') as HTMLElement);
    return screen.getByRole('dialog');
  };

  it("shows where each customer is, off the truck's bills", () => {
    board.current = pageOf([
      truck({
        customer_locations: [
          {
            customer_name: 'R K WORLDINFOCOM PVT LTD',
            ship_to_code: 'R K WORLDINFOCOM PVT LTD GURUGRAM',
            ship_to_address: 'VILLAGE RAHAKA  ESR SOHNA LOGISTICS PARK\rGURUGRAM-122103\rIN',
            place_of_supply: 'HR',
            documents: ['626030549', '626030604'],
          },
        ],
      }),
    ]);
    const sheet = open('PB10AB1234');

    const locations = within(sheet).getByText('Customer location').parentElement as HTMLElement;
    expect(
      within(locations).getByText('Ship to R K WORLDINFOCOM PVT LTD GURUGRAM'),
    ).toBeInTheDocument();
    expect(
      within(locations).getByText('VILLAGE RAHAKA ESR SOHNA LOGISTICS PARK'),
    ).toBeInTheDocument();
    expect(within(locations).getByText('GURUGRAM-122103')).toBeInTheDocument();
    // The country code SAP closes every address on is noise here.
    expect(within(locations).queryByText('IN')).not.toBeInTheDocument();
    expect(within(locations).getByText('HR')).toBeInTheDocument();
    expect(within(locations).getByText('626030549, 626030604')).toBeInTheDocument();
  });

  it('still opens for a truck from a backend that sends no locations yet', () => {
    const older: Partial<DispatchTrackingTruck> = truck({});
    delete older.customer_locations;
    board.current = pageOf([older as DispatchTrackingTruck]);
    const sheet = open('PB10AB1234');

    expect(
      within(sheet).getByText('No customer address on this truck’s bills.'),
    ).toBeInTheDocument();
  });
});
