/**
 * The geometry rules, pinned.
 *
 * These are the same rules the server enforces on save and re-checks on read
 * (`board_builder/serializers.py`, `board_builder/services.py`). They are
 * duplicated deliberately — neither side trusts the other — so the thing
 * worth testing here is that this copy AGREES with that one. Every case below
 * has a counterpart in `board_builder/tests.py`.
 *
 * Overlap and overflow are the two failures that render as a wrong board
 * rather than an error: two cards on one square, or a tile hanging off a wall
 * screen's edge with nothing anywhere saying so.
 */

import { describe, expect, it } from 'vitest';

import type { CardSpec, Placement } from '../../types';
import { cellsOf, firstFreeCell, fits, occupancy, partitionByFit } from '../layout';

function spec(key: string, columns: number, rows: number): CardSpec {
  return {
    key,
    title: key,
    summary: '',
    category: 'Test',
    columns,
    rows,
    accent: 'warehouse',
    note: '',
    needs_sap: false,
    options: [],
  };
}

const CATALOGUE = new Map<string, CardSpec>([
  ['wide', spec('wide', 2, 1)],
  ['small', spec('small', 1, 1)],
  ['big', spec('big', 2, 2)],
]);

function at(card_key: string, column: number, row: number): Placement {
  return { card_key, column, row, title: '', accent: '', options: {} };
}

describe('cellsOf', () => {
  it('covers every cell of a footprint', () => {
    expect(cellsOf({ column: 1, row: 2 }, { columns: 2, rows: 2 })).toEqual([
      '1,2',
      '1,3',
      '2,2',
      '2,3',
    ]);
  });
});

describe('fits', () => {
  const grid = { columns: 4, rows: 3 };

  it('refuses a card that would hang off the right edge', () => {
    // A 2x1 in the last column of a 4-wide board. Refused rather than
    // clipped: a tile half off a wall screen is a figure half missing, and
    // nothing on the screen says so.
    expect(fits({ column: 3, row: 0 }, { columns: 2, rows: 1 }, grid, new Map())).toBe(
      false,
    );
    expect(fits({ column: 2, row: 0 }, { columns: 2, rows: 1 }, grid, new Map())).toBe(true);
  });

  it('refuses a card that would hang off the bottom', () => {
    expect(fits({ column: 0, row: 2 }, { columns: 1, rows: 2 }, grid, new Map())).toBe(
      false,
    );
  });

  it('refuses a card that would overlap another', () => {
    const taken = occupancy([at('wide', 0, 0)], CATALOGUE);
    expect(fits({ column: 1, row: 0 }, { columns: 1, rows: 1 }, grid, taken)).toBe(false);
    expect(fits({ column: 2, row: 0 }, { columns: 1, rows: 1 }, grid, taken)).toBe(true);
  });

  it('refuses a negative origin', () => {
    expect(fits({ column: -1, row: 0 }, { columns: 1, rows: 1 }, grid, new Map())).toBe(
      false,
    );
  });
});

describe('occupancy', () => {
  it('leaves out the card being dragged', () => {
    // Without this, a card dragged one cell to the right collides with where
    // it already is and the move is silently refused.
    const placements = [at('small', 1, 1)];
    expect(occupancy(placements, CATALOGUE).has('1,1')).toBe(true);
    expect(occupancy(placements, CATALOGUE, 0).has('1,1')).toBe(false);
  });

  it('marks every cell of a multi-cell card', () => {
    const taken = occupancy([at('big', 0, 0)], CATALOGUE);
    expect([...taken.keys()].sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
  });
});

describe('firstFreeCell', () => {
  const grid = { columns: 3, rows: 2 };

  it('scans in reading order', () => {
    const taken = occupancy([at('small', 0, 0)], CATALOGUE);
    expect(firstFreeCell({ columns: 1, rows: 1 }, grid, taken)).toEqual({
      column: 1,
      row: 0,
    });
  });

  it('skips a row that cannot hold the footprint', () => {
    const taken = occupancy([at('small', 1, 0)], CATALOGUE);
    // A 2x1 cannot start at 0,0 (1,0 is taken) and cannot start at 2,0 (it
    // would overhang), so it drops to the next row.
    expect(firstFreeCell({ columns: 2, rows: 1 }, grid, taken)).toEqual({
      column: 0,
      row: 1,
    });
  });

  it('returns null for a full board rather than a silent no-op', () => {
    const taken = occupancy(
      [at('small', 0, 0), at('small', 1, 0), at('small', 2, 0)],
      CATALOGUE,
    );
    expect(firstFreeCell({ columns: 1, rows: 1 }, { columns: 3, rows: 1 }, taken)).toBeNull();
  });
});

describe('partitionByFit', () => {
  it('keeps what fits and hands back what does not', () => {
    // Shrinking a board is a legitimate edit that can orphan cards. Never a
    // silent delete, and never a blocked resize.
    const { kept, dropped } = partitionByFit(
      [at('small', 0, 0), at('wide', 2, 0), at('small', 0, 2)],
      CATALOGUE,
      { columns: 3, rows: 2 },
    );
    expect(kept.map((placement) => placement.card_key)).toEqual(['small']);
    expect(dropped.map((placement) => placement.card_key)).toEqual(['wide', 'small']);
  });

  it('keeps everything when the grid still holds it', () => {
    const placements = [at('small', 0, 0), at('wide', 1, 0)];
    const { kept, dropped } = partitionByFit(placements, CATALOGUE, {
      columns: 3,
      rows: 1,
    });
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it('treats a card no longer in the catalogue as 1x1 rather than crashing', () => {
    // A board saved before a card was removed from the code. The viewer
    // reports it as retired; the editor must still be able to open the board
    // so its author can clear it.
    const { kept } = partitionByFit([at('card_that_was_deleted', 0, 0)], CATALOGUE, {
      columns: 2,
      rows: 1,
    });
    expect(kept).toHaveLength(1);
  });
});
