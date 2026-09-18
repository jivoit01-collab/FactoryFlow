/**
 * What a DASHBOARD-ONLY login sees in the sidebar.
 *
 * WHAT THIS PROTECTS
 * Board feed rights (`control_boards.can_read_*_feed`) exist because granting a
 * board used to mean granting the operational module behind it, and the sidebar
 * shows a module the moment the user holds ANY permission under its app label
 * (`hasModulePermission`, a prefix match, in `core/auth/hooks/usePermission.ts`).
 *
 * The whole fix rests on one property: `control_boards` is an app label that no
 * navigation entry keys off. That property is not enforced anywhere — it is
 * true because nobody has written `modulePrefix: 'control_boards'`, and it would
 * break silently. A dashboard-only login would simply start seeing modules it
 * cannot open, and nothing would fail.
 *
 * So it is asserted here, along with the other half: that the Dashboards menu
 * and the composed boards DO appear for a login holding only feed rights.
 * Granting somebody a board and having the menu stay hidden is the failure this
 * change set out to fix in the first place.
 */

import { describe, expect, it } from 'vitest';

import { BOARD_FEED_APP_LABEL, BOARD_FEED_PERMISSIONS } from '@/config/permissions';
import type { ModuleNavItem } from '@/core/types/module.types';

import { dashboardsModuleConfig } from '../module.config';

/**
 * Every module config, as SOURCE TEXT rather than as imported modules.
 *
 * Importing them pulls in the Redux store through `@/app/registry`, which is a
 * circular import from a test file. Reading the source sidesteps that — and is
 * the stronger check anyway: it still covers a config that would fail to import,
 * and `modulePrefix` is a literal in every one of them.
 */
const moduleConfigSources = import.meta.glob<string>('../../**/module.config.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** Everything "Dashboards — Boards Only" grants: every feed right, nothing else. */
const FEEDS_ONLY: readonly string[] = Object.values(BOARD_FEED_PERMISSIONS);

/**
 * The sidebar's parent rule, copied from `Sidebar.tsx` in its real precedence
 * order: `modulePrefix` short-circuits and `permissions` is then never read.
 */
const parentVisibleTo = (held: readonly string[], item: ModuleNavItem): boolean => {
  if (!item.showInSidebar) return false;
  if (item.modulePrefix) {
    const prefixes = Array.isArray(item.modulePrefix) ? item.modulePrefix : [item.modulePrefix];
    return prefixes.some((prefix) => held.some((code) => code.startsWith(`${prefix}.`)));
  }
  if (item.permissions && item.permissions.length > 0) {
    return item.permissions.some((code) => held.includes(code));
  }
  // Routes with neither are shown — the Gate case.
  return true;
};

const dashboardsNav = dashboardsModuleConfig.navigation?.find(
  (item) => item.path === '/dashboards',
);

describe('a dashboard-only login', () => {
  it("is matched by no module navigation prefix", () => {
    /**
     * The load-bearing assertion. `hasModulePermission` prefix-matches, so a
     * nav item adopting this app label turns every feed right into a key into
     * that module's menu — the original bug back, with the breadth hidden in a
     * config file instead of visible as group membership.
     */
    const offenders = Object.entries(moduleConfigSources)
      .filter(([, source]) => new RegExp(`modulePrefix[^;]*${BOARD_FEED_APP_LABEL}`).test(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });

  it('is granted by no module outside Dashboards', () => {
    /**
     * A feed right on a non-dashboard nav entry would put that module in the
     * sidebar for a board-only login just as surely as a prefix would.
     */
    const offenders = Object.entries(moduleConfigSources)
      .filter(([path]) => !path.includes('/dashboards/'))
      .filter(
        ([, source]) =>
          source.includes(`${BOARD_FEED_APP_LABEL}.`) || source.includes('BOARD_FEED_PERMISSIONS'),
      )
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });

  it('does see the Dashboards menu itself', () => {
    /**
     * The other half, and the bug being fixed: a login granted a board must
     * actually be able to reach it. A parent gate that forgot the feed rights
     * hides the whole menu, not just one board.
     */
    expect(dashboardsNav).toBeDefined();
    expect(parentVisibleTo(FEEDS_ONLY, dashboardsNav as ModuleNavItem)).toBe(true);
  });

  it.each([
    ['/dashboards/admin-control', BOARD_FEED_PERMISSIONS.STOCK],
    ['/dashboards/plant-board', BOARD_FEED_PERMISSIONS.NON_MOVING],
    ['/dashboards/company-expense', BOARD_FEED_PERMISSIONS.FACTORY_EXPENSE],
    ['/dashboards/customer-returns', BOARD_FEED_PERMISSIONS.GOODS_RETURN],
  ])('opens %s for a holder of one of its feed rights', (path, feedRight) => {
    /**
     * Per board, with ONE right rather than all of them — the realistic case,
     * since each board's group grants only its own feeds. Both the parent and
     * the child must pass, which is why the parent is re-checked here.
     */
    const held = [feedRight];
    const child = dashboardsNav?.children?.find((item) => item.path === path);

    expect(child, `${path} is missing from the Dashboards menu`).toBeDefined();
    expect(parentVisibleTo(held, dashboardsNav as ModuleNavItem)).toBe(true);
    expect(child?.permissions?.some((code) => held.includes(code))).toBe(true);
  });

  it('is not shown a board whose feed it does not hold', () => {
    /** One board's group must not quietly open its neighbours. */
    const held = [BOARD_FEED_PERMISSIONS.GOODS_RETURN];
    const adminControl = dashboardsNav?.children?.find(
      (item) => item.path === '/dashboards/admin-control',
    );

    expect(adminControl?.permissions?.some((code) => held.includes(code))).toBe(false);
  });
});
