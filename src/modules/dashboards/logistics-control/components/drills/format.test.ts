import { describe, expect, it } from 'vitest';

import { collect, sharedLabel } from './format';

/**
 * The two helpers every second level is built on.
 *
 * `collect` decides which rows land under which group row, and `sharedLabel`
 * decides what a group says in a cell that can only hold one value. Both are
 * the kind of thing that looks obviously right and quietly reorders a board,
 * so they are pinned here rather than exercised only through the panels.
 */

describe('collect', () => {
  it('keeps groups in the order their first row arrived', () => {
    // Every feed behind these panels is already sorted by something the
    // reader cares about — heaviest, newest, worst. Re-sorting the groups
    // alphabetically would throw that away.
    const rows = [
      { customer: 'Zenith', bills: 1 },
      { customer: 'Alpha', bills: 2 },
      { customer: 'Zenith', bills: 3 },
    ];

    const groups = collect(rows, (row) => row.customer);

    expect([...groups.keys()]).toEqual(['Zenith', 'Alpha']);
    expect(groups.get('Zenith')).toHaveLength(2);
    expect(groups.get('Alpha')).toHaveLength(1);
  });

  it('partitions — every row lands in exactly one group', () => {
    const rows = [{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: 'c' }];

    const groups = collect(rows, (row) => row.k);

    expect([...groups.values()].reduce((total, group) => total + group.length, 0)).toBe(
      rows.length,
    );
  });

  it('answers an empty map for no rows', () => {
    expect(collect([], () => 'x').size).toBe(0);
  });
});

describe('sharedLabel', () => {
  it('names the one place they all came from', () => {
    expect(sharedLabel(['BH-FG', 'BH-FG'], 'warehouses')).toBe('BH-FG');
  });

  it('names both where there are two', () => {
    expect(sharedLabel(['BH-FG', 'BH-JW'], 'warehouses')).toBe('BH-FG + BH-JW');
  });

  it('counts them where there are more', () => {
    // Naming the first of several would be wrong, and joining them all would
    // not fit the cell.
    expect(sharedLabel(['BH-FG', 'BH-JW', 'BH-BT'], 'warehouses')).toBe('3 warehouses');
  });

  it('shows a rule rather than inventing a place', () => {
    expect(sharedLabel([], 'warehouses')).toBe('—');
    expect(sharedLabel(['', ''], 'warehouses')).toBe('—');
  });
});
