/**
 * Blowing dashboard types.
 *
 * The report/run payload types are owned by the blowing feature module
 * (`@/modules/production/blowing/types`) — only the dashboard's own view
 * state lives here.
 */

export interface BlowingDashboardFilters {
  /** `YYYY-MM` — drives the monthly totals, trend, make-vs-buy and variances. */
  month: string;
  /** `YYYY-MM-DD` inside `month` — drives the by-machine / by-preform breakdown. */
  day: string;
  /** Optional machine filter — narrows the runs table only. */
  machineId?: number;
}

/** One "where the cost goes" row, derived from the report totals. */
export interface BlowingCostSlice {
  name: string;
  amount: number;
  /** credits (scrap recovery) are subtracted, and drawn in green */
  credit: boolean;
}
