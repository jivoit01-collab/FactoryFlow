import { describe, expect, it } from 'vitest';

import { splitTransit, type TransitConsignment } from './transit';

const AS_OF = new Date(2026, 8, 10, 9, 0, 0); // 10 Sep 2026
const FRESH = 3;
const AGEING = 7;

/** A consignment that started `days` ago. */
function startedDaysAgo(days: number, id = `C${days}`): TransitConsignment {
  const started = new Date(AS_OF);
  started.setDate(started.getDate() - days);
  const month = String(started.getMonth() + 1).padStart(2, '0');
  const day = String(started.getDate()).padStart(2, '0');
  return { id, dispatchedAt: `${started.getFullYear()}-${month}-${day}` };
}

describe('splitTransit', () => {
  it('puts a consignment on the fresh edge in the fresh band', () => {
    // The label reads "3 days", so 3 is fresh, not ageing.
    const bands = splitTransit([startedDaysAgo(3)], AS_OF, FRESH, AGEING);

    expect(bands).toEqual({ fresh: 1, ageing: 0, stale: 0, undated: 0 });
  });

  it('starts the ageing band the day after the fresh edge', () => {
    const bands = splitTransit([startedDaysAgo(4)], AS_OF, FRESH, AGEING);

    expect(bands.ageing).toBe(1);
    expect(bands.fresh).toBe(0);
  });

  it('keeps a consignment sitting exactly on 7 out of the stale band', () => {
    // "4 - 7 days" includes 7; "> 7" is strict. The backend's own
    // reconciliation finding treats this edge the other way, which would count
    // the same consignment in both bands.
    const bands = splitTransit([startedDaysAgo(7)], AS_OF, FRESH, AGEING);

    expect(bands.ageing).toBe(1);
    expect(bands.stale).toBe(0);
  });

  it('makes 8 days stale', () => {
    const bands = splitTransit([startedDaysAgo(8)], AS_OF, FRESH, AGEING);

    expect(bands.stale).toBe(1);
  });

  it('counts today as fresh', () => {
    const bands = splitTransit([startedDaysAgo(0)], AS_OF, FRESH, AGEING);

    expect(bands.fresh).toBe(1);
  });

  it('assigns every consignment to exactly one band', () => {
    const consignments = [0, 1, 3, 4, 6, 7, 8, 40].map((days) => startedDaysAgo(days));
    const bands = splitTransit(consignments, AS_OF, FRESH, AGEING);

    expect(bands.fresh + bands.ageing + bands.stale + bands.undated).toBe(
      consignments.length,
    );
    expect(bands).toEqual({ fresh: 3, ageing: 3, stale: 2, undated: 0 });
  });

  it('reports a consignment with no start stamp separately', () => {
    // One of the three transit feeds serves its posting time on the detail
    // endpoint only, so the list view genuinely arrives without a clock.
    const bands = splitTransit(
      [startedDaysAgo(5), { id: 'X', dispatchedAt: null }],
      AS_OF,
      FRESH,
      AGEING,
    );

    expect(bands.undated).toBe(1);
    expect(bands.ageing).toBe(1);
  });

  it('is all zeroes when nothing is moving', () => {
    expect(splitTransit([], AS_OF, FRESH, AGEING)).toEqual({
      fresh: 0,
      ageing: 0,
      stale: 0,
      undated: 0,
    });
  });
});
