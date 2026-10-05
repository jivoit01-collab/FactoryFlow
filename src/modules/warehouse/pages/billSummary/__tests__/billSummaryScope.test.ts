import { describe, expect, it } from 'vitest';

import { decidesSheet } from '../billSummaryScope';

/** A user who manages these godowns, as `useWarehouseScope` answers. */
function managing(...codes: string[]) {
  const set = new Set(codes);
  return {
    manages: (code?: string | null) => !!code && set.has(code.trim().toUpperCase()),
    managesNothing: set.size === 0,
  };
}

describe('decidesSheet', () => {
  it('is the managers of the godown the sheet goes out of', () => {
    expect(decidesSheet(managing('BH-FG'), 'BH-FG')).toBe(true);
    expect(decidesSheet(managing('BH-FG'), 'GP-FG')).toBe(false);
  });

  it('lets a manager of either godown decide a bill spanning two', () => {
    expect(decidesSheet(managing('BH-FG'), 'GP-FG, BH-FG')).toBe(true);
  });

  it('gives a sheet with no godown to any godown manager, but not to nobody', () => {
    expect(decidesSheet(managing('BH-FG'), '')).toBe(true);
    expect(decidesSheet(managing('BH-FG'), null)).toBe(true);
    expect(decidesSheet(managing(), '')).toBe(false);
  });
});
