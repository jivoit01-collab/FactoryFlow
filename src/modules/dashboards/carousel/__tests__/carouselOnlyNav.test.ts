/**
 * What a carousel-only login sees in the Dashboards menu.
 *
 * WHAT THIS PROTECTS
 * The group "Dashboards — Carousel Board Only" holds exactly one right,
 * `admin_board.can_view_board_carousel`. The promise made to the business is
 * that a login in it opens the Dashboards menu, finds the Board Carousel entry
 * there, and finds NOTHING ELSE — not the boards the carousel rotates, not the
 * reports behind them.
 *
 * That promise is not enforced anywhere in one place. It is an emergent
 * property of twenty separate nav entries each being gated on its own
 * operational right, and it breaks silently: nobody adding the carousel right
 * to a board's gate for a good reason would notice that they had just put that
 * board on an unattended wall screen's menu. So it is asserted here.
 *
 * HOW IT MIRRORS THE REAL SIDEBAR
 * `Sidebar.tsx` shows the parent when the user holds ANY of its permissions
 * (there is no `modulePrefix` on Dashboards, so the explicit list is what is
 * used), and then keeps each child on the same ANY test. The predicate below is
 * that rule and nothing more. The one thing it cannot catch is a child added
 * with no `permissions` at all — the sidebar shows those unconditionally — so
 * that is asserted separately rather than left to the filter.
 */

import { describe, expect, it } from 'vitest';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ModuleNavItem } from '@/core/types/module.types';

import { dashboardsModuleConfig } from '../../module.config';

/** Everything the display group grants. One right, which is the whole point. */
const CAROUSEL_ONLY: readonly string[] = [DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL];

/** The sidebar's rule: ANY one of the listed rights reveals the entry. */
const visibleTo = (held: readonly string[], item: ModuleNavItem): boolean =>
  !item.permissions || item.permissions.length === 0
    ? true
    : item.permissions.some((code) => held.includes(code));

const dashboardsNav = dashboardsModuleConfig.navigation?.find(
  (item) => item.path === '/dashboards'
);

describe('the Dashboards menu for a carousel-only login', () => {
  it('has a Dashboards entry to test at all', () => {
    expect(dashboardsNav).toBeDefined();
    expect(dashboardsNav?.children?.length).toBeGreaterThan(0);
  });

  it('opens the Dashboards menu for a login holding only the carousel right', () => {
    // Without this the group is useless: the child entry could be perfectly
    // gated and the reader would still never see the menu it sits in. This is
    // the parent-nav gate that has caught us before.
    expect(visibleTo(CAROUSEL_ONLY, dashboardsNav as ModuleNavItem)).toBe(true);
  });

  it('shows Board Carousel and nothing else', () => {
    const shown = (dashboardsNav?.children ?? [])
      .filter((child) => visibleTo(CAROUSEL_ONLY, child))
      .map((child) => child.title);

    expect(shown).toEqual(['Board Carousel']);
  });

  it('gives every other Dashboards entry a gate of its own', () => {
    // A child with no permissions is shown to EVERYONE by `Sidebar.tsx`,
    // including a wall screen. The filter above would report it as "visible"
    // and look like a deliberate grant, so it is caught here by name instead.
    const ungated = (dashboardsNav?.children ?? [])
      .filter((child) => !child.permissions || child.permissions.length === 0)
      .map((child) => child.title);

    expect(ungated).toEqual([]);
  });

  it('lets no board but the carousel accept the carousel right', () => {
    // The regression this file exists for. Honouring
    // `can_view_board_carousel` on another board's gate would put that board on
    // the wall screen's menu — and, because the route guard reads the same
    // list, open the board itself.
    //
    // The two boards the carousel ROTATES are deliberately not exceptions: they
    // accept the right on their composed server read (so the slide renders
    // inside the rotation) but NOT on their own route or nav entry, which is
    // what keeps a display login off them at their own addresses.
    const accepting = (dashboardsNav?.children ?? [])
      .filter((child) =>
        child.permissions?.includes(DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL)
      )
      .map((child) => child.title);

    expect(accepting).toEqual(['Board Carousel']);
  });
});

/**
 * THE REST OF THE SIDEBAR IS NOT COVERED HERE, and it is worth saying why.
 *
 * A wall screen showing one entry inside Dashboards is no use if another module
 * sits on the rail beside it. Modules are revealed by a different rule from
 * children: most carry a `modulePrefix` and appear for anybody holding ANY
 * right in that Django app, matched with a bare `startsWith(`${prefix}.`)`.
 *
 * Asserting that here would mean importing `@/app/registry`, which pulls in
 * every module config — `src/app/__tests__/modules/index.test.ts` records that
 * a direct import hangs, and doing it from here fails on a circular
 * initialisation through the store. So that file tests the registry by reading
 * its source, and this one stays inside the Dashboards config.
 *
 * Checked by hand instead, 2026-09-16: the prefixes in use are artwork,
 * cash_book, etp, goods_return, marketplace, planning_purchase, wms,
 * maintenance, returnable_items, production_planning, production_execution and
 * blowing. None of them is a prefix of `admin_board.`. Re-check that list if a
 * module is ever given the prefix `admin` or `admin_board`.
 *
 * ONE MODULE IS NOT GATED AT ALL and therefore DOES appear beside the carousel:
 * `finance` ("Sales / Finance", with Credit Notes and Debit Notes) declares
 * neither `permissions` nor `modulePrefix` on its nav entry or any of its
 * routes, and `Sidebar.tsx` shows an entry with no gate to everybody. It reads
 * browser storage rather than an API, which is why it has no server right to be
 * gated on and why it was missed. Closing it is a decision about who may see
 * Finance generally, not about the carousel, so it is recorded here rather than
 * silently fixed.
 */
