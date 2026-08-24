import type { BucketType, PurchaseOrderStatus, SpreadPolicy, Urgency } from '../types';

export const BUCKET_TYPE_OPTIONS: { value: BucketType; label: string }[] = [
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
];

export const SPREAD_POLICY_OPTIONS: {
  value: SpreadPolicy;
  label: string;
  hint: string;
}[] = [
  {
    value: 'EVEN_WORKING_DAYS',
    label: 'Spread over working days',
    hint: 'SAP states one monthly figure. This splits it evenly across the working days of the period — useful, but a suggestion, not a target anyone set.',
  },
  {
    value: 'PERIOD_START',
    label: 'Exactly as SAP recorded',
    hint: 'The whole quantity stays on the date SAP put it. Invents nothing.',
  },
];

/**
 * Sort order and colour for the urgency pill.
 *
 * `NO_LEAD_TIME` sits above `SCHEDULED` because a shortage nobody can date is a
 * reference-data gap to chase, not a low-priority item — and amber rather than
 * grey so it reads as "needs attention" instead of "fine".
 */
export const URGENCY_META: Record<
  Urgency,
  { label: string; tone: 'critical' | 'warning' | 'info' | 'muted' | 'ok'; rank: number }
> = {
  OVERDUE: { label: 'Overdue', tone: 'critical', rank: 0 },
  ORDER_NOW: { label: 'Order now', tone: 'warning', rank: 1 },
  NO_LEAD_TIME: { label: 'No lead time', tone: 'warning', rank: 2 },
  SCHEDULED: { label: 'Scheduled', tone: 'info', rank: 3 },
  COVERED: { label: 'Covered', tone: 'ok', rank: 4 },
};

export const URGENCY_CLASS: Record<Urgency, string> = {
  OVERDUE: 'bg-destructive/10 text-destructive border-destructive/30',
  ORDER_NOW: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  NO_LEAD_TIME: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  SCHEDULED: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400',
  COVERED: 'bg-muted text-muted-foreground border-border',
};

export const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PACKAGING: 'Packaging',
  RAW: 'Raw material',
  OTHER: 'Other',
};

export const PO_STATUS_CLASS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  APPROVED: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400',
  POSTED: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border line-through',
};

/** Plans and requirement are read live from SAP, so they are not cheap. */
export const PLAN_STALE_TIME = 5 * 60 * 1000;
/** The requirement explodes every BOM on the plan — slower still. */
export const REQUIREMENT_STALE_TIME = 5 * 60 * 1000;
