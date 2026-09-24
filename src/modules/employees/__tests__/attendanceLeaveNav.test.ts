/**
 * Attendance and Leave used to be top-level sidebar modules. They are now
 * listed under Organisation. Moving them must not have moved a lock: every
 * entry is still gated exactly like the route it opens, and holding only an
 * attendance or a leave right still reveals the Organisation parent.
 */
import { describe, expect, it, vi } from 'vitest';

// Same cycle the leave module's own config test stubs out: the badge reaches
// `@/core/auth`, whose store builds its reducers from the registry.
vi.mock('@/modules/leave/components/PendingLeaveBadge', () => ({
  PendingLeaveBadge: () => null,
}));

import type { ModuleNavItem } from '@/core/types';
import { attendanceModuleConfig } from '@/modules/attendance/module.config';
import { leaveModuleConfig } from '@/modules/leave/module.config';

import { employeesModuleConfig } from '../module.config';

const organisationNav = employeesModuleConfig.navigation?.find(
  (item) => item.path === '/organization',
);
const children: ModuleNavItem[] = organisationNav?.children ?? [];

describe('Attendance and Leave under Organisation', () => {
  it('lists every attendance and leave route, gated exactly like the route', () => {
    for (const route of [...attendanceModuleConfig.routes, ...leaveModuleConfig.routes]) {
      const child = children.find((c) => c.path === route.path);
      expect(child, route.path).toBeDefined();
      expect([...(child?.permissions ?? [])], route.path).toEqual([...(route.permissions ?? [])]);
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
    expect(children.find((c) => c.path === '/leave/approvals')?.badge).toBeDefined();
    expect(organisationNav?.badge).toBeDefined();
  });

  it('no longer registers top-level Attendance or Leave entries', () => {
    expect(attendanceModuleConfig.navigation ?? []).toHaveLength(0);
    expect(leaveModuleConfig.navigation ?? []).toHaveLength(0);
  });
});
