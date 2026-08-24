import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

// The grid gave this meter an MF of 40: the dial moves 10, the factory is
// billed 400 units.
const METER = {
  id: 1,
  name: 'HT Incomer',
  meter_number: 'HT-01',
  location: 'Substation',
  company_codes: [],
  companies_display: 'Jivo Oil',
  rate_per_unit: '8.0000',
  multiplying_factor: '40.0000',
  last_reading_date: '2026-08-19',
  last_closing_reading: '1500.00',
  readings_count: 3,
  is_active: true,
};

const READING = {
  id: 9,
  meter: 1,
  meter_name: 'HT Incomer',
  meter_companies_display: 'Jivo Oil',
  date: '2026-08-20',
  opening_reading: '1400.00',
  closing_reading: '1410.00',
  dial_difference: '10.00',
  multiplying_factor: '40.0000',
  units_consumed: '400.00',
  rate_per_unit: '8.0000',
  total_cost: '3200.00',
  remarks: '',
  created_by_name: 'Operator',
};

const createReading = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const createMeter = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [METER], isLoading: false }),
  useDailyElectricityReadings: () => ({ data: [READING], isLoading: false }),
  useCreateElectricityMeter: () => ({ mutateAsync: createMeter, isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: createReading, isPending: false }),
  useUpdateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) =>
      permission === MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
    hasAnyPermission: () => true,
  }),
}));

// "Meter" and the MF field exist both in the filter bar and in the dialogs, so
// dialog queries are scoped.
const dialog = () => within(screen.getByRole('dialog'));

describe('Daily Electricity — multiplying factor', () => {
  it('shows the factor next to the billed units', () => {
    render(<MaintenanceDailyElectricityPage />);

    const row = screen.getByText('2026-08-20').closest('tr') as HTMLElement;
    expect(within(row).getByText('×40')).toBeInTheDocument();
    expect(within(row).getByText('400.00')).toBeInTheDocument();
  });

  it('carries the meter’s factor into a new reading and previews the billed units', async () => {
    render(<MaintenanceDailyElectricityPage />);
    fireEvent.click(screen.getByRole('button', { name: /add reading/i }));

    // Picking the meter prefills its opening, rate and factor.
    fireEvent.change(dialog().getByLabelText('Meter'), { target: { value: '1' } });
    expect((dialog().getByLabelText('Multiplying Factor (MF)') as HTMLInputElement).value).toBe(
      '40.0000',
    );

    fireEvent.change(dialog().getByLabelText('Closing Reading'), { target: { value: '1510' } });
    expect(dialog().getByText(/Dial: 10 × MF 40 = 400 units · Cost: ₹3,200/)).toBeInTheDocument();

    fireEvent.click(dialog().getByRole('button', { name: /^add reading$/i }));
    await waitFor(() => expect(createReading).toHaveBeenCalled());
    expect(createReading.mock.calls[0][0]).toMatchObject({
      meter: 1,
      closing_reading: '1510',
      multiplying_factor: '40.0000',
    });
  });

  it('sends the factor set on a new meter', async () => {
    render(<MaintenanceDailyElectricityPage />);
    fireEvent.click(screen.getByRole('button', { name: /^meters$/i }));

    fireEvent.change(dialog().getByLabelText('Name'), { target: { value: 'LT Incomer' } });
    fireEvent.change(dialog().getByLabelText('Multiplying Factor (MF)'), {
      target: { value: '20' },
    });
    fireEvent.click(dialog().getByRole('button', { name: /^add meter$/i }));

    await waitFor(() => expect(createMeter).toHaveBeenCalled());
    expect(createMeter.mock.calls[0][0]).toMatchObject({
      name: 'LT Incomer',
      multiplying_factor: '20',
    });
  });
});
