/**
 * The module's wiring, and the one rule it must not break.
 *
 * The approvals queue and the calendar are gated more narrowly than the module
 * itself. If somebody ever "simplifies" these to a shared LEAVE_ACCESS, every
 * person who can request a day off gets the approvals screen — which is the
 * exact failure the backend's permission split exists to prevent.
 */
import { describe, expect, it, vi } from 'vitest';

// The sidebar badge reaches `@/core/auth`, which pulls the Redux store, which
// builds its reducers from this very registry. That cycle is fine once the app
// is bundled -- every module.config with a badge has it, admin's included --
// but importing one config on its own here would evaluate the registry while
// it is still half-built. Stubbing the badge keeps this test about the gating.
vi.mock('../components/PendingLeaveBadge', () => ({
  PendingLeaveBadge: () => null,
}));

import {
  LEAVE_ACCESS,
  LEAVE_DECIDE_ACCESS,
  LEAVE_MANAGE_ACCESS,
  LEAVE_PERMISSIONS,
  LEAVE_TEAM_ACCESS,
} from '@/config/permissions';

import { LEAVE_PATHS, leaveRoutes } from '../module.config';

const find = (path: string) => leaveRoutes.find((r) => r.path === path);

describe('leave submodule config', () => {
  it('registers the four pages under Organisation', () => {
    const paths = leaveRoutes.filter((r) => r.breadcrumb).map((route) => route.path);
    expect(paths).toEqual([
      '/organization/leave',
      '/organization/leave/approvals',
      '/organization/leave/calendar',
      '/organization/leave/settings',
    ]);
  });

  it('forwards each pre-move URL under the same gate as its page', () => {
    const pairs = [
      ['/leave', LEAVE_PATHS.MY_LEAVE],
      ['/leave/approvals', LEAVE_PATHS.APPROVALS],
      ['/leave/calendar', LEAVE_PATHS.CALENDAR],
      ['/leave/settings', LEAVE_PATHS.SETTINGS],
    ] as const;
    for (const [legacy, current] of pairs) {
      const redirect = find(legacy);
      expect(redirect, legacy).toBeDefined();
      expect(redirect?.breadcrumb, legacy).toBeUndefined();
      expect(redirect?.permissions, legacy).toEqual(find(current)?.permissions);
    }
  });

  it('gates settings on the manage grant alone', () => {
    const route = find(LEAVE_PATHS.SETTINGS);
    expect(route?.permissions).toEqual(LEAVE_MANAGE_ACCESS);
    // Editing a leave type changes what the whole plant may ask for, so it
    // must never fall open to everyone who can apply or decide.
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.APPLY);
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.DECIDE);
  });

  it('gates the approvals route on a decide grant, not on module access', () => {
    const route = find(LEAVE_PATHS.APPROVALS);
    expect(route?.permissions).toEqual(LEAVE_DECIDE_ACCESS);
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.APPLY);
  });

  it('gates the calendar on team access', () => {
    const route = find(LEAVE_PATHS.CALENDAR);
    expect(route?.permissions).toEqual(LEAVE_TEAM_ACCESS);
  });

  it('lets anyone in the module reach their own leave', () => {
    const route = find(LEAVE_PATHS.MY_LEAVE);
    expect(route?.permissions).toEqual(LEAVE_ACCESS);
  });

  it('applying and deciding never collapse into one grant', () => {
    expect(LEAVE_DECIDE_ACCESS).not.toContain(LEAVE_PERMISSIONS.APPLY);
    expect(LEAVE_DECIDE_ACCESS).not.toContain(LEAVE_PERMISSIONS.APPLY_FOR_OTHERS);
  });

  it('permission strings are namespaced to the leave app', () => {
    for (const value of Object.values(LEAVE_PERMISSIONS)) {
      expect(value.startsWith('leave.')).toBe(true);
    }
  });
});
