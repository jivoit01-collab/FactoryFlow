import type { FunnelBill, FunnelCell, FunnelColumn, FunnelStage } from '../types';

/**
 * Count bills into cumulative age bands.
 *
 * Each band is a floor, so a bill lands in every band it clears: with bands
 * 15/30/45, a bill 50 days old is counted three times, once per band. That is
 * the intent — the wall answers "how much is older than a fortnight", and the
 * 45 cell is a subset of the 30 cell.
 *
 * The alternative, exclusive buckets, has a property that is actively wrong on a
 * wall: a bill ageing from 29 to 31 days *leaves* one bucket and enters the
 * next, so the first number falls. A figure dropping while the situation got
 * worse is the one thing a control board must not do.
 *
 * Bills with no age are excluded from every band and reported separately —
 * folding them into the youngest band would understate the backlog.
 */
export function bandCounts(
  bills: readonly FunnelBill[],
  bands: readonly number[],
): { cells: FunnelCell[]; undated: number; amount: number; unpriced: number } {
  let undated = 0;
  let amount = 0;
  let unpriced = 0;
  const dated: { age: number; amount: number | null }[] = [];

  for (const bill of bills) {
    const value =
      bill.amount === null || bill.amount === undefined || !Number.isFinite(bill.amount)
        ? null
        : bill.amount;

    // Counted against the column whatever its age — an undatable document is
    // still money owed, and only the age BANDS can honestly exclude it.
    if (value === null) unpriced += 1;
    else amount += value;

    if (bill.ageDays === null || !Number.isFinite(bill.ageDays)) {
      undated += 1;
      continue;
    }
    dated.push({ age: bill.ageDays, amount: value });
  }

  const cells = bands.map((band) => {
    const inBand = dated.filter((row) => row.age >= band);
    return {
      band,
      count: inBand.length,
      amount: inBand.reduce((total, row) => total + (row.amount ?? 0), 0),
      // Stated per cell, not just per column: a band whose money is mostly
      // unpriced must not read as a band that is nearly settled.
      unpriced: inBand.filter((row) => row.amount === null).length,
    };
  });

  return { cells, undated, amount, unpriced };
}

/**
 * One funnel column, or an honest blank where the stage has no feed.
 *
 * `unavailable` wins over the numbers on purpose. The payment stage has no data
 * source in either repo — there is no paid state on the AP posting model and
 * nothing reads SAP's payment tables — so until its configuration exists the
 * column must say so. Rendering 0 there would read as "nothing outstanding",
 * which is the opposite of the truth.
 */
export function buildFunnelColumn(
  stage: FunnelStage,
  bills: readonly FunnelBill[] | null,
  bands: readonly number[],
  unavailable?: string,
): FunnelColumn {
  if (unavailable || bills === null) {
    return {
      stage,
      total: 0,
      amount: 0,
      unpriced: 0,
      undated: 0,
      cells: bands.map((band) => ({ band, count: 0, amount: 0, unpriced: 0 })),
      unavailable: unavailable ?? 'No feed',
    };
  }

  const { cells, undated, amount, unpriced } = bandCounts(bills, bands);
  return { stage, total: bills.length, amount, unpriced, undated, cells };
}

/**
 * Whole days between two instants, floored, or null if either is missing.
 *
 * Compared on local calendar dates rather than elapsed milliseconds, so a bilty
 * posted late yesterday evening reads as one day old this morning rather than
 * zero. The board is read by people counting days on a calendar, not hours.
 */
export function ageInDays(from: string | null | undefined, asOf: Date): number | null {
  if (!from) return null;

  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return null;

  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const asOfDay = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());

  return Math.floor((asOfDay - startDay) / 86_400_000);
}

/** One exclusive age bucket, as a pre-aggregated feed reports it. */
export interface AgeBucket {
  /** Floor of the bucket, in days. */
  band: number;
  documents: number;
  amount: number;
  /**
   * Documents in the bucket carrying no value yet.
   *
   * Optional because it only applies to feeds whose documents can exist before
   * anybody prices them. The SAP columns are built from invoices, where the
   * amount IS the document; the GRPO queue is not — its freight is typed in on
   * the post form afterwards, so a band of fresh bilties routinely has no money
   * against it at all.
   */
  unpriced?: number;
}

/**
 * A funnel column built from buckets somebody else already counted.
 *
 * Every stage is assembled this way: each source answers with aggregates rather
 * than a list of documents — a few GROUP BYs instead of hundreds of rows
 * crossing the wire.
 *
 * The bands are EXCLUSIVE, and the feeds already answer that way, so a cell is
 * simply its own bucket. Each document lands in exactly one row and the rows
 * sum to the total, which is what somebody reading three numbers down a column
 * expects — cumulative floors made the same ageing set appear three times and
 * read as duplicated data.
 *
 * The cost of exclusive bands, accepted deliberately: a document ageing from 29
 * to 31 days LEAVES the first row and enters the second, so that first number
 * falls while the situation got worse. The row labels say their range for
 * exactly this reason — a falling "15–29" is only honest if the reader can see
 * it is a window and not a floor.
 *
 * A bucket outside every band is still in the column total — the headline
 * counts everything the feed reported, whatever the table happens to draw.
 */
export function buildFunnelColumnFromBuckets(
  stage: FunnelStage,
  buckets: readonly AgeBucket[] | null,
  bands: readonly number[],
  unavailable?: string,
): FunnelColumn {
  if (unavailable || buckets === null) {
    return {
      stage,
      total: 0,
      amount: 0,
      unpriced: 0,
      undated: 0,
      cells: bands.map((band) => ({ band, count: 0, amount: 0, unpriced: 0 })),
      unavailable: unavailable ?? 'No feed',
    };
  }

  const cells: FunnelCell[] = bands.map((band, index) => {
    // The window this row owns: from its own floor up to (not including) the
    // next band's, and open-ended for the last.
    const ceiling = bands[index + 1];
    const inBand = buckets.filter(
      (bucket) => bucket.band >= band && (ceiling === undefined || bucket.band < ceiling),
    );
    return {
      band,
      count: inBand.reduce((total, bucket) => total + bucket.documents, 0),
      amount: inBand.reduce((total, bucket) => total + bucket.amount, 0),
      // Carried through rather than assumed away. A feed built from invoices
      // reports none, because the amount IS the document; the GRPO queue
      // reports plenty, and a cell of 170 bilties nobody has priced must not
      // render as ₹0 owed.
      unpriced: inBand.reduce((total, bucket) => total + (bucket.unpriced ?? 0), 0),
    };
  });

  return {
    stage,
    total: buckets.reduce((total, bucket) => total + bucket.documents, 0),
    amount: buckets.reduce((total, bucket) => total + bucket.amount, 0),
    unpriced: buckets.reduce((total, bucket) => total + (bucket.unpriced ?? 0), 0),
    undated: 0,
    cells,
  };
}
