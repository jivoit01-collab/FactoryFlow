/**
 * The board's tunable figures, and where each one came from.
 *
 * Two of these are estimates standing in for answers the floor has not given
 * yet. They are named constants rather than inline numbers precisely so that
 * correcting them is a one-line edit with a test to prove it landed — see
 * `LOOSE_PIECES_PER_PALLET`.
 */

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';

/** The warehouse this board watches. */
export const CONTROL_WAREHOUSE = 'BH-PF';

/**
 * Pallets BH-PF holds when properly full — 400, given by the warehouse on
 * 2026-09-09.
 *
 * This number exists in no system. SAP `OWHS` has no capacity column, Warehouse
 * Ops has never had a layout for BH-PF (only BH-BT and BH-GPM are drawn), and
 * the backend has no warehouse-capacity model. It is deliberately a constant
 * here rather than a silent default: if it moves, it moves in one place, in a
 * commit that says who said so.
 *
 * Confirmed as TOTAL FLOOR HOLDING, not racked positions — BH-PF is not a
 * racked warehouse — so a reading above 100% is a real overload, not full racks
 * with stock stacked around them.
 */
export const PALLET_CAPACITY = 400;

/** Red past this share of capacity. 80% of 400 = 320 pallets. */
export const OCCUPANCY_ALERT_PERCENT = 80;

/**
 * Boxes on a full pallet.
 *
 * Measured, not assumed: across 2,343 full pallets standing in BH-PF, 904 carry
 * exactly 40 boxes and 590 carry 45 — 64% of every pallet at one of those two
 * figures, mean 40.1. Forty is the modal pallet.
 */
export const BOXES_PER_PALLET = 40;

/**
 * How a SKU that SAP transacts one-piece-per-box is stacked.
 *
 * `SalFactor2 = 1` means SAP bills the piece itself, so "boxes" collapses to
 * "pieces" and dividing by `BOXES_PER_PALLET` is nonsense — it would read 4,028
 * jars of 200 ml ghee as 100 pallets, i.e. 40 jars per pallet. These SKUs get
 * their own pieces-per-pallet figure instead, chosen by physical format.
 *
 * They are 13 of BH-PF's SKUs and only ~6% of its pieces, but 46% of its raw
 * box count, so getting them roughly right matters more than it looks.
 */
export type LooseFormat = 'drum' | 'jerryCan' | 'bulkTin' | 'jar';

export const LOOSE_PIECES_PER_PALLET: Record<LooseFormat, number> = {
  /** 200 L drums are not palletised — one drum, one floor spot. Certain. */
  drum: 1,
  /**
   * OPEN QUESTION — 15 L / 15 kg jerry cans, the largest loose group (3,412
   * cans). 50 is the midpoint of a 40–60 guess; the floor has not confirmed it.
   * Swings the board's reading by roughly ±25 pallets.
   */
  jerryCan: 50,
  /** 12/13 kg bulk tins. Stacked like cans but smaller; ~45 to a pallet. */
  bulkTin: 45,
  /**
   * OPEN QUESTION — A2 Desi Ghee jars (9,008 across 200 ml / 500 ml / 1 L).
   * These are almost certainly cartoned in reality: the comparable Kirpa Desi
   * Ghee 500 MLS is configured at 16 per case while all three A2 sizes carry
   * `SalFactor2 = 1`. If that is a item-master error, fixing it in SAP removes
   * this estimate entirely and is the better fix. 480 assumes ~30 cartons of 16
   * to a pallet.
   */
  jar: 480,
};

/**
 * Litres in one piece, above which a loose SKU is a drum rather than a can.
 * Read off `OITM.SalPackUn`, never the SKU name — the name lies about volume
 * and the item master does not.
 */
export const LOOSE_FORMAT_LITRE_BREAKS = { drum: 100, jerryCan: 12, bulkTin: 5 } as const;

/** How long stock may stand in BH-PF before the board calls it out. */
export const STANDING_AGE_DAYS = 3;

/** SAP item group 102 — FINISHED. What BH-PF actually holds. */
export const FINISHED_GOODS_ITEM_GROUP = 102;

/** Board refresh. Production moves in minutes, not seconds. */
export const PRODUCTION_CONTROL_REFRESH_MS = 60_000;

/** Rows any one panel will draw before it says how many it left out. */
export const MAX_RENDERED_ROWS = 200;

/** Which hue each panel owns, in the shared control vocabulary. */
export const PANEL_ACCENT = {
  lines: 'emerald',
  breakdowns: 'rose',
  speed: 'sky',
  occupancy: 'indigo',
  stock: 'slate',
  standing: 'amber',
} as const;

// ============================================================================
// Permissions
// ============================================================================

/**
 * Rights this board reads under, reusing what already exists rather than
 * minting a new one.
 *
 * The board is three existing reports on one screen — production runs, SAP
 * warehouse stock, and the non-moving report — so it needs no permission of its
 * own. That follows the same reasoning as `VIEW_PACKING_MATERIAL`: a new right
 * would need a row created on the live database and every relevant group edited
 * before anyone could open the board, and it would buy nothing, because holding
 * these three rights is exactly what being allowed to read this board means.
 *
 * The cost is that the board cannot be restricted independently of the reports
 * it summarises. Mint a dedicated right the day that matters.
 */
export const PRODUCTION_CONTROL_LINES_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
];

export const PRODUCTION_CONTROL_FLOOR_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
];

export const PRODUCTION_CONTROL_STANDING_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
];

/** Route/nav gate — holding any one panel's right opens the board. */
export const PRODUCTION_CONTROL_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    ...PRODUCTION_CONTROL_LINES_PERMISSIONS,
    ...PRODUCTION_CONTROL_FLOOR_PERMISSIONS,
    ...PRODUCTION_CONTROL_STANDING_PERMISSIONS,
  ]),
];
