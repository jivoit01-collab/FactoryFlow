import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

const BOILER = {
  id: 1,
  name: 'Boiler',
  meter_number: 'B-01',
  location: 'Block A',
  rate_per_unit: '8.5000',
  multiplying_factor: '1.0000',
  last_reading_date: '2026-08-20',
  last_closing_reading: '1500.00',
  readings_count: 4,
  is_active: true,
};

const TERRACE = { ...BOILER, id: 2, name: 'Terrace', meter_number: 'T-01', location: 'Roof' };

function reading(id: number, meter: number, meterName: string) {
  return {
    id,
    meter,
    meter_name: meterName,
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
}

const scope = vi.hoisted(() => ({
  current: {
    scopeKnown: true,
    unrestricted: false,
    ids: new Set<number>([1]),
    names: ['Boiler'],
    manages: (id?: number | null) => id === 1,
    managesNothing: false,
  },
}));

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [BOILER, TERRACE], isLoading: false }),
  useDailyElectricityReadings: () => ({
    data: [reading(9, 1, 'Boiler'), reading(10, 2, 'Terrace')],
    isLoading: false,
  }),
  useCreateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMeterScope: () => scope.current,
}));

const granted = vi.hoisted(() => ({ current: new Set<string>() }));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => granted.current.has(permission),
    hasAnyPermission: (permissions: readonly string[]) =>
      permissions.some((permission) => granted.current.has(permission)),
  }),
}));

const EVERY_RIGHT = [
  MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
  MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
  MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_METER,
  MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY,
  MAINTENANCE_PERMISSIONS.EDIT_DAILY_ELECTRICITY,
  MAINTENANCE_PERMISSIONS.DELETE_DAILY_ELECTRICITY,
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <MaintenanceDailyElectricityPage />
    </MemoryRouter>,
  );

const editReading = (meterName: string) =>
  screen.queryByLabelText(`Edit 2026-08-20 reading for ${meterName}`);
const deleteReading = (meterName: string) =>
  screen.queryByLabelText(`Delete 2026-08-20 reading for ${meterName}`);
const addReadingButton = () => screen.queryByRole('button', { name: /add reading/i });

/**
 * A permission says WHICH operations a user may perform; the assignment says on
 * WHICH meters. This file is about the second half, so every test below holds
 * every electricity right and differs only in what it keeps.
 */
describe('Daily Electricity page — per-meter scope', () => {
  beforeEach(() => {
    granted.current = new Set<string>(EVERY_RIGHT);
    scope.current = {
      scopeKnown: true,
      unrestricted: false,
      ids: new Set<number>([1]),
      names: ['Boiler'],
      manages: (id?: number | null) => id === 1,
      managesNothing: false,
    };
  });

  it('offers the row actions only on the keeper’s own meter', () => {
    renderPage();

    expect(editReading('Boiler')).toBeInTheDocument();
    expect(deleteReading('Boiler')).toBeInTheDocument();
    expect(editReading('Terrace')).not.toBeInTheDocument();
    expect(deleteReading('Terrace')).not.toBeInTheDocument();
  });

  it('still shows every meter’s readings — only the writes are narrowed', () => {
    renderPage();

    expect(screen.getAllByText('Boiler').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Terrace').length).toBeGreaterThan(0);
  });

  it('tells a user who keeps nothing why, and disables adding', () => {
    scope.current = {
      ...scope.current,
      ids: new Set<number>(),
      names: [],
      manages: () => false,
      managesNothing: true,
    };
    renderPage();

    expect(screen.getByText(/not the manager of any meter/i)).toBeInTheDocument();
    expect(addReadingButton()).toBeDisabled();
  });

  it('never claims a restriction it could not verify', () => {
    // The endpoint was unreachable — a frontend deployed ahead of its backend,
    // or a network blip. The server is the enforcement point; the client must
    // not invent a restriction, and must certainly not send anyone to an
    // administrator over it.
    scope.current = {
      scopeKnown: false,
      unrestricted: true,
      ids: new Set<number>(),
      names: [],
      manages: () => true,
      managesNothing: false,
    };
    renderPage();

    expect(screen.queryByText(/not the manager of any meter/i)).not.toBeInTheDocument();
    expect(editReading('Terrace')).toBeInTheDocument();
    expect(addReadingButton()).toBeEnabled();
  });

  it('gives a superuser every meter', () => {
    scope.current = {
      scopeKnown: true,
      unrestricted: true,
      ids: new Set<number>(),
      names: [],
      manages: () => true,
      managesNothing: false,
    };
    renderPage();

    expect(editReading('Boiler')).toBeInTheDocument();
    expect(editReading('Terrace')).toBeInTheDocument();
  });
});
