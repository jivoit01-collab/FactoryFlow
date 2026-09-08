import type { ConsumptionBasis, PmDemandFilters, PmDemandSource } from '../types';

// ============================================================================
// Query Config
// ============================================================================

/**
 * Five HANA reads over a month of movements is not a cheap request, and the
 * answer is a closed period that does not change minute to minute.
 */
export const PM_DEMAND_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Filter Options
// ============================================================================

export const PM_DEMAND_TOP_OPTIONS = [
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
] as const;

/** Widest range the API accepts, mirrored here so the picker can say so. */
export const PM_DEMAND_MAX_RANGE_DAYS = 400;

// ============================================================================
// Which column a top list is ranked on
// ============================================================================

export type PmDemandBoard = 'production' | 'dispatch';

/**
 * Panel headings, which depend on what the numbers actually are.
 *
 * SAP's column is the goods issue -- what the line used. The app's is the BOM
 * the warehouse approved before the run. Calling both "Consumed" would be the
 * single most misleading thing this board could do, so the heading changes
 * with the basis.
 */
export const PM_DEMAND_BOARDS: Record<
  PmDemandBoard,
  Record<ConsumptionBasis, { label: string; description: string }>
> = {
  production: {
    issued: {
      label: 'Consumed in production',
      description: 'What the line actually issued, against what the recipes called for',
    },
    approved: {
      label: 'Approved to production',
      description:
        'What the warehouse approved against the recipes — not what the line issued',
    },
  },
  dispatch: {
    issued: {
      label: 'Shipped inside finished goods',
      description: 'The packaging that left the gate inside the finished goods invoiced',
    },
    approved: {
      label: 'Shipped inside finished goods',
      description: 'The packaging that left the gate, from FactoryFlow’s gate-out records',
    },
  },
};

export const PM_DEMAND_SOURCES: { value: PmDemandSource; label: string; hint: string }[] = [
  { value: 'sap', label: 'SAP', hint: 'Goods issues and invoices' },
  { value: 'app', label: 'App', hint: 'Runs, approved BOMs and gate-outs' },
];

// ============================================================================
// Defaults
// ============================================================================

/**
 * The month just gone, which is the period somebody opening this board almost
 * always wants. Computed from a passed-in date rather than read off the clock
 * so the default is testable.
 */
export function defaultPmDemandRange(today: Date): { date_from: string; date_to: string } {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return { date_from: toIsoDate(start), date_to: toIsoDate(end) };
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultPmDemandFilters(today: Date): PmDemandFilters {
  return {
    ...defaultPmDemandRange(today),
    top: 10,
    include_intercompany: true,
    source: 'sap',
  };
}
