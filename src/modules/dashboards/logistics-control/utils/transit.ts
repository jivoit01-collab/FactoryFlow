import type { TransitBands } from '../types';
import { ageInDays } from './funnel';

/** One consignment on the move, however it was recorded. */
export interface TransitConsignment {
  id: string;
  /** When the transit clock started. Null where the feed omits it. */
  dispatchedAt: string | null;
}

/**
 * Split consignments into the board's three transit bands.
 *
 * The bands render as "3 days", "4 - 7 days" and "> 7 days", so unlike the
 * freight funnel these are **exclusive** and exhaustive: up to and including 3,
 * then 4 through 7 inclusive, then strictly over 7. Exclusive is right here
 * because the question is "where is my stock", and every consignment is in
 * exactly one place.
 *
 * Note the backend's own reconciliation finding treats its 7-day edge as
 * inclusive on the other side, which would double-count a consignment sitting
 * exactly on 7. The edges are applied here so the three bands agree with the
 * labels above them.
 *
 * A consignment with no start stamp has no clock and is reported separately —
 * one of the three transit feeds serves its posting time only on the detail
 * endpoint, so this is a real case rather than a defensive one.
 */
export function splitTransit(
  consignments: readonly TransitConsignment[],
  asOf: Date,
  freshDays: number,
  ageingDays: number,
): TransitBands {
  const bands: TransitBands = { fresh: 0, ageing: 0, stale: 0, undated: 0 };

  for (const consignment of consignments) {
    const age = ageInDays(consignment.dispatchedAt, asOf);

    if (age === null) {
      bands.undated += 1;
      continue;
    }

    if (age <= freshDays) bands.fresh += 1;
    else if (age <= ageingDays) bands.ageing += 1;
    else bands.stale += 1;
  }

  return bands;
}
