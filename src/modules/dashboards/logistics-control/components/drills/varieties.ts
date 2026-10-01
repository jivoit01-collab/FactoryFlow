import type { NonMovingItem } from '../../../non-moving/types';
import type { WarehouseOccupancyItem } from '../../../production-control/types';
import { weighItems } from '../../utils';
import { collect } from './format';

/**
 * Stock rolled up the way the floor thinks about it.
 *
 * The variety is the unit a keeper answers in — how much olive is standing,
 * how much mustard — where the SKU list underneath is a hundred rows that
 * answer a question nobody asked of a warehouse total. Both panels that group
 * by variety take their rows from here, so the two cannot drift apart.
 */

/** The variety a row belongs to, never a blank group. */
export function varietyOf(row: { sub_group?: string | null }): string {
  return row.sub_group?.trim() || 'Ungrouped';
}

/**
 * Kilograms on one stock row, by the board's own weight chain.
 *
 * Mirrors `rollUpTonnage` rather than re-deriving it: the drill-down exists to
 * show what the tile counted, so a row that contributed nothing to the tonnage
 * must show a dash here and not a number computed some other way.
 */
export function rowTonnes(row: {
  on_hand: number;
  pieces_per_box: number | null;
  gross_weight_per_case: number | null;
}): number | null {
  if (!row.gross_weight_per_case || !row.pieces_per_box) return null;
  return (row.on_hand * row.gross_weight_per_case) / row.pieces_per_box / 1000;
}

/** One variety's share of what is standing in the warehouse. */
export interface VarietyTotal {
  variety: string;
  items: number;
  tonnes: number;
  value: number;
  /** Items in the variety SAP holds no case weight for. */
  unweighed: number;
}

/**
 * Stock rolled up by variety, heaviest first.
 *
 * Items SAP cannot weigh are counted rather than dropped, so a variety's
 * tonnage discloses that it is a floor the same way the tile's does.
 */
export function varietyTotals(
  rows: readonly (Parameters<typeof rowTonnes>[0] & {
    sub_group: string;
    stock_value: number;
  })[],
): VarietyTotal[] {
  const byVariety = new Map<string, VarietyTotal>();

  for (const row of rows) {
    const variety = varietyOf(row);
    const found = byVariety.get(variety) ?? {
      variety,
      items: 0,
      tonnes: 0,
      value: 0,
      unweighed: 0,
    };

    const tonnes = rowTonnes(row);
    found.items += 1;
    found.value += row.stock_value ?? 0;
    if (tonnes === null) found.unweighed += 1;
    else found.tonnes += tonnes;

    byVariety.set(variety, found);
  }

  return [...byVariety.values()].sort((a, b) => b.tonnes - a.tonnes);
}

/** One variety's idle stock. */
export interface IdleVariety {
  variety: string;
  items: number;
  quantity: number;
  tonnes: number;
  value: number;
  /** Days the oldest item in the variety has been standing. */
  longestIdle: number;
  /** Items in the variety the occupancy feed cannot weigh. */
  unweighed: number;
}

/** The company a row was read from, where the band tagged it. */
function companyOf(row: object): string {
  return (row as { company_code?: string }).company_code ?? '';
}

/**
 * Idle rows weighed against their own company's stock rows, then added.
 *
 * The same split the tile's sides make: an item code means one weight in Oil's
 * item master and possibly another in Mart's, so a Mart row is never weighed
 * by an Oil row. Untagged rows all fall in one group, as before.
 */
function weighPerCompany(
  items: readonly NonMovingItem[],
  stockRows: readonly WarehouseOccupancyItem[],
): { tonnes: number; unweighed: number } {
  let tonnes = 0;
  let unweighed = 0;
  for (const company of new Set(items.map(companyOf))) {
    const weighed = weighItems(
      items.filter((row) => companyOf(row) === company),
      stockRows.filter((row) => companyOf(row) === company),
    );
    tonnes += weighed.tonnes;
    unweighed += weighed.unweighed;
  }
  return { tonnes, unweighed };
}

/**
 * Idle stock rolled up by variety, heaviest first.
 *
 * Weighed through `weighItems` rather than by a local calculation, because the
 * non-moving feed carries no unit of measure at all — its quantities are
 * weighable only by looking each item up in the occupancy rows. Using the same
 * function the tile uses is what keeps the panel's total equal to the tile's;
 * a second weight chain here would drift from it the first time either changed.
 */
export function idleVarieties(
  rows: readonly NonMovingItem[],
  stockRows: readonly WarehouseOccupancyItem[],
): IdleVariety[] {
  return [...collect(rows, varietyOf).entries()]
    .map(([variety, group]) => {
      const weighed = weighPerCompany(group, stockRows);
      return {
        variety,
        items: group.length,
        quantity: group.reduce((total, row) => total + (row.quantity ?? 0), 0),
        tonnes: weighed.tonnes,
        value: group.reduce((total, row) => total + (row.value ?? 0), 0),
        longestIdle: group.reduce(
          (worst, row) => Math.max(worst, row.days_since_last_movement ?? 0),
          0,
        ),
        unweighed: weighed.unweighed,
      };
    })
    .sort((a, b) => b.tonnes - a.tonnes);
}
