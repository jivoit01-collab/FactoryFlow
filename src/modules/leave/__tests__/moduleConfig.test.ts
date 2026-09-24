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

import { leaveModuleConfig } from '../module.config';

describe('leave module config', () => {
  it('registers the four routes', () => {
    const paths = leaveModuleConfig.routes.map((route) => route.path);
    expect(paths).toEqual(['/leave', '/leave/approvals', '/leave/calendar', '/leave/settings']);
  });

  it('gates settings on the manage grant alone', () => {
    const route = leaveModuleConfig.routes.find((r) => r.path === '/leave/settings');
    expect(route?.permissions).toEqual(LEAVE_MANAGE_ACCESS);
    // Editing a leave type changes what the whole plant may ask for, so it
    // must never fall open to everyone who can apply or decide.
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.APPLY);
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.DECIDE);
  });

  it('has no sidebar entry of its own -- it is listed under Organisation', () => {
    // The badge and the per-child gating are checked where the entries now
    // live: `employees/__tests__/attendanceLeaveNav.test.ts`.
    expect(leaveModuleConfig.navigation ?? []).toHaveLength(0);
  });

  it('gates the approvals route on a decide grant, not on module access', () => {
    const route = leaveModuleConfig.routes.find((r) => r.path === '/leave/approvals');
    expect(route?.permissions).toEqual(LEAVE_DECIDE_ACCESS);
    expect(route?.permissions).not.toContain(LEAVE_PERMISSIONS.APPLY);
  });

  it('gates the calendar on team access', () => {
    const route = leaveModuleConfig.routes.find((r) => r.path === '/leave/calendar');
    expect(route?.permissions).toEqual(LEAVE_TEAM_ACCESS);
  });

  it('lets anyone in the module reach their own leave', () => {
    const route = leaveModuleConfig.routes.find((r) => r.path === '/leave');
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
