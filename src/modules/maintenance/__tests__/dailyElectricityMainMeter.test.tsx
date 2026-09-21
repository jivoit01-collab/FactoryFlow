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
  supply_source: 'GRID' as const,
  supply_source_display: 'Grid',
  counts_as_supply: true,
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
  supply_source: '' as const,
  supply_source_display: '',
  counts_as_supply: true,
  multiplying_factor: '1.0000',
  last_closing_reading: '301560.00',
};

const MAIN_READING = {
  id: 11,
  meter: 1,
  meter_name: 'KWH',
  meter_is_main: true,
  meter_supply_source: 'GRID' as const,
  meter_supply_source_display: 'Grid',
  meter_counts_as_supply: true,
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
  meter_supply_source: '' as const,
  meter_supply_source_display: '',
  meter_counts_as_supply: true,
  meter_companies_display: 'Jivo Oil',
  opening_reading: '301507.00',
  closing_reading: '301560.00',
  dial_difference: '53.00',
  multiplying_factor: '1.0000',
  units_consumed: '53.00',
  total_cost: '371.00',
};

// The generator: on this day the grid barely moved and the DG carried the plant.
const DG_METER = {
  ...MAIN_METER,
  id: 3,
  name: 'DG-1',
  meter_number: 'DG-01',
  supply_source: 'DG' as const,
  supply_source_display: 'DG Set',
  multiplying_factor: '1.0000',
};

const DG_READING = {
  ...MAIN_READING,
  id: 13,
  meter: 3,
  meter_name: 'DG-1',
  meter_supply_source: 'DG' as const,
  meter_supply_source_display: 'DG Set',
  opening_reading: '0.00',
  closing_reading: '900.00',
  dial_difference: '900.00',
  multiplying_factor: '1.0000',
  units_consumed: '900.00',
  total_cost: '6300.00',
};

const updateMeter = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({
    data: [MAIN_METER, SUB_METER, DG_METER],
    isLoading: false,
  }),
  useDailyElectricityReadings: () => ({
    data: [MAIN_READING, SUB_READING, DG_READING],
    isLoading: false,
  }),
  useCreateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: updateMeter, isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  // Unrestricted: this file is not about the meter-scope gate, which has its
  // own file (dailyElectricityMeterScope.test.tsx).
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

// The meter form opens as a second dialog on top of the master list, so the
// topmost one is what a meter query is scoped to.
const dialog = () => within(screen.getAllByRole('dialog').at(-1) as HTMLElement);

describe('Daily Electricity — main meters', () => {
  it('totals the sub-meters alone and reports the mains beside them', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    // 53 sub-meter units at ₹371 — the main meter's 400 units / ₹2,800 are NOT
    // in this total, they are quoted separately.
    const subUnits = screen.getByText('Sub-meter Units:').parentElement as HTMLElement;
    expect(within(subUnits).getByText('53')).toBeInTheDocument();
    const subCost = screen.getByText('Sub-meter Cost:').parentElement as HTMLElement;
    expect(within(subCost).getByText('₹371')).toBeInTheDocument();

    // Grid 400 + DG 900 come in; neither is in the sub-meter total.
    const supply = screen.getAllByText('Total Supply:')[0].parentElement as HTMLElement;
    expect(within(supply).getByText('1,300')).toBeInTheDocument();
  });

  it('lists the main reading in its own section, flagged', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(screen.getByText('Incoming Supply')).toBeInTheDocument();
    // "KWH" also names a choice in the meter filter, so the row is found by its
    // flag and then checked to be the main meter's.
    const mainRow = screen.getByText('Main · Grid').closest('tr') as HTMLElement;
    expect(within(mainRow).getByText('KWH')).toBeInTheDocument();
    expect(within(mainRow).getByText('400.00')).toBeInTheDocument();

    // The sub-meter row carries no flag and sits under its own heading. Found
    // by its units, since the meter also names a choice in the filter dropdown.
    const subRow = screen.getByText('53.00').closest('tr') as HTMLElement;
    expect(within(subRow).getByText('Production Floor OIL')).toBeInTheDocument();
    expect(within(subRow).queryByText(/^Main/)).not.toBeInTheDocument();
    expect(screen.getByText('Sub-Meters')).toBeInTheDocument();
  });

  it('splits the supply per source, so a day on the generator is readable', () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    // The grid did 400 of 1,300 units; the DG carried the other 900. Reading
    // the mains as one number would hide exactly that.
    const grid = screen.getByText('Grid').closest('div') as HTMLElement;
    expect(within(grid).getByText('400')).toBeInTheDocument();
    expect(within(grid).getByText(/31% of supply/)).toBeInTheDocument();

    const dg = screen.getByText('DG Set').closest('div') as HTMLElement;
    expect(within(dg).getByText('900')).toBeInTheDocument();
    expect(within(dg).getByText(/69% of supply/)).toBeInTheDocument();

    // Both are mains, so neither touches the sub-meter total.
    const subUnits = screen.getByText('Sub-meter Units:').parentElement as HTMLElement;
    expect(within(subUnits).getByText('53')).toBeInTheDocument();
  });

  it('picks the supply on a main meter and leaves a sub-meter without one', async () => {
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /meters/i }));

    // A sub-meter measures whatever the plant ran on, so it is asked nothing.
    fireEvent.click(dialog().getByRole('button', { name: /edit meter production floor oil/i }));
    expect(dialog().queryByLabelText(/^supply$/i)).not.toBeInTheDocument();

    // Back to the list, then on to the main meter.
    fireEvent.click(dialog().getByRole('button', { name: /^cancel$/i }));
    fireEvent.click(dialog().getByRole('button', { name: /edit meter dg-1/i }));
    const source = dialog().getByLabelText(/^supply$/i) as HTMLSelectElement;
    expect(source.value).toBe('DG');

    fireEvent.change(source, { target: { value: 'SOLAR' } });
    fireEvent.click(dialog().getByRole('button', { name: /save meter/i }));

    await waitFor(() => expect(updateMeter).toHaveBeenCalled());
    expect(updateMeter.mock.calls[0][0].payload).toMatchObject({
      is_main: true,
      supply_source: 'SOLAR',
      counts_as_supply: true,
    });
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
