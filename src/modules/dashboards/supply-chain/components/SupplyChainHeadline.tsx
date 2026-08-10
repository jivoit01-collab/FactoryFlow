import { AlertTriangle, CalendarClock, Factory, HelpCircle, ShieldAlert } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { SupplyChainDashboard } from '../types';

/** The four numbers a HOD should be able to read in one glance.
 *
 * Deliberately not a generic KPI row: each tile answers a question the brief
 * names as a problem today, and each is coloured only when it needs action, so a
 * healthy chain is visually quiet.
 */
export function SupplyChainHeadline({ data }: { data: SupplyChainDashboard }) {
  const h = data.headline;

  const tiles = [
    {
      key: 'order',
      label: 'Needs ordering today',
      value: h.needs_ordering_today,
      hint: 'Overdue or inside the lead time',
      icon: CalendarClock,
      alert: h.needs_ordering_today > 0,
    },
    {
      key: 'lead',
      label: 'No lead time on file',
      value: h.missing_lead_times,
      hint: 'Cannot be timed until Procurement returns the sheet',
      icon: HelpCircle,
      alert: h.missing_lead_times > 0,
    },
    {
      key: 'capacity',
      label: 'Lines over capacity',
      value: h.lines_over_capacity,
      hint: h.plan_is_feasible ? 'Plan is runnable' : 'Plan is not proven runnable',
      icon: Factory,
      alert: !h.plan_is_feasible,
    },
    {
      key: 'floors',
      label: 'Buffers below policy',
      value: h.floors_below_policy,
      hint: `Floor is ${data.policy.floor_percent}% (${
        data.policy.floor_basis === 'MONTHLY_AVERAGE' ? 'monthly average' : '3-month total'
      })`,
      icon: ShieldAlert,
      alert: h.floors_below_policy > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.key}
            className={cn(
              'border-l-4',
              tile.alert
                ? 'border-l-destructive bg-destructive/5'
                : 'border-l-emerald-500/70',
            )}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <Icon
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  tile.alert ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
              <div className="min-w-0">
                <p className="text-2xl font-semibold leading-none">{tile.value}</p>
                <p className="mt-1 text-sm font-medium">{tile.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{tile.hint}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Shown when the plan cannot be proven runnable — the one thing a capacity
 *  number alone does not make obvious. */
export function FeasibilityBanner({ data }: { data: SupplyChainDashboard }) {
  if (data.production.totals.feasible) return null;
  const unmapped = data.production.unmapped_skus;

  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium">This plan is not proven runnable.</p>
        {data.production.totals.over_capacity > 0 && (
          <p className="text-muted-foreground">
            {data.production.totals.over_capacity} line(s) are over capacity.
          </p>
        )}
        {unmapped.length > 0 && (
          <p className="text-muted-foreground">
            {unmapped.length} SKU(s) have no machine or output rate on file:{' '}
            {unmapped.slice(0, 4).map((s) => s.sku_code).join(', ')}
            {unmapped.length > 4 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
