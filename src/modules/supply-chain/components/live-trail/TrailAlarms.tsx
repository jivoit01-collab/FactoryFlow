/** What is wrong, in the order someone should deal with it.
 *
 * Four at most, and each one earns its place by naming a specific number and
 * what it blocks. An alarm strip that fires on everything is an alarm strip
 * nobody reads, so a healthy chain is allowed to be quiet — the second tile
 * goes green rather than disappearing, because "no material blocks production"
 * is itself worth saying.
 */
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleAlert, Clock } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { LiveTrail } from '../../types';
import { inr, n0 } from './trail-format';

interface Alarm {
  key: string;
  tone: 'critical' | 'serious' | 'warn' | 'good';
  icon: LucideIcon;
  title: string;
  body: string;
}

const TONE: Record<Alarm['tone'], { edge: string; ink: string }> = {
  critical: { edge: 'border-l-destructive', ink: 'text-destructive' },
  serious: { edge: 'border-l-orange-500', ink: 'text-orange-600 dark:text-orange-400' },
  warn: { edge: 'border-l-amber-500', ink: 'text-amber-600 dark:text-amber-400' },
  good: { edge: 'border-l-emerald-600', ink: 'text-emerald-600 dark:text-emerald-400' },
};

export function TrailAlarms({ data }: { data: LiveTrail }) {
  const s = data.summary;
  const critical = data.actions.filter((a) => a.urgency === 'CRITICAL');

  const alarms: Alarm[] = [
    {
      key: 'produce',
      tone: s.skus_short > 0 ? 'critical' : 'good',
      icon: s.skus_short > 0 ? AlertTriangle : CheckCircle2,
      title:
        s.skus_short > 0
          ? `${n0(s.skus_short)} SKUs cannot ship from stock`
          : 'Every ordered SKU can ship from stock',
      body:
        s.skus_short > 0
          ? `${n0(s.units_to_produce)} pieces have to be produced before ` +
            `${inr(s.demand_value - s.shippable_value)} of open order value can move.`
          : 'The whole open order book is covered by finished goods and work in progress.',
    },
    {
      key: 'buy',
      tone: critical.length ? 'critical' : 'good',
      icon: critical.length ? AlertTriangle : CheckCircle2,
      title: critical.length
        ? `${n0(critical.length)} materials are already past their order date`
        : 'No material blocks production',
      body: critical.length
        ? critical
            .slice(0, 3)
            .map((a) => `${a.name} — short ${n0(a.short)} ${a.uom}, lead ${n0(a.lead_avg)} d`)
            .join(' · ') + (critical.length > 3 ? ` · +${critical.length - 3} more` : '')
        : 'Every exploded component is covered by stock plus credible open POs.',
    },
    {
      key: 'stale',
      tone: s.components_stale_po > 0 ? 'warn' : 'good',
      icon: s.components_stale_po > 0 ? CircleAlert : CheckCircle2,
      title:
        s.components_stale_po > 0
          ? `${n0(s.components_stale_po)} materials are relying on dead POs`
          : 'No material is relying on a dead PO',
      body:
        `${n0(s.stale_po_units)} units sit on purchase orders whose date slipped more than ` +
        `30 days. Company-wide: ${n0(s.overdue_po_lines)} overdue PO lines on ` +
        `${n0(s.overdue_po_docs)} POs, ${n0(s.overdue_po_over180)} of them over 180 days.`,
    },
    {
      key: 'age',
      tone: 'serious',
      icon: Clock,
      title: `Oldest open order is ${n0(s.oldest_order_days)} days old`,
      body:
        `${n0(s.late_lines)} of ${n0(s.open_lines)} lines are past their SAP delivery date. ` +
        `The delivery date equals the order date on ${n0(s.same_day_due_lines)} lines, so read ` +
        `this as order age, not a confirmed date breach.`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {alarms.map((alarm) => {
        const Icon = alarm.icon;
        const tone = TONE[alarm.tone];
        return (
          <div
            key={alarm.key}
            className={cn('flex gap-2.5 rounded-lg border border-l-4 p-3', tone.edge)}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.ink)} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug">{alarm.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{alarm.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
