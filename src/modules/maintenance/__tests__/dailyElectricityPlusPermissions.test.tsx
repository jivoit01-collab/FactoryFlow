import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DAILY_ELECTRICITY_ACCESS_PERMISSIONS, MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { DAILY_ELECTRICITY_PLUS_ACCESS_PERMISSIONS } from '@/config/permissions/maintenance.permissions';

import { maintenanceModuleConfig } from '../module.config';
import MaintenanceDailyElectricityPlusPage from '../pages/MaintenanceDailyElectricityPlusPage';
import { DAY_SHEET, LAB, METERS, SPLIT } from './electricityTreeFixtures';

const READING = {
  id: 9,
  meter: 1,
  meter_name: 'KWH',
  meter_reset: false,
  date: '2026-08-20',
  reading_time: null,
  opening_reading: '1400.00',
  closing_reading: '1500.00',
  dial_difference: '100.00',
  multiplying_factor: '1.0000',
  units_consumed: '100.00',
  rate_per_unit: '9.0000',
  total_cost: '900.00',
  remarks: '',
  created_by_name: 'Operator',
};

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });

vi.mock('../api', () => ({
  useTreeMeters: () => ({ data: METERS, isLoading: false }),
  // Unrestricted here on purpose: this file is about the permission gates; the
  // meter-scope gate behind them is covered by the day sheet's own file.
  useMeterScope: () => ({
    scopeKnown: true,
    unrestricted: true,
    ids: new Set<number>(),
    names: [],
    manages: () => true,
    managesNothing: false,
  }),
  useElectricityDaySheet: () => ({ data: DAY_SHEET, isLoading: false }),
  useSaveElectricityDaySheet: () => mutation(),
  useElectricityAllocation: () => ({ data: SPLIT, isLoading: false }),
  useTreeReadings: () => ({ data: [READING], isLoading: false }),
  useUpdateTreeReading: () => mutation(),
  useDeleteTreeReading: () => mutation(),
  useCreateTreeMeter: () => mutation(),
  useUpdateTreeMeter: () => mutation(),
  useMeterSetups: () => ({ data: [LAB.tree?.setup], isLoading: false }),
  useElectricityConsumers: () => ({ data: [] }),
  useElectricityRunSources: () => ({ data: [] }),
  useCreateMeterSetup: () => mutation(),
  useUpdateMeterSetup: () => mutation(),
  useDeleteMeterSetup: () => mutation(),
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
  'Electricity Split Manager': [
    MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_ALLOCATION,
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

function renderTab(tab: 'sheet' | 'split' | 'tree' | 'readings') {
  render(
    <MemoryRouter initialEntries={[`/maintenance/daily-electricity-plus?tab=${tab}`]}>
      <MaintenanceDailyElectricityPlusPage />
    </MemoryRouter>,
  );
}

const saveSheetButton = () => screen.queryByRole('button', { name: /^save/i });
const addMeterButton = () => screen.queryByRole('button', { name: /add a meter/i });
const editReadingButton = () => screen.queryByLabelText('Correct 2026-08-20 reading for KWH');
const deleteReadingButton = () => screen.queryByLabelText('Delete 2026-08-20 reading for KWH');

function openWhoPaysForLab() {
  const buttons = screen.getAllByRole('button', { name: /who pays/i });
  // KWH, Production Floor Beverage, Lab — in tree order.
  fireEvent.click(buttons[2]);
}

describe('Daily Electricity++ page — per-group gating', () => {
  beforeEach(() => {
    granted.current = new Set<string>();
  });

  it('shows a viewer every tab and none of the actions', () => {
    signInAs('Daily Electricity Viewer');
    renderTab('sheet');
    expect(screen.getByRole('tab', { name: 'Split' })).toBeInTheDocument();
    expect(saveSheetButton()).not.toBeInTheDocument();
  });

  it('gives the meter manager the meter tree only', () => {
    signInAs('Electricity Meter Manager');
    renderTab('tree');
    expect(addMeterButton()).toBeInTheDocument();
  });

  it('keeps the tree read-only for a viewer', () => {
    signInAs('Daily Electricity Viewer');
    renderTab('tree');
    expect(addMeterButton()).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Lab')).not.toBeInTheDocument();
  });

  it('lets the reading operator save a day sheet but not correct history', () => {
    signInAs('Electricity Reading Operator');
    renderTab('sheet');
    expect(saveSheetButton()).toBeInTheDocument();
    expect(addMeterButton()).not.toBeInTheDocument();
  });

  it('lets the reading supervisor correct and delete a reading', () => {
    signInAs('Electricity Reading Supervisor');
    renderTab('readings');
    expect(editReadingButton()).toBeInTheDocument();
    expect(deleteReadingButton()).toBeInTheDocument();
  });

  it('shows the reading operator no correction buttons', () => {
    signInAs('Electricity Reading Operator');
    renderTab('readings');
    expect(editReadingButton()).not.toBeInTheDocument();
    expect(deleteReadingButton()).not.toBeInTheDocument();
  });

  it('lets only the allocation right decide who pays', () => {
    signInAs('Electricity Split Manager');
    renderTab('tree');
    openWhoPaysForLab();
    expect(screen.getByRole('button', { name: /save the change/i })).toBeInTheDocument();
  });

  it('shows who pays to anyone, without the means to change it', () => {
    signInAs('Electricity Meter Manager');
    renderTab('tree');
    openWhoPaysForLab();
    expect(screen.getAllByText(/Jivo Oil 50% · Jivo Beverages 50%/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /save the change/i })).not.toBeInTheDocument();
    expect(screen.getByText(/set who pays for each electricity meter/)).toBeInTheDocument();
  });

  it('keeps the legacy manage permission a full superset', () => {
    granted.current = new Set<string>([MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY]);
    renderTab('tree');
    expect(addMeterButton()).toBeInTheDocument();
    openWhoPaysForLab();
    expect(screen.getByRole('button', { name: /save the change/i })).toBeInTheDocument();
  });
});

describe('Daily Electricity++ route and sidebar gates', () => {
  const route = maintenanceModuleConfig.routes.find(
    (r) => r.path === '/maintenance/daily-electricity-plus',
  );
  const navChild = maintenanceModuleConfig.navigation?.[0].children?.find(
    (child) => child.path === '/maintenance/daily-electricity-plus',
  );
  const oldRoute = maintenanceModuleConfig.routes.find(
    (r) => r.path === '/maintenance/daily-electricity',
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

  it('opens the page for somebody who only decides who pays', () => {
    expect(route?.permissions).toContain(MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_ALLOCATION);
    expect(DAILY_ELECTRICITY_PLUS_ACCESS_PERMISSIONS).toContain(
      MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_ALLOCATION,
    );
  });

  it('leaves the Daily Electricity page gated exactly as it was', () => {
    expect(oldRoute?.permissions).toEqual([...DAILY_ELECTRICITY_ACCESS_PERMISSIONS]);
    expect(oldRoute?.permissions).not.toContain(MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_ALLOCATION);
  });
});
