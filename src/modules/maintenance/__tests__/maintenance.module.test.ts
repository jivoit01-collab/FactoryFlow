import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import { maintenanceModuleConfig } from '../module.config';

describe('maintenanceModuleConfig', () => {
  it('registers dashboard, asset, work order, detail, and master routes', () => {
    const paths = maintenanceModuleConfig.routes.map((route) => route.path);

    expect(paths).toContain('/maintenance');
    expect(paths).toContain('/maintenance/dashboard');
    expect(paths).toContain('/maintenance/assets');
    expect(paths).toContain('/maintenance/assets/:assetId');
    expect(paths).toContain('/maintenance/work-orders');
    expect(paths).toContain('/maintenance/work-orders/:workOrderId');
    expect(paths).toContain('/maintenance/pm');
    expect(paths).toContain('/maintenance/reports');
    expect(paths).toContain('/maintenance/automation');
    expect(paths).toContain('/maintenance/masters');
  });

  it('protects core routes with maintenance permissions', () => {
    expect(maintenanceModuleConfig.routes[0].permissions).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD,
    );
    expect(maintenanceModuleConfig.routes[1].permissions).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_ASSET,
    );
  });

  it('restricts every route to the Jivo Oil company unit', () => {
    for (const route of maintenanceModuleConfig.routes) {
      expect(route.companies, `route ${route.path} is not company-restricted`).toEqual([
        COMPANY_CODES.JIVO_OIL,
      ]);
    }
  });

  it('restricts the sidebar group to the Jivo Oil company unit', () => {
    const [nav] = maintenanceModuleConfig.navigation ?? [];
    expect(nav.companies).toEqual([COMPANY_CODES.JIVO_OIL]);
  });

  it('adds a Maintenance sidebar group with phase one and two children', () => {
    const [nav] = maintenanceModuleConfig.navigation ?? [];
    const childPaths = nav.children?.map((child) => child.path) ?? [];

    expect(nav.title).toBe('Maintenance');
    expect(nav.showInSidebar).toBe(true);
    expect(childPaths).toContain('/maintenance/dashboard');
    expect(childPaths).toContain('/maintenance/assets');
    expect(childPaths).toContain('/maintenance/work-orders');
    expect(childPaths).toContain('/maintenance/pm');
    expect(childPaths).toContain('/maintenance/reports');
    expect(childPaths).toContain('/maintenance/automation');
    expect(childPaths).toContain('/maintenance/masters');
    expect(childPaths).toContain('/gate/maintenance');
  });
});
