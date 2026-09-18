/**
 * The Dashboards menu and the Dashboards landing page must list the same boards.
 *
 * WHAT THIS PROTECTS
 * The landing page keeps its own hand-written array of cards, separate from the
 * module config's navigation. Nothing connected the two, so adding a board meant
 * remembering to edit both — and forgetting the second one is silent: the board
 * works, the sidebar shows it, and the page a user actually lands on simply does
 * not offer it. As the landing page's own comment puts it, a board reachable
 * from the menu but missing there "reads as one this login cannot open at all".
 *
 * That is exactly what happened when the HR board was added, which is why this
 * exists.
 *
 * Both files are read as SOURCE TEXT rather than imported, for the reason
 * `boardFeedNav.test.ts` gives: importing them pulls in the Redux store through
 * `@/app/registry`, which is a circular import from a test file. The routes are
 * string literals in both, so a regex is enough — and it still covers a config
 * that would fail to import.
 */

import { describe, expect, it } from 'vitest';

const landingSource = import.meta.glob<string>('../pages/DashboardsLandingPage.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const navSource = import.meta.glob<string>('../module.config.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const only = (sources: Record<string, string>): string => {
  const values = Object.values(sources);
  expect(values).toHaveLength(1);
  return values[0];
};

/** Every `route: '/dashboards/…'` on a landing card. */
const landingRoutes = new Set(
  [...only(landingSource).matchAll(/route:\s*'(\/dashboards\/[^']*)'/g)].map((m) => m[1]),
);

/**
 * Every `path` in the Dashboards submenu.
 *
 * Taken from the `children` block alone: the routes array above it contains
 * settings and config pages that are deliberately not cards, and folding those
 * in would demand a tile for every one of them.
 */
const childrenBlock = /\n {6}children:\s*\[([\s\S]*?)\n {6}\],/.exec(only(navSource));

const navPaths = new Set(
  [...(childrenBlock?.[1] ?? '').matchAll(/path:\s*'(\/dashboards\/[^']*)'/g)].map((m) => m[1]),
);

/**
 * Drift that was already here when this check was written.
 *
 * NOT an exemption anybody should add to. These are listed rather than fixed
 * because whether each one is an oversight or a deliberate omission is a
 * question for the board's owner, not for the test that happened to notice: a
 * menu entry may be withheld on purpose, and a card may be pointing at a page
 * reached some other way. Naming them keeps the invariant enforceable for
 * everything else — a NEW mismatch still fails.
 *
 * Shrink this list; never grow it.
 */
const KNOWN_MENU_WITHOUT_CARD: readonly string[] = ['/dashboards/production-lines'];

const KNOWN_CARD_WITHOUT_MENU: readonly string[] = [
  '/dashboards/production-movement',
  '/dashboards/dispatch-pipeline',
  '/dashboards/dispatch-tracking',
  '/dashboards/budget-approvals',
];

describe('the Dashboards menu and its landing page', () => {
  it('both actually parsed', () => {
    /** A regex that silently matched nothing would make every test below pass. */
    expect(navPaths.size).toBeGreaterThan(10);
    expect(landingRoutes.size).toBeGreaterThan(10);
  });

  it('offers a landing card for every board in the menu', () => {
    const missing = [...navPaths].filter(
      (path) => !landingRoutes.has(path) && !KNOWN_MENU_WITHOUT_CARD.includes(path),
    );

    expect(missing, 'in the Dashboards menu but with no card on the landing page').toEqual([]);
  });

  it('offers no landing card for a board the menu does not have', () => {
    const orphans = [...landingRoutes].filter(
      (route) => !navPaths.has(route) && !KNOWN_CARD_WITHOUT_MENU.includes(route),
    );

    expect(orphans, 'on the landing page but missing from the Dashboards menu').toEqual([]);
  });

  it('has not quietly stopped noticing the drift it was told to ignore', () => {
    /** The allowlists are only safe while they are still real. If one of these
        gets fixed, the entry must go — otherwise the list grows into a place
        mismatches go to be forgotten. */
    for (const path of KNOWN_MENU_WITHOUT_CARD) {
      expect(navPaths.has(path), `${path} is no longer in the menu — drop it from the list`).toBe(
        true,
      );
    }
    for (const route of KNOWN_CARD_WITHOUT_MENU) {
      expect(
        landingRoutes.has(route),
        `${route} is no longer a card — drop it from the list`,
      ).toBe(true);
    }
  });

  it('lists the HR board in both', () => {
    /** The board this test was written for. Named so the parity check above
        cannot pass by both lists being empty of it. */
    expect(navPaths.has('/dashboards/hr-board')).toBe(true);
    expect(landingRoutes.has('/dashboards/hr-board')).toBe(true);
  });
});
