import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';

import { ACCOUNTS_BOARD_VIEW_PERMISSIONS } from '../../accounts-board/constants';
import { ADMIN_BOARD_VIEW_PERMISSIONS } from '../../admin-control/constants';
import { LOGISTICS_CONTROL_VIEW_PERMISSIONS } from '../../logistics-control/constants';
import { PLANT_BOARD_VIEW_PERMISSIONS } from '../../plant-board/constants';

/**
 * The boards the carousel cycles, in the order the owner reads them.
 *
 * Admin first because it is the summary the other two drill into: somebody who
 * glances at the wall for four seconds should have caught the whole factory
 * before the screen moves on to a section of it.
 *
 * Each slide declares the SAME permission list its own route is gated on, so a
 * board a viewer may not open is not shown to them here either. The carousel
 * mounts the page components directly, which bypasses the route guards — that
 * is the point (a carousel-only login has no route to them) and it is also why
 * the gate has to be restated at this level rather than assumed.
 */
export interface CarouselSlide {
  /** Stable key — used for the dot, the storage value and the hotkey order. */
  key: 'admin' | 'plant' | 'logistics' | 'accounts';
  /** What the dot says. Matches the sidebar entry, not the board's own heading,
   *  because the reader picking a slide is reading the menu's vocabulary. */
  label: string;
  /** Any one of these opens the slide, matching the board's own route. */
  permissions: readonly string[];
  /** Where the board lives on its own, for the "open this one" link. */
  path: string;
}

export const CAROUSEL_SLIDES: readonly CarouselSlide[] = [
  {
    key: 'admin',
    label: 'Admin Control',
    // The carousel right is accepted here because the board's single read
    // accepts it too (admin_board/views.py). A display login sees this slide.
    permissions: [...ADMIN_BOARD_VIEW_PERMISSIONS, DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL],
    path: '/dashboards/admin-control',
  },
  {
    key: 'plant',
    label: 'Plant Control',
    // Likewise — plant_board/views.py accepts it on the board read, and only
    // there; the settings views still need the board's own rights.
    permissions: [...PLANT_BOARD_VIEW_PERMISSIONS, DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL],
    path: '/dashboards/plant-board',
  },
  {
    // NOT offered to a carousel-only login, and this is the one place that
    // decision is enforced rather than described. This board reads roughly
    // fifteen endpoints straight from the browser — stock, dispatch, WMS, GRPO,
    // factory expense, the employee roll — each gated on its own operational
    // right. Honouring the carousel right across all of them would make the
    // "one permission" a key into six modules, which is wider than the group it
    // replaced and far harder to audit. So a display login rotates two boards,
    // and this slide waits for the board to get a composed read of its own like
    // the two above.
    key: 'logistics',
    label: 'Logistics Control',
    permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    path: '/dashboards/logistics-control',
  },
  {
    // The cash box. Offered to a display login, because this board is the same
    // shape as Admin and Plant: one composed read, server-side, writing
    // nothing — so the carousel right buys this screen and no route into the
    // register behind it. `accounts_board/views.py` states that at the gate.
    //
    // A wall screen gets the figures WITHOUT the names. The per-person rows —
    // who is holding cash, who took a salary advance — are masked for anyone
    // without `can_view_cash_book`, which a display login has no reason to
    // hold. A television in a corridor naming them is the outcome that
    // arrangement exists to prevent.
    key: 'accounts',
    label: 'Accounts',
    permissions: [
      ...ACCOUNTS_BOARD_VIEW_PERMISSIONS,
      DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL,
    ],
    path: '/dashboards/accounts-board',
  },
];

/**
 * Who may open the carousel.
 *
 * Its own right FIRST, then the boards' gates. The right exists so that an
 * unattended wall screen can hold exactly one permission, open exactly this
 * page and reach nothing else — every other entry in this list also opens the
 * operational report behind it, which is precisely what a display login must
 * not have.
 *
 * The boards' own rights stay because a person who already reads all three
 * should not need a new grant to watch them rotate.
 *
 * Holding ANY one of these opens the page, and the viewer then sees whichever
 * slides their rights cover: a display login gets Admin, Plant and Accounts, a
 * stock-only login gets the first two, and only the boards' own rights bring
 * Logistics.
 */
export const BOARD_CAROUSEL_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    DASHBOARDS_PERMISSIONS.VIEW_BOARD_CAROUSEL,
    ...ADMIN_BOARD_VIEW_PERMISSIONS,
    ...PLANT_BOARD_VIEW_PERMISSIONS,
    ...LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    ...ACCOUNTS_BOARD_VIEW_PERMISSIONS,
  ]),
];

/**
 * How long a board holds the screen, in seconds.
 *
 * The floor is 10s — anything faster is a strobe on a wall rather than a
 * report — and the ceiling 10 minutes, past which the screen may as well be a
 * static board.
 */
export const DWELL_CHOICES: readonly number[] = [15, 30, 45, 60, 90, 120, 300, 600];

/**
 * The default dwell.
 *
 * 45 seconds: long enough to read four bands of tiles without hurrying, short
 * enough that somebody walking past a wall sees the whole factory inside about
 * two minutes.
 */
export const DEFAULT_DWELL_SECONDS = 45;

/** How often the progress bar advances. Smooth enough to read as a countdown. */
export const TICK_MS = 250;

/** Chrome hides after this long without a pointer. A wall has no pointer. */
export const CHROME_IDLE_MS = 4_000;

/**
 * How much of each edge the screen is eating, as a percentage.
 *
 * WHAT THIS IS FOR — TV OVERSCAN, WHICH IS NOT A CSS PROBLEM
 * Most televisions crop the picture they are sent, typically two to five
 * percent off every edge, and show the rest stretched to fill the panel. A
 * browser knows nothing about it: the page is laid out for the full 1920 the TV
 * claims, and the outer band of it is simply never displayed. On these boards
 * that costs the workforce rail on the right — the counts sit at its right edge
 * — and a sliver of every other edge.
 *
 * THE BETTER FIX IS ON THE TELEVISION. Every brand has a setting that turns it
 * off, variously "Just Scan", "Screen Fit", "Pixel-to-pixel", "Full Pixel" or
 * "1:1", usually under picture size or aspect. Use it where you can: it costs
 * nothing and keeps the full resolution.
 *
 * This is for the screens where that setting cannot be found or does not exist.
 * The board is laid out at the full viewport and then SCALED to fit inside what
 * the panel actually shows — scaled, not padded, because these boards size
 * themselves in `vh` and would happily lay out for a height they no longer
 * have, which is the very bug that clipped the plant board's fourth band.
 *
 * Off by default: it gives up real screen area, so a correctly configured
 * display must never pay for it.
 */
export const OVERSCAN_CHOICES: readonly number[] = [0, 2, 3, 4, 5];

export const DEFAULT_OVERSCAN_PERCENT = 0;

/** Where the reader's dwell choice and pause survive a reload. */
export const DWELL_STORAGE_KEY = 'board-carousel-dwell-seconds';
export const PAUSED_STORAGE_KEY = 'board-carousel-paused';
// Per-screen, and deliberately so: overscan is a property of the television in
// front of you, not of the account signed into it.
export const OVERSCAN_STORAGE_KEY = 'board-carousel-overscan';
