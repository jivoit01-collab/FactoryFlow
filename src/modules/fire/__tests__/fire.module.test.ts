import { describe, expect, it } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import { fireModuleConfig } from '../module.config';

describe('fireModuleConfig', () => {
  it('registers the fire section routes under /fire', () => {
    const paths = fireModuleConfig.routes.map((route) => route.path);
    expect(paths).toContain('/fire');
    expect(paths).toContain('/fire/store');
    expect(paths).toContain('/fire/reports');
    expect(paths).toContain('/fire/equipment');
    expect(paths).toContain('/fire/work-permits');
    expect(paths).toContain('/fire/safety-fines');
  });

  it('gates each route with the existing maintenance.* fire permissions', () => {
    const byPath = Object.fromEntries(fireModuleConfig.routes.map((r) => [r.path, r]));
    expect(byPath['/fire/store'].permissions).toContain(MAINTENANCE_PERMISSIONS.VIEW_FIRE);
    expect(byPath['/fire/work-permits'].permissions).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT,
    );
    expect(byPath['/fire/safety-fines'].permissions).toContain(
      MAINTENANCE_PERMISSIONS.VIEW_SAFETY_FINE,
    );
  });

  it('adds a Fire sidebar group gated by any fire-section permission', () => {
    const [nav] = fireModuleConfig.navigation ?? [];
    expect(nav.title).toBe('Fire');
    expect(nav.showInSidebar).toBe(true);
    expect(nav.permissions).toContain(MAINTENANCE_PERMISSIONS.VIEW_FIRE);
    const childPaths = nav.children?.map((child) => child.path) ?? [];
    expect(childPaths).toEqual([
      '/fire/store',
      '/fire/reports',
      '/fire/equipment',
      '/fire/work-permits',
      '/fire/safety-fines',
    ]);
  });
});
