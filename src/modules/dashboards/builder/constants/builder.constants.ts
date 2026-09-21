import { BOARD_FEED_PERMISSIONS, DASHBOARDS_PERMISSIONS } from '@/config/permissions';

import type { BoardAccent, BoardDensity, BoardMode, BoardSurface } from '../types';

/**
 * Who may open the EDITOR.
 *
 * ONE right, and deliberately not a union with the boards' rights the way the
 * carousel's list is. The builder is an editor: somebody who can read six
 * wall boards has no more business arranging a seventh than anybody else, and
 * conflating "can read boards" with "can make boards" is how a right that
 * grants nothing quietly becomes one that grants a menu item to the whole
 * company.
 */
export const BOARD_BUILDER_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.BUILD_DASHBOARDS,
];

/**
 * Who sees the "My Dashboards" entry — the LIST, not the editor.
 *
 * THE PROBLEM THIS SOLVES, AND WHY IT IS NOT JUST THE BUILD RIGHT
 * Two different people need this entry: somebody who builds boards, and
 * somebody a board was published to. The second holds no build right, and
 * gating the list on it alone would hide every board they were deliberately
 * given.
 *
 * THE PROBLEM IT MUST NOT CAUSE, AND WHY IT IS NOT UNGATED EITHER
 * `Sidebar.tsx` shows a submenu child with no permissions to EVERYONE,
 * including the unattended wall screen whose whole promise is that it holds
 * one right, opens one page and reaches nothing else. An ungated entry here
 * would put a menu item in front of a television —
 * `carousel/__tests__/carouselOnlyNav.test.ts` asserts that it does not.
 *
 * So: the build right, plus every board FEED right. That covers exactly the
 * people who could get something out of a built board, because the server
 * only opens one to a reader holding at least one of its cards' feeds
 * (`board_builder/permissions.py`). The carousel right is NOT in this list,
 * which is what keeps the wall screen's menu to one entry.
 *
 * The OPERATIONAL rights the feeds mirror are deliberately absent too. They
 * would add most of the company to a menu entry for a feature they may never
 * have been given a board on, and anybody who is given one can be sent the
 * link — a board's address works whether or not its reader can find it in a
 * menu.
 */
export const BOARD_LIST_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    DASHBOARDS_PERMISSIONS.BUILD_DASHBOARDS,
    ...Object.values(BOARD_FEED_PERMISSIONS),
  ]),
];

/**
 * How often a built board re-reads its figures.
 *
 * Sixty seconds, matching the other wall boards. Not configurable per board
 * on purpose: an author choosing a five-second refresh for a card that scans
 * a large table is a decision whose cost lands on a shared Postgres box
 * serving fourteen databases, and they have no way to see that cost.
 */
export const BUILT_BOARD_REFRESH_MS = 60_000;

/**
 * The hues, in the order the picker shows them.
 *
 * A CLOSED LIST rather than a colour well, and that is the point rather than
 * a limitation. The wall boards' rule is that colour carries meaning: a band
 * owns a hue, every bar inside it is a tint of that hue, and green/amber/red
 * are reserved for CONDITION. A free picker would let somebody paint a
 * healthy tile red on a wall where red means "this is wrong".
 *
 * So the author picks an identity and the stylesheet supplies the colour —
 * the same `ops-b-*` classes the Plant and Logistics boards paint with, which
 * is what stops a card built here and the same card over there being two
 * different teals.
 */
export const ACCENT_LABELS: Record<BoardAccent, string> = {
  warehouse: 'Warehouse — cyan',
  dispatch: 'Dispatch — blue',
  transport: 'Transport — violet',
  purchase: 'Purchase — amber',
  store: 'Store — green',
  production: 'Production — indigo',
  shifting: 'Shifting — rose',
};

export const ACCENT_ORDER: readonly BoardAccent[] = [
  'warehouse',
  'dispatch',
  'transport',
  'purchase',
  'store',
  'production',
  'shifting',
];

export const SURFACE_LABELS: Record<BoardSurface, string> = {
  light: 'Light — for a bright office',
  dark: 'Dark — for the floor by the lines',
};

export const DENSITY_LABELS: Record<BoardDensity, string> = {
  compact: 'Compact',
  normal: 'Normal',
  roomy: 'Roomy',
};

export const MODE_LABELS: Record<BoardMode, string> = {
  WALL: 'Wall screen',
  PAGE: 'In-app page',
};

export const MODE_HELP: Record<BoardMode, string> = {
  WALL: 'Fits one screen with no scrolling, and can join the board carousel.',
  PAGE: 'Scrolls inside the app. Taller, for a board somebody reads at a desk.',
};

/** Where a new board starts: the shape of the boards that already exist. */
export const NEW_BOARD_DEFAULTS = {
  name: '',
  description: '',
  mode: 'WALL' as BoardMode,
  columns: 4,
  rows: 3,
  surface: 'light' as BoardSurface,
  density: 'normal' as BoardDensity,
  accent: 'warehouse' as BoardAccent,
  show_heading: true,
  in_carousel: false,
};

/**
 * The drag payload's MIME type.
 *
 * A custom type rather than `text/plain`, so a card dragged out of the palette
 * and dropped on a text field somewhere else in the app does not paste a card
 * key into it, and a bit of text dragged INTO the canvas is not mistaken for
 * a card.
 */
export const DRAG_TYPE = 'application/x-factoryflow-card';
