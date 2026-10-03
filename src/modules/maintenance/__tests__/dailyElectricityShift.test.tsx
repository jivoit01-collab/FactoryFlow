import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

// A meter is read twice a day, as on Daily Electricity++: the day round, then
// the night round, which opens on the day's closing. Today's day round is in;
// yesterday's night closed on 1400.
const METER = {
  id: 1,
  name: 'HT Incomer',
  meter_number: 'HT-01',
  location: 'Substation',
  company_codes: [],
  companies_display: 'Jivo Oil',
  rate_per_unit: '9.0000',
  multiplying_factor: '1.0000',
  last_reading_date: '2026-10-03',
  last_closing_reading: '1500.00',
  readings_count: 2,
  is_active: true,
};

const reading = (
  id: number,
  date: string,
  shift: 'DAY' | 'NIGHT',
  opening: string,
  closing: string,
) => ({
  id,
  meter: 1,
  meter_name: 'HT Incomer',
  meter_companies_display: 'Jivo Oil',
  company_codes: [],
  consumer_codes: [],
  attribution_display: 'Jivo Oil',
  date,
  shift,
  reading_time: '06:00:00',
  opening_reading: opening,
  closing_reading: closing,
  dial_difference: '100.00',
  multiplying_factor: '1.0000',
  units_consumed: '100.00',
  rate_per_unit: '9.0000',
  total_cost: '900.00',
  remarks: '',
  created_by_name: 'Operator',
});

const READINGS = [
  reading(2, '2026-10-03', 'DAY', '1400.00', '1500.00'),
  reading(1, '2026-10-02', 'NIGHT', '1300.00', '1400.00'),
];

const createReading = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [METER], isLoading: false }),
  useElectricityConsumers: () => ({ data: [], isLoading: false }),
  // The register and the opening lookup both read this meter's readings.
  useDailyElectricityReadings: () => ({ data: READINGS, isLoading: false }),
  useCreateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: createReading, isPending: false }),
  useUpdateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMeterScope: () => ({
    scopeKnown: true,
    unrestricted: true,
    ids: new Set<number>(),
    names: [],
    manages: () => true,
    managesNothing: false,
  }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) =>
      permission === MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
    hasAnyPermission: () => true,
  }),
}));

const dialog = () => within(screen.getByRole('dialog'));
const shiftButton = (name: 'Day' | 'Night') => dialog().getByRole('button', { name });
const renderPage = () =>
  render(
    <MemoryRouter>
      <MaintenanceDailyElectricityPage />
    </MemoryRouter>,
  );

describe('Daily Electricity — day and night readings', () => {
  beforeAll(() => {
    // Only the clock: React Query and waitFor still need real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T06:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(() => createReading.mockClear());

  it('says which round each reading is', () => {
    renderPage();
    const night = screen.getByText('2026-10-02').closest('tr') as HTMLElement;
    const day = screen.getByText('2026-10-03').closest('tr') as HTMLElement;
    expect(within(night).getByText('Night')).toBeInTheDocument();
    expect(within(day).getByText('Day')).toBeInTheDocument();
  });

  it('opens a night on its day’s closing, and sends the round', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /add reading/i }));
    fireEvent.change(dialog().getByLabelText('Meter'), { target: { value: '1' } });

    // The day round opens on last night's closing.
    expect(shiftButton('Day')).toHaveAttribute('aria-pressed', 'true');
    expect(dialog().getByLabelText('Opening Reading')).toHaveValue(1400);

    fireEvent.click(shiftButton('Night'));
    expect(shiftButton('Night')).toHaveAttribute('aria-pressed', 'true');
    expect(dialog().getByLabelText('Opening Reading')).toHaveValue(1500);
    expect(dialog().getByText('Opens on the 2026-10-03 closing: 1500.00')).toBeInTheDocument();

    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1600' } });
    fireEvent.click(dialog().getByRole('button', { name: /^add reading$/i }));
    await waitFor(() => expect(createReading).toHaveBeenCalled());
    expect(createReading.mock.calls[0][0]).toMatchObject({
      meter: 1,
      date: '2026-10-03',
      shift: 'NIGHT',
      opening_reading: '1500.00',
      closing_reading: '1600',
    });

    // The next meter of the round opens on the night too.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add reading/i }));
    expect(shiftButton('Night')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps an opening typed over the carried one', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /add reading/i }));
    fireEvent.change(dialog().getByLabelText('Meter'), { target: { value: '1' } });
    fireEvent.change(dialog().getByLabelText('Opening Reading'), { target: { value: '1450' } });
    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1500' } });
    expect(dialog().getByLabelText('Opening Reading')).toHaveValue(1450);
    expect(dialog().getByText(/Dial: 50 × MF 1 = 50 units/)).toBeInTheDocument();
  });

  it('opens a night reading for correction on the night', () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit 2026-10-02 night reading for HT Incomer' }),
    );
    expect(shiftButton('Night')).toHaveAttribute('aria-pressed', 'true');
    expect(dialog().getByLabelText('Opening Reading')).toHaveValue(1300);
  });
});
