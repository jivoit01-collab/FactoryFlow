import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

// A meter feeding shared plant carries both campus companies; the Mart meter
// sits on its own supply.
const SHARED_METER = {
  id: 1,
  name: 'Main Incomer',
  meter_number: 'MI-01',
  location: 'Substation',
  company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
  companies_display: 'Jivo Oil, Jivo Beverages',
  rate_per_unit: '8.5000',
  multiplying_factor: '1.0000',
  last_reading_date: '2026-08-20',
  last_closing_reading: '1500.00',
  readings_count: 4,
  is_active: true,
};

const UNTAGGED_METER = {
  ...SHARED_METER,
  id: 2,
  name: 'Spare Feeder',
  meter_number: 'SF-01',
  company_codes: [],
  companies_display: '',
};

const READING = {
  id: 9,
  meter: 1,
  meter_name: 'Main Incomer',
  meter_companies_display: 'Jivo Oil, Jivo Beverages',
  date: '2026-08-20',
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
const createMeter = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({
    data: [SHARED_METER, UNTAGGED_METER],
    isLoading: false,
  }),
  useDailyElectricityReadings: (filters: unknown) => {
    readingFilters.current = filters;
    return { data: [READING], isLoading: false };
  },
  useCreateElectricityMeter: () => ({ mutateAsync: createMeter, isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const companyFilter = () => screen.getByLabelText('Company') as HTMLSelectElement;

describe('Daily Electricity — company attribution', () => {
  it('shows which companies a reading’s meter feeds', () => {
    render(<MaintenanceDailyElectricityPage />);

    const row = screen.getByText('2026-08-20').closest('tr') as HTMLElement;
    expect(within(row).getByText('Jivo Oil, Jivo Beverages')).toBeInTheDocument();
  });

  it('filters the register by company', () => {
    render(<MaintenanceDailyElectricityPage />);

    expect(readingFilters.current).toMatchObject({ company: undefined });

    fireEvent.change(companyFilter(), { target: { value: COMPANY_CODES.JIVO_MART } });
    expect(readingFilters.current).toMatchObject({ company: COMPANY_CODES.JIVO_MART });

    fireEvent.change(companyFilter(), { target: { value: '' } });
    expect(readingFilters.current).toMatchObject({ company: undefined });
  });

  it('tags a new meter with every company it feeds', async () => {
    render(<MaintenanceDailyElectricityPage />);
    fireEvent.click(screen.getByRole('button', { name: /^meters$/i }));

    // The master list flags a meter nobody has attributed yet.
    expect(screen.getByText('Not set')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Utility Incomer' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /jivo oil/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /jivo beverages/i }));
    fireEvent.click(screen.getByRole('button', { name: /^add meter$/i }));

    await waitFor(() => expect(createMeter).toHaveBeenCalled());
    expect(createMeter.mock.calls[0][0]).toMatchObject({
      name: 'Utility Incomer',
      company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
    });
  });
});
