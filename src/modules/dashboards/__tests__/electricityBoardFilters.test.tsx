/**
 * What the Electricity board is showing before anybody touches a control.
 *
 * It opens on Jivo Beverages, and the meter picker offers that company's meters
 * only — the campus runs Oil and Beverages off one supply, so "all companies"
 * as an opening state mixes the two plants together in the very first figure a
 * reader sees.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import ElectricityDashboardPage from '../electricity/pages/ElectricityDashboardPage';

const BEVERAGES_METER = {
  id: 8,
  name: 'Boiler',
  meter_number: '',
  location: 'Near Boiler',
  company_codes: [COMPANY_CODES.JIVO_BEVERAGES],
  companies_display: 'Jivo Beverages',
  is_main: false,
  supply_source: '',
  supply_source_display: '',
  counts_as_supply: true,
  rate_per_unit: '7.0000',
  multiplying_factor: '20.0000',
  last_reading_date: '2026-09-21',
  last_closing_reading: '453.00',
  readings_count: 21,
  is_active: true,
  created_at: '',
  updated_at: '',
};

/** Oil's own meter — Beverages must never be offered it. */
const OIL_METER = {
  ...BEVERAGES_METER,
  id: 6,
  name: 'HP-196',
  company_codes: [COMPANY_CODES.JIVO_OIL],
  companies_display: 'Jivo Oil',
};

/** The campus incomer, which feeds both plants and so answers to each. */
const SHARED_METER = {
  ...BEVERAGES_METER,
  id: 11,
  name: 'KWH',
  location: 'Near Boundary Wall',
  company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
  companies_display: 'Jivo Oil, Jivo Beverages',
  is_main: true,
  supply_source: 'GRID',
  supply_source_display: 'Grid',
};

/** Not attributed yet, so it belongs to no company filter. */
const UNTAGGED_METER = {
  ...BEVERAGES_METER,
  id: 10,
  name: 'STP',
  company_codes: [],
  companies_display: '',
};

const readingFilters = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('@/modules/maintenance/api', () => ({
  useElectricityMeters: () => ({
    data: [BEVERAGES_METER, OIL_METER, SHARED_METER, UNTAGGED_METER],
    isLoading: false,
  }),
  useDailyElectricityReadings: (filters: unknown) => {
    readingFilters.current = filters;
    return { data: [], isLoading: false };
  },
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: COMPANY_CODES.JIVO_BEVERAGES } }),
}));

const companySelect = () => screen.getByLabelText('Company') as HTMLSelectElement;
const meterSelect = () => screen.getByLabelText('Meter') as HTMLSelectElement;
const meterOptions = () =>
  within(meterSelect())
    .getAllByRole('option')
    .map((option) => option.textContent);

const renderBoard = () =>
  render(
    <MemoryRouter>
      <ElectricityDashboardPage />
    </MemoryRouter>,
  );

describe('Electricity board — opening filters', () => {
  it('opens on Jivo Beverages and asks the server for that company', () => {
    renderBoard();

    expect(companySelect().value).toBe(COMPANY_CODES.JIVO_BEVERAGES);
    expect(readingFilters.current).toMatchObject({ company: COMPANY_CODES.JIVO_BEVERAGES });
  });

  it('offers the Beverages meters, including the shared incomer, and nothing else', () => {
    renderBoard();

    const options = meterOptions();
    expect(options).toContain('Boiler');
    expect(options).toContain('KWH');
    expect(options).not.toContain('HP-196');
    expect(options).not.toContain('STP');
  });

  it('offers every meter once the company filter is cleared', () => {
    renderBoard();

    fireEvent.change(companySelect(), { target: { value: '' } });

    expect(meterOptions()).toEqual(
      expect.arrayContaining(['All meters', 'Boiler', 'HP-196', 'KWH', 'STP']),
    );
    expect(readingFilters.current).toMatchObject({ company: undefined });
  });

  it('drops a meter the newly chosen company does not feed', () => {
    renderBoard();

    fireEvent.change(meterSelect(), { target: { value: String(BEVERAGES_METER.id) } });
    expect(readingFilters.current).toMatchObject({ meter: BEVERAGES_METER.id });

    fireEvent.change(companySelect(), { target: { value: COMPANY_CODES.JIVO_OIL } });

    expect(meterSelect().value).toBe('');
    expect(readingFilters.current).toMatchObject({
      company: COMPANY_CODES.JIVO_OIL,
      meter: undefined,
    });
  });

  it('keeps a shared meter selected across a company change', () => {
    renderBoard();

    fireEvent.change(meterSelect(), { target: { value: String(SHARED_METER.id) } });
    fireEvent.change(companySelect(), { target: { value: COMPANY_CODES.JIVO_OIL } });

    expect(meterSelect().value).toBe(String(SHARED_METER.id));
  });
});
