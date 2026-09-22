/**
 * Who the Electricity board is for.
 *
 * It was first built inside Maintenance, which is a Jivo Oil module — so the
 * Beverages plant, whose meters are half the register, could not open it at
 * all. It now lives in Dashboards, where routes are company-scoped one at a
 * time, and this pins the scope so a later edit cannot quietly shut Beverages
 * out again.
 *
 * The constants are read directly; the module config is not imported, because
 * importing it from a test pulls the Redux store in through `@/app/registry`
 * (see `landingParity.test.ts`, which checks the menu and landing card instead).
 */

import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import {
  ELECTRICITY_BOARD_COMPANIES,
  ELECTRICITY_BOARD_VIEW_PERMISSIONS,
} from '../electricity/constants';

describe('the Electricity board', () => {
  it('opens for both plants on the campus supply', () => {
    expect(ELECTRICITY_BOARD_COMPANIES).toContain(COMPANY_CODES.JIVO_BEVERAGES);
    expect(ELECTRICITY_BOARD_COMPANIES).toContain(COMPANY_CODES.JIVO_OIL);
  });

  it('stays hidden for Jivo Mart, which has no meter in the master', () => {
    expect(ELECTRICITY_BOARD_COMPANIES).not.toContain(COMPANY_CODES.JIVO_MART);
  });

  it('is gated on the daily register access set, not a permission of its own', () => {
    expect(ELECTRICITY_BOARD_VIEW_PERMISSIONS).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
    );
    expect(ELECTRICITY_BOARD_VIEW_PERMISSIONS).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_ELECTRICITY_METER,
    );
  });
});
