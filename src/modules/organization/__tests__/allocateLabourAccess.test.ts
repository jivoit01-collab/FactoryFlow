/**
 * Allocate labour used to be a top-level module with its own `/labour` sidebar
 * entry. It now sits inside Organisation. Moving it must not have moved the
 * lock: the route and the sidebar entry are still gated on exactly
 * `[ALLOCATE, VIEW]`, and holding either one still has to reveal the
 * Organisation parent that the entry now hides behind.
 */
import { describe, expect, it, vi } from 'vitest';

// Organisation's sidebar entry carries the pending-leave badge, which reaches
// `@/core/auth`, whose store builds its reducers from the registry. Importing
// the config on its own would evaluate that registry half-built.
vi.mock('@/modules/leave/components/PendingLeaveBadge', () => ({
  PendingLeaveBadge: () => null,
}));

import { LABOUR_PERMISSIONS } from '@/config/permissions';
import type { ModuleNavItem } from '@/core/types';
import { employeesModuleConfig } from '@/modules/employees/module.config';

import { ALLOCATE_LABOUR_ACCESS, organizationModuleConfig } from '../module.config';

/** What the standalone Labour module gated on, spelled out rather than imported. */
const OLD_LABOUR_MODULE_PERMISSIONS = [
  'labour_gate.can_allocate_labour_department',
  'labour_gate.view_labourgateentry',
];

const organisationNav = employeesModuleConfig.navigation?.find(
  (item) => item.path === '/organization',
);
const children: ModuleNavItem[] = organisationNav?.children ?? [];
const allocateChild = children.find((child) => child.path === '/organization/allocate-labour');

describe('Allocate labour — access is unchanged by the move', () => {
  it('gates on the same two permissions the old Labour module did', () => {
    expect([...ALLOCATE_LABOUR_ACCESS]).toEqual(OLD_LABOUR_MODULE_PERMISSIONS);
    expect([...ALLOCATE_LABOUR_ACCESS]).toEqual([
      LABOUR_PERMISSIONS.ALLOCATE,
      LABOUR_PERMISSIONS.VIEW,
    ]);
  });

  it('serves the page at /organization/allocate-labour, still gated on those two', () => {
    const route = organizationModuleConfig.routes?.find(
      (r) => r.path === '/organization/allocate-labour',
    );
    expect(route).toBeDefined();
    expect([...(route?.permissions ?? [])]).toEqual(OLD_LABOUR_MODULE_PERMISSIONS);
  });

  it('still answers the old /labour URL, so bookmarks keep working', () => {
    const route = organizationModuleConfig.routes?.find((r) => r.path === '/labour');
    expect(route).toBeDefined();
    expect([...(route?.permissions ?? [])]).toEqual(OLD_LABOUR_MODULE_PERMISSIONS);
  });

  it('sits in the Organisation submenu as "Allocate labour", same gate', () => {
    expect(allocateChild?.title).toBe('Allocate labour');
    // The sidebar filters children on `permissions` alone (any-of), so the
    // entry must carry them itself — an empty list would show it to everyone.
    expect([...(allocateChild?.permissions ?? [])]).toEqual(OLD_LABOUR_MODULE_PERMISSIONS);
  });

  it('reveals the Organisation parent to somebody who holds only a labour right', () => {
    // The parent is the only way to the child. It is ungated (everyone may read
    // the ownership chart), so a labour-only user always reaches it.
    expect(organisationNav?.permissions ?? []).toHaveLength(0);
  });

  it('no longer registers a second, top-level /labour nav item', () => {
    const topLevel = employeesModuleConfig.navigation?.filter((item) => item.path === '/labour');
    expect(topLevel ?? []).toHaveLength(0);
    expect(organizationModuleConfig.navigation ?? []).toHaveLength(0);
  });
});
