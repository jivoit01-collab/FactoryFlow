import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

// KWH is the meter the grid supply comes in on; the production floor meter
// measures a slice of that same electricity. Adding the two would count the
// incoming units twice, which is the whole point of the main flag.
const MAIN_METER = {
  id: 1,
  name: 'KWH',
  meter_number: 'KWH-01',
  location: 'Substation',
  company_codes: [],
  companies_display: 'Jivo Oil, Jivo Beverages',
  is_main: true,
  rate_per_unit: '7.0000',
  multiplying_factor: '10.0000',
  last_reading_date: '2026-09-13',
  last_closing_reading: '495339.00',
  readings_count: 5,
  is_active: true,
};

const SUB_METER = {
  ...MAIN_METER,
  id: 2,
  name: 'Production Floor OIL',
  meter_number: 'PF-01',
  companies_display: 'Jivo Oil',
  is_main: false,
  multiplying_factor: '1.0000',
  last_closing_reading: '301560.00',
};

const MAIN_READING = {
  id: 11,
  meter: 1,
  meter_name: 'KWH',
  meter_is_main: true,
  meter_companies_display: 'Jivo Oil, Jivo Beverages',
  date: '2026-09-13',
  opening_reading: '495299.00',
  closing_reading: '495339.00',
  dial_difference: '40.00',
  multiplying_factor: '10.0000',
  units_consumed: '400.00',
  rate_per_unit: '7.0000',
  total_cost: '2800.00',
  remarks: '',
  created_by_name: 'Arvinpal Singh',
};

const SUB_READING = {
  ...MAIN_READING,
  id: 12,
  meter: 2,
  meter_name: 'Production Floor OIL',
  meter_is_main: false,
  meter_companies_display: 'Jivo Oil',
  opening_reading: '301507.00',
  closing_reading: '301560.00',
  dial_difference: '53.00',
  multiplying_factor: '1.0000',
  units_consumed: '53.00',
  total_cost: '371.00',
};

const updateMeter = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [MAIN_METER, SUB_METER], isLoading: false }),
  useDailyElectricityReadings: () => ({
    data: [MAIN_READING, SUB_READING],
    isLoading: false,
  }),
  useCreateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: updateMeter, isPending: false }),
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

const dialog = () => within(screen.getByRole('dialog'));

describe('Daily Electricity — main meters', () => {
  it('totals the sub-meters alone and reports the mains beside them', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    // 53 sub-meter units at ₹371 — the main meter's 400 units / ₹2,800 are NOT
    // in this total, they are quoted separately.
    const subUnits = screen.getByText('Sub-meter Units:').parentElement as HTMLElement;
    expect(within(subUnits).getByText('53')).toBeInTheDocument();
    const subCost = screen.getByText('Sub-meter Cost:').parentElement as HTMLElement;
    expect(within(subCost).getByText('₹371')).toBeInTheDocument();

    const mains = screen.getByText('Main Meters:').parentElement as HTMLElement;
    expect(within(mains).getByText('400')).toBeInTheDocument();
    expect(within(mains).getByText('₹2,800')).toBeInTheDocument();
  });

  it('lists the main reading in its own section, flagged', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(screen.getByText(/Main Meters — Incoming Supply/)).toBeInTheDocument();
    // "KWH" also names a choice in the meter filter, so the row is found by its
    // flag and then checked to be the main meter's.
    const mainRow = screen.getByText('Main').closest('tr') as HTMLElement;
    expect(within(mainRow).getByText('KWH')).toBeInTheDocument();
    expect(within(mainRow).getByText('400.00')).toBeInTheDocument();

    // The sub-meter row carries no flag and sits under its own heading. Found
    // by its units, since the meter also names a choice in the filter dropdown.
    const subRow = screen.getByText('53.00').closest('tr') as HTMLElement;
    expect(within(subRow).getByText('Production Floor OIL')).toBeInTheDocument();
    expect(within(subRow).queryByText('Main')).not.toBeInTheDocument();
    expect(screen.getByText('Sub-Meters')).toBeInTheDocument();
  });

  it('marks a meter as main from the meter master', async () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /meters/i }));

    fireEvent.click(dialog().getByRole('button', { name: /edit meter production floor oil/i }));
    fireEvent.click(dialog().getByLabelText(/main \(incoming supply\) meter/i));
    fireEvent.click(dialog().getByRole('button', { name: /save meter/i }));

    await waitFor(() => expect(updateMeter).toHaveBeenCalled());
    expect(updateMeter.mock.calls[0][0].payload).toMatchObject({ is_main: true });
  });
});
