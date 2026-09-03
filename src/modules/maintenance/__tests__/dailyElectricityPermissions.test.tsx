import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DAILY_ELECTRICITY_ACCESS_PERMISSIONS,
  MAINTENANCE_PERMISSIONS,
} from '@/config/permissions';

import { maintenanceModuleConfig } from '../module.config';
import MaintenanceDailyElectricityPage from '../pages/MaintenanceDailyElectricityPage';

const METER = {
  id: 1,
  name: 'Main Incomer',
  meter_number: 'MI-01',
  location: 'Substation',
  rate_per_unit: '8.5000',
  multiplying_factor: '1.0000',
  last_reading_date: '2026-08-20',
  last_closing_reading: '1500.00',
  readings_count: 4,
  is_active: true,
};

const READING = {
  id: 9,
  meter: 1,
  meter_name: 'Main Incomer',
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

vi.mock('../api', () => ({
  useElectricityMeters: () => ({ data: [METER], isLoading: false }),
  useDailyElectricityReadings: () => ({ data: [READING], isLoading: false }),
  useCreateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateElectricityMeter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDailyElectricityReading: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const granted = vi.hoisted(() => ({ current: new Set<string>() }));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => granted.current.has(permission),
    hasAnyPermission: (permissions: readonly string[]) =>
      permissions.some((permission) => granted.current.has(permission)),
  }),
}));

/**
 * The permission bundles the Django groups in
 * `maintenance/management/commands/ensure_role_groups.py` hand a user. A group is
 * nothing more than this bundle once /auth/me flattens direct + group perms.
 */
const GROUPS = {
  'Daily Electricity Viewer': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
  ],
  'Electricity Meter Manager': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_METER,
  ],
  'Electricity Reading Operator': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY,
  ],
  'Electricity Reading Supervisor': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.EDIT_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.DELETE_DAILY_ELECTRICITY,
  ],
  'Daily Electricity Manager': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.EDIT_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.DELETE_DAILY_ELECTRICITY,
  ],
} as const;

function signInAs(group: keyof typeof GROUPS) {
  granted.current = new Set<string>(GROUPS[group]);
}

const metersButton = () => screen.queryByRole('button', { name: /^meters$/i });
const addReadingButton = () => screen.queryByRole('button', { name: /add reading/i });
const editReadingButton = () => screen.queryByLabelText('Edit 2026-08-20 reading for Main Incomer');
const deleteReadingButton = () =>
  screen.queryByLabelText('Delete 2026-08-20 reading for Main Incomer');

describe('Daily Electricity page — per-group gating', () => {
  beforeEach(() => {
    granted.current = new Set<string>();
  });

  it('shows a viewer the register and none of the actions', () => {
    signInAs('Daily Electricity Viewer');
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(screen.getAllByText('Main Incomer').length).toBeGreaterThan(0);
    expect(metersButton()).not.toBeInTheDocument();
    expect(addReadingButton()).not.toBeInTheDocument();
    expect(editReadingButton()).not.toBeInTheDocument();
    expect(deleteReadingButton()).not.toBeInTheDocument();
  });

  it('gives the meter manager the meter master only', () => {
    signInAs('Electricity Meter Manager');
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(metersButton()).toBeInTheDocument();
    expect(addReadingButton()).not.toBeInTheDocument();
    expect(editReadingButton()).not.toBeInTheDocument();
    expect(deleteReadingButton()).not.toBeInTheDocument();
  });

  it('lets the reading operator add a reading but not correct or delete one', () => {
    signInAs('Electricity Reading Operator');
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(addReadingButton()).toBeInTheDocument();
    expect(metersButton()).not.toBeInTheDocument();
    expect(editReadingButton()).not.toBeInTheDocument();
    expect(deleteReadingButton()).not.toBeInTheDocument();
  });

  it('lets the reading supervisor correct and delete, still without the meter master', () => {
    signInAs('Electricity Reading Supervisor');
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(addReadingButton()).toBeInTheDocument();
    expect(editReadingButton()).toBeInTheDocument();
    expect(deleteReadingButton()).toBeInTheDocument();
    expect(metersButton()).not.toBeInTheDocument();
  });

  it('keeps the legacy manage permission a full superset', () => {
    granted.current = new Set<string>([MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY]);
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(metersButton()).toBeInTheDocument();
    expect(addReadingButton()).toBeInTheDocument();
    expect(editReadingButton()).toBeInTheDocument();
    expect(deleteReadingButton()).toBeInTheDocument();
  });

  it('shows every action to the full manager group', () => {
    signInAs('Daily Electricity Manager');
    render(<MemoryRouter><MaintenanceDailyElectricityPage /></MemoryRouter>);

    expect(metersButton()).toBeInTheDocument();
    expect(addReadingButton()).toBeInTheDocument();
    expect(editReadingButton()).toBeInTheDocument();
    expect(deleteReadingButton()).toBeInTheDocument();
  });
});

describe('Daily Electricity route and sidebar gates', () => {
  const route = maintenanceModuleConfig.routes.find(
    (r) => r.path === '/maintenance/daily-electricity',
  );
  const navChild = maintenanceModuleConfig.navigation?.[0].children?.find(
    (child) => child.path === '/maintenance/daily-electricity',
  );

  it('opens the page for every electricity group', () => {
    // Route and sidebar gates are any-of (ProtectedRoute defaults requireAll:false),
    // so each group only needs to intersect the gate list.
    for (const [group, permissions] of Object.entries(GROUPS)) {
      expect(
        permissions.some((permission) => (route?.permissions ?? []).includes(permission)),
        `${group} cannot reach the route`,
      ).toBe(true);
      expect(
        permissions.some((permission) => (navChild?.permissions ?? []).includes(permission)),
        `${group} has no sidebar entry`,
      ).toBe(true);
    }
  });

  it('gates on the granular permissions, not just view/manage', () => {
    for (const permission of DAILY_ELECTRICITY_ACCESS_PERMISSIONS) {
      expect(route?.permissions).toContain(permission);
      expect(navChild?.permissions).toContain(permission);
    }
  });
});
