import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { COMPANY_CODES } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

/**
 * Who a day's units were for, and when the dial was read.
 *
 * The register used to answer the first question with the meter master, which
 * meant it could only ever say who the meter USUALLY feeds. The form now fills
 * itself from the meter and lets the operator narrow it — including onto
 * Sidle, who is on the factory's supply without being a Jivo company.
 */

const SHARED_METER = {
  id: 1,
  name: 'Main Incomer',
  meter_number: 'MI-01',
  location: 'Substation',
  company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
  consumer_codes: [],
  companies_display: 'Jivo Oil, Jivo Beverages',
  rate_per_unit: '8.5000',
  multiplying_factor: '1.0000',
  last_reading_date: '2026-08-20',
  last_closing_reading: '1500.00',
  readings_count: 4,
  is_active: true,
};

// A day that did NOT go where the meter usually sends it, plus the time it was
// read — both of which the row has to show.
const READING = {
  id: 9,
  meter: 1,
  meter_name: 'Main Incomer',
  meter_companies_display: 'Jivo Oil, Jivo Beverages',
  company_codes: [COMPANY_CODES.JIVO_BEVERAGES],
  consumer_codes: [],
  attribution_display: 'Jivo Beverages',
  date: '2026-08-20',
  reading_time: '06:30:00',
  opening_reading: '1400.00',
  closing_reading: '1500.00',
  dial_difference: '100.00',
  multiplying_factor: '1.0000',
  units_consumed: '100.00',
  rate_per_unit: '8.5000',
  total_cost: '850.00',
  remarks: '',
  created_by_name: 'Operator',
};

const readingFilters = vi.hoisted(() => ({ current: undefined as unknown }));
const rows = vi.hoisted(() => ({ current: null as unknown[] | null }));
const createReading = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [SHARED_METER], isLoading: false }),
  useElectricityConsumers: () => ({
    data: [{ id: 1, name: 'Sidle', code: 'SIDLE', is_active: true }],
    isLoading: false,
  }),
  useDailyElectricityReadings: (filters: unknown) => {
    readingFilters.current = filters;
    return { data: rows.current ?? [READING], isLoading: false };
  },
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

// The page's own filter bar has a Meter select too, so every field below is
// looked up inside the open dialog.
const dialog = () => within(screen.getAllByRole('dialog').at(-1) as HTMLElement);

function openAddReadingOnTheSharedMeter() {
  render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /add reading/i }));
  fireEvent.change(dialog().getByLabelText('Meter'), { target: { value: '1' } });
}

const box = (name: RegExp) => dialog().getByRole('checkbox', { name }) as HTMLInputElement;

describe('Daily Electricity — who a reading is for', () => {
  it('fills the attribution from the meter and says which are the meter’s', () => {
    openAddReadingOnTheSharedMeter();

    expect(box(/jivo oil/i)).toBeChecked();
    expect(box(/jivo beverages/i)).toBeChecked();
    expect(box(/jivo mart/i)).not.toBeChecked();
    expect(box(/sidle/i)).not.toBeChecked();

    // The two the meter feeds are marked as such, so the operator can see what
    // they are changing away from.
    expect(dialog().getAllByText('(on this meter)')).toHaveLength(2);
    expect(
      dialog().getByText(/Filled from Main Incomer \(Jivo Oil, Jivo Beverages\)/),
    ).toBeInTheDocument();
  });

  it('sends the day narrowed to the company it actually ran for', async () => {
    openAddReadingOnTheSharedMeter();
    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1600' } });
    fireEvent.click(box(/jivo oil/i));
    fireEvent.click(dialog().getByRole('button', { name: /^add reading$/i }));

    await waitFor(() => expect(createReading).toHaveBeenCalled());
    expect(createReading.mock.calls[0][0]).toMatchObject({
      meter: 1,
      company_codes: [COMPANY_CODES.JIVO_BEVERAGES],
      consumer_codes: [],
    });
  });

  it('can put a day on Sidle, who is not a company at all', async () => {
    createReading.mockClear();
    openAddReadingOnTheSharedMeter();
    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1600' } });
    fireEvent.click(box(/jivo oil/i));
    fireEvent.click(box(/jivo beverages/i));
    fireEvent.click(box(/sidle/i));
    fireEvent.click(dialog().getByRole('button', { name: /^add reading$/i }));

    await waitFor(() => expect(createReading).toHaveBeenCalled());
    expect(createReading.mock.calls[0][0]).toMatchObject({
      company_codes: [],
      consumer_codes: ['SIDLE'],
    });
  });

  it('shows the reading’s own attribution in the register, not the meter’s', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    const row = screen.getByText('2026-08-20').closest('tr') as HTMLElement;
    expect(within(row).getByText('Jivo Beverages')).toBeInTheDocument();
    expect(within(row).queryByText('Jivo Oil, Jivo Beverages')).not.toBeInTheDocument();
  });

  it('offers Sidle in the register’s company filter', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'SIDLE' } });
    expect(readingFilters.current).toMatchObject({ company: 'SIDLE' });
  });
});

describe('Daily Electricity — when the dial was read', () => {
  it('shows the time on the row', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    const row = screen.getByText('2026-08-20').closest('tr') as HTMLElement;
    expect(within(row).getByText('06:30')).toBeInTheDocument();
  });

  it('defaults a new reading to now and sends what the form shows', async () => {
    createReading.mockClear();
    openAddReadingOnTheSharedMeter();

    const time = dialog().getByLabelText('Time Read') as HTMLInputElement;
    expect(time.value).toMatch(/^\d{2}:\d{2}$/);

    fireEvent.change(time, { target: { value: '06:30' } });
    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1600' } });
    fireEvent.click(dialog().getByRole('button', { name: /^add reading$/i }));

    await waitFor(() => expect(createReading).toHaveBeenCalled());
    expect(createReading.mock.calls[0][0]).toMatchObject({ reading_time: '06:30' });
  });
});

describe('Daily Electricity — editing an old reading', () => {
  afterEach(() => {
    rows.current = null;
  });

  it('opens on the meter’s companies rather than on nothing at all', () => {
    // A row from before the register asked who a day was for: it names nobody,
    // and has been shown under its meter's companies ever since. Opening it
    // with every box empty would read as "attributed to no one" — and saving
    // would make that true.
    rows.current = [
      { ...READING, company_codes: [], consumer_codes: [], attribution_display: '' },
    ];
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /edit .*reading/i }));

    expect(box(/jivo oil/i)).toBeChecked();
    expect(box(/jivo beverages/i)).toBeChecked();
    expect(box(/sidle/i)).not.toBeChecked();
  });

  it('falls back to the meter in the register when a reading names nobody', () => {
    rows.current = [
      { ...READING, company_codes: [], consumer_codes: [], attribution_display: '' },
    ];
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    const row = screen.getByText('2026-08-20').closest('tr') as HTMLElement;
    expect(within(row).getByText('Jivo Oil, Jivo Beverages')).toBeInTheDocument();
  });
});
