import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { OrderState, Verdict } from '../types';

/** Colour only what needs action — a healthy queue should look quiet. */
const STATE_STYLE: Record<string, string> = {
  READY_FOR_FULFILLMENT: 'bg-emerald-600 text-white',
  PRODUCTION_REQUIRED: 'bg-destructive text-destructive-foreground',
  PARTIALLY_AVAILABLE: 'bg-orange-500 text-white',
  STOCK_CHECKED: 'bg-amber-500 text-white',
  CANCELLED: 'bg-muted text-muted-foreground',
  RECEIVED: 'bg-muted text-muted-foreground',
};

const STATE_LABEL: Record<string, string> = {
  READY_FOR_FULFILLMENT: 'Ready',
  PRODUCTION_REQUIRED: 'Production needed',
  PARTIALLY_AVAILABLE: 'Partial',
  STOCK_CHECKED: 'Unresolved',
  RECEIVED: 'Not checked',
  CANCELLED: 'Cancelled',
};

export function StateBadge({ state }: { state: OrderState | string }) {
  return (
    <Badge className={STATE_STYLE[state] ?? 'bg-muted text-muted-foreground'}>
      {STATE_LABEL[state] ?? state}
    </Badge>
  );
}

const VERDICT_STYLE: Record<Verdict, string> = {
  AVAILABLE: 'bg-emerald-600 text-white',
  PARTIAL: 'bg-orange-500 text-white',
  SHORT: 'bg-destructive text-destructive-foreground',
  UNKNOWN: 'bg-amber-500 text-white',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={VERDICT_STYLE[verdict]}>{verdict}</Badge>;
}

/** A tile that stays grey unless it needs someone. */
export function StatTile({
  label, value, hint, alert = false,
}: { label: string; value: number | string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-4', alert && 'border-destructive/40 bg-destructive/5')}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Data-quality gaps, stated rather than hidden.
 *
 * A third of live lines carry one of these. An order silently sitting at UNKNOWN
 * with no explanation is worse than a visible gap, because nobody knows to chase
 * it. */
export function IssueList({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  const label: Record<string, string> = {
    NO_WAREHOUSE: 'No warehouse rule for this category',
    QTY_DISAGREES: 'Quantity disagrees with cases x pack size',
    NO_ITEM_CODE: 'No item code',
    ZERO_QTY: 'No quantity',
  };
  return (
    <span className="flex flex-wrap gap-1">
      {issues.map((i) => (
        <Badge key={i} className="bg-amber-500 text-white">{label[i] ?? i}</Badge>
      ))}
    </span>
  );
}
