import type { CardSpec, Placement } from '../types';

/**
 * The geometry the editor and the server both have to agree on.
 *
 * The server validates every save (`board_builder/serializers.py`) and drops
 * anything that no longer fits on read. This file is the SAME rules, run as
 * the author drags, so a bad arrangement is impossible to express rather than
 * refused after the fact. Neither side trusts the other: without the server
 * check an author could post anything, and without this one the editor would
 * let somebody build a board for ten seconds and then reject it whole.
 */

export interface Footprint {
  columns: number;
  rows: number;
}

/** The card's fixed footprint, or a 1x1 fallback for a key no longer in the
 *  catalogue — which the board will report as retired rather than draw. */
export function footprintOf(
  cardKey: string,
  catalogue: Map<string, CardSpec>,
): Footprint {
  const spec = catalogue.get(cardKey);
  return { columns: spec?.columns ?? 1, rows: spec?.rows ?? 1 };
}

/** Every cell one placement covers. */
export function cellsOf(
  placement: Pick<Placement, 'column' | 'row'>,
  footprint: Footprint,
): string[] {
  const cells: string[] = [];
  for (let dx = 0; dx < footprint.columns; dx += 1) {
    for (let dy = 0; dy < footprint.rows; dy += 1) {
      cells.push(`${placement.column + dx},${placement.row + dy}`);
    }
  }
  return cells;
}

/**
 * The cells currently covered, mapped to the index of the card covering them.
 *
 * `ignoreIndex` leaves one card out, which is what makes dragging a card
 * one cell to the right work: without it, the card being moved collides with
 * where it already is.
 */
export function occupancy(
  placements: Placement[],
  catalogue: Map<string, CardSpec>,
  ignoreIndex = -1,
): Map<string, number> {
  const taken = new Map<string, number>();
  placements.forEach((placement, index) => {
    if (index === ignoreIndex) return;
    for (const cell of cellsOf(placement, footprintOf(placement.card_key, catalogue))) {
      taken.set(cell, index);
    }
  });
  return taken;
}

export interface GridSize {
  columns: number;
  rows: number;
}

/** Whether a footprint can sit with its top-left at this cell. */
export function fits(
  at: { column: number; row: number },
  footprint: Footprint,
  grid: GridSize,
  taken: Map<string, number>,
): boolean {
  if (at.column < 0 || at.row < 0) return false;
  if (at.column + footprint.columns > grid.columns) return false;
  if (at.row + footprint.rows > grid.rows) return false;
  return cellsOf(at, footprint).every((cell) => !taken.has(cell));
}

/**
 * Where a card dropped from the palette should land if the author did not
 * aim at a particular cell — reading order, first free spot.
 *
 * Returns null when the board is full, which the caller turns into a message
 * rather than a silent no-op: a drag that does nothing looks like a bug.
 */
export function firstFreeCell(
  footprint: Footprint,
  grid: GridSize,
  taken: Map<string, number>,
): { column: number; row: number } | null {
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (fits({ column, row }, footprint, grid, taken)) return { column, row };
    }
  }
  return null;
}

/**
 * The placements that still fit after the grid has been made smaller.
 *
 * Shrinking a board is a legitimate edit and it can orphan cards. Rather than
 * refuse the resize or silently delete, the editor keeps what fits, hands back
 * what does not, and says so — the author then decides whether to drop those
 * cards or make the board bigger again.
 */
export function partitionByFit(
  placements: Placement[],
  catalogue: Map<string, CardSpec>,
  grid: GridSize,
): { kept: Placement[]; dropped: Placement[] } {
  const kept: Placement[] = [];
  const dropped: Placement[] = [];
  const taken = new Map<string, number>();

  placements.forEach((placement, index) => {
    const footprint = footprintOf(placement.card_key, catalogue);
    if (fits(placement, footprint, grid, taken)) {
      for (const cell of cellsOf(placement, footprint)) taken.set(cell, index);
      kept.push(placement);
    } else {
      dropped.push(placement);
    }
  });

  return { kept, dropped };
}
