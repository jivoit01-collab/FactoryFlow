/**
 * How many labourers came in for Production today.
 *
 * Read from the **gate's** own tally (`labour_gate.LabourGateEntry`), not the
 * `labour_count` man-day register. The two are different tables and the
 * register is nearly unused — judging labour volume from it misleads. The gate
 * has ~1,100 people per fortnight on Jivo Oil; the register has almost nothing.
 *
 * Two things this has to be honest about:
 *
 *  - **The day endpoint returns soft-deleted rows.** It does not filter
 *    `is_active`, and a deleted entry keeps its `count_in` so the audit trail
 *    survives. Counting those would inflate the headcount, so `is_deleted` rows
 *    are dropped here.
 *  - **Most labour is never allocated to a department.** Around 60% of gate
 *    entries carry no department at all — 84 of today's 142 people on Jivo Oil.
 *    A Production figure that quietly ignored them would read as "only 53 people
 *    in Production" when the truthful answer is "53 allocated, 84 not yet
 *    allocated to anywhere". So the unallocated pool is counted and returned
 *    alongside, for the panel to show.
 */
import type { LabourGateEntry } from '@/modules/gate/api/labourGate/labourGate.api';

/**
 * The department this counts, matched exactly.
 *
 * The master holds three lookalikes — `production`, `production(oil)` and
 * `production(beverages)` — so the match is an exact name test on the trimmed,
 * lowercased value. A substring test for "production" would fold Beverages into
 * an Oil figure, and the bare `production` department is deliberately excluded
 * too: it currently carries no gate entries at all, and if it ever starts to,
 * nothing says whose line those people were on. Widen this list only when
 * somebody confirms what the extra name means.
 */
export const PRODUCTION_OIL_DEPARTMENTS: readonly string[] = ['production(oil)'];

export interface LabourShiftSplit {
  day: number;
  night: number;
}

export interface LabourSummary {
  /** Labourers booked in to Production today. */
  productionIn: number;
  /** Still inside — booked in, not yet booked out. */
  productionInside: number;
  /** Production, split by shift. */
  shifts: LabourShiftSplit;
  /** Contractors who supplied them. */
  contractors: number;
  /** Everyone booked in today, every department. */
  totalIn: number;
  /**
   * Booked in today with no department set. Not part of `productionIn`, but
   * some of it probably belongs there — which is why the panel names it.
   */
  unallocatedIn: number;
  /** Rows the gate has recorded for Production today. */
  entries: LabourGateEntry[];
}

function isProduction(entry: LabourGateEntry): boolean {
  const name = entry.department_name?.trim().toLowerCase();
  if (!name) return false;
  return PRODUCTION_OIL_DEPARTMENTS.includes(name);
}

/** Today's gate entries, reduced to what the board shows. */
export function summariseLabour(entries: LabourGateEntry[] | undefined): LabourSummary {
  // A soft-deleted entry keeps its count for the audit trail; it is not people.
  const live = (entries ?? []).filter((entry) => !entry.is_deleted);
  const production = live.filter(isProduction);

  const sum = (rows: LabourGateEntry[], pick: (row: LabourGateEntry) => number) =>
    rows.reduce((total, row) => total + (pick(row) || 0), 0);

  return {
    productionIn: sum(production, (row) => row.count_in),
    productionInside: sum(production, (row) => row.remaining),
    shifts: {
      day: sum(
        production.filter((row) => row.shift === 'DAY'),
        (row) => row.count_in,
      ),
      night: sum(
        production.filter((row) => row.shift === 'NIGHT'),
        (row) => row.count_in,
      ),
    },
    contractors: new Set(production.map((row) => row.contractor)).size,
    totalIn: sum(live, (row) => row.count_in),
    unallocatedIn: sum(
      live.filter((row) => !row.department_name?.trim()),
      (row) => row.count_in,
    ),
    entries: production,
  };
}
