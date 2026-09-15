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
  key: 'admin' | 'plant' | 'logistics';
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
    permissions: ADMIN_BOARD_VIEW_PERMISSIONS,
    path: '/dashboards/admin-control',
  },
  {
    key: 'plant',
    label: 'Plant Control',
    permissions: PLANT_BOARD_VIEW_PERMISSIONS,
    path: '/dashboards/plant-board',
  },
  {
    key: 'logistics',
    label: 'Logistics Control',
    permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    path: '/dashboards/logistics-control',
  },
];

/**
 * Who may open the carousel.
 *
 * The union of the three boards' gates rather than a right of its own, for the
 * same reason each of those boards mints none: a dedicated permission would
 * have to be created as a row on the live database and added to every group
 * before anybody could open the screen, and it would buy nothing — the carousel
 * shows exactly what its three slides show, and each slide re-checks its own
 * gate before it is included.
 *
 * The consequence is worth stating plainly: holding ANY one of these opens the
 * carousel, and the viewer then sees whichever slides their rights cover. A
 * login holding only the stock right gets Admin and Plant and never sees the
 * Logistics slide at all.
 */
export const BOARD_CAROUSEL_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    ...ADMIN_BOARD_VIEW_PERMISSIONS,
    ...PLANT_BOARD_VIEW_PERMISSIONS,
    ...LOGISTICS_CONTROL_VIEW_PERMISSIONS,
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

/** Where the reader's dwell choice and pause survive a reload. */
export const DWELL_STORAGE_KEY = 'board-carousel-dwell-seconds';
export const PAUSED_STORAGE_KEY = 'board-carousel-paused';
