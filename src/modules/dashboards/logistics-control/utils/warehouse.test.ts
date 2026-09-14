import { describe, expect, it } from 'vitest';

import { billWarehouse } from './warehouse';

describe('billWarehouse', () => {
  it('collapses the per-line repetition SAP sends', () => {
    // A nine-line bill out of one store arrives as that code nine times.
    // Left alone, the warehouse breakdown would have an entry per line count.
    expect(billWarehouse('BH-FG, BH-FG, BH-FG')).toBe('BH-FG');
  });

  it('names a bill that spans two warehouses as the pair', () => {
    // Not counted under each: its tonnes would then be added twice and the
    // breakdown would stop matching the figure above it.
    expect(billWarehouse('BH-BT, BH-FG')).toBe('BH-BT + BH-FG');
  });

  it('gives one pair one name whichever order the lines came in', () => {
    expect(billWarehouse('BH-FG, BH-BT')).toBe(billWarehouse('BH-BT, BH-FG'));
  });

  it('names a bill with no warehouse rather than dropping it', () => {
    // It is still freight waiting to go. An entry that disappears is tonnage
    // the strip stops accounting for.
    expect(billWarehouse('')).toBe('No warehouse');
    expect(billWarehouse(null)).toBe('No warehouse');
    expect(billWarehouse(undefined)).toBe('No warehouse');
    // SAP sends empty strings for lines with no code, and `STRING_AGG` keeps
    // the separators, so this is what a bill of three such lines looks like.
    expect(billWarehouse(', , ')).toBe('No warehouse');
  });

  it('ignores the whitespace the aggregate leaves behind', () => {
    expect(billWarehouse('  BH-FG ,BH-BT  ')).toBe('BH-BT + BH-FG');
  });
});
