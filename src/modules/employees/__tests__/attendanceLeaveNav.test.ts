/**
 * Attendance and Leave used to be top-level modules. They are now submodules
 * of Organisation, their pages under `/organization/`. Moving them must not
 * have moved a lock: every entry is still gated exactly like the route it
 * opens, every old URL still lands, and holding only an attendance or a leave
 * right still reveals the Organisation parent.
 */
import { describe, expect, it, vi } from 'vitest';

// Same cycle the leave submodule's own config test stubs out: the badge
// reaches `@/core/auth`, whose store builds its reducers from the registry.
vi.mock('@/modules/organization/leave/components/PendingLeaveBadge', () => ({
  PendingLeaveBadge: () => null,
}));

import type { ModuleNavItem } from '@/core/types';
import { attendanceRoutes } from '@/modules/organization/attendance/module.config';
import { leaveRoutes } from '@/modules/organization/leave/module.config';
import { organizationModuleConfig } from '@/modules/organization/module.config';

import { employeesModuleConfig } from '../module.config';

const organisationNav = employeesModuleConfig.navigation?.find(
  (item) => item.path === '/organization',
);
const children: ModuleNavItem[] = organisationNav?.children ?? [];
const submoduleRoutes = [...attendanceRoutes, ...leaveRoutes];
// A redirect carries no breadcrumb; a page does.
const pages = submoduleRoutes.filter((route) => route.breadcrumb);
const redirects = submoduleRoutes.filter((route) => !route.breadcrumb);

describe('Attendance and Leave inside Organisation', () => {
  it('serves every attendance and leave page under /organization/', () => {
    expect(pages).toHaveLength(6);
    for (const route of pages) {
      expect(route.path.startsWith('/organization/'), route.path).toBe(true);
    }
  });

  it('is registered by the Organisation module', () => {
    const registered = organizationModuleConfig.routes.map((r) => r.path);
    for (const route of submoduleRoutes) {
      expect(registered, route.path).toContain(route.path);
    }
  });

  it('lists every page in the sidebar, gated exactly like the route', () => {
    for (const route of pages) {
      const child = children.find((c) => c.path === route.path);
      expect(child, route.path).toBeDefined();
      expect([...(child?.permissions ?? [])], route.path).toEqual([...(route.permissions ?? [])]);
    }
  });

  it('keeps every pre-move URL reachable, and out of the sidebar', () => {
    expect(redirects.map((r) => r.path).sort()).toEqual(
      [
        '/attendance',
        '/attendance/register',
        '/leave',
        '/leave/approvals',
        '/leave/calendar',
        '/leave/settings',
      ].sort(),
    );
    for (const redirect of redirects) {
      expect(
        children.find((c) => c.path === redirect.path),
        redirect.path,
      ).toBeUndefined();
      // Never looser than the page it forwards to.
      const target = pages.find((p) => p.path === `/organization${redirect.path}`);
      expect(redirect.permissions, redirect.path).toEqual(target?.permissions);
    }
  });

  it('shows the Organisation parent to every signed-in user', () => {
    // The ownership chart it opens on is readable by everyone, so the parent
    // carries no gate. An attendance- or leave-only user reaches it too.
    expect(organisationNav?.permissions ?? []).toHaveLength(0);
    expect(organisationNav?.modulePrefix).toBeUndefined();
  });

  it('opens the ownership chart to every signed-in user, and nothing else with it', () => {
    const chart = children.find((c) => c.path === '/organization');
    expect(chart?.permissions ?? []).toHaveLength(0);
    // Every other entry is still gated on its own rights.
    for (const child of children.filter((c) => c.path !== '/organization')) {
      expect(child.permissions?.length ?? 0, child.path).toBeGreaterThan(0);
    }
  });

  it('keeps the pending-leave badge on the approvals entry and the collapsed parent', () => {
    expect(children.find((c) => c.path === '/organization/leave/approvals')?.badge).toBeDefined();
    expect(organisationNav?.badge).toBeDefined();
  });
});
