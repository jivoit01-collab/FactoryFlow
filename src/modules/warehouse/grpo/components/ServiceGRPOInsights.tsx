import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileClock,
  IndianRupee,
  ListChecks,
} from 'lucide-react';
import { useMemo } from 'react';

import { ACCENTS, KpiStat } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { useServiceGRPOSummary } from '../api';
import type { ServiceGRPOStage } from '../types';

const money = (value: string) => {
  const amount = parseFloat(value || '0');
  if (!amount) return '₹0';
  if (Math.abs(amount) >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

export interface ServiceGRPOInsightsProps {
  year: number;
  month: number;
  /** Current queue narrowing, so a tile can show itself as active. */
  stage?: ServiceGRPOStage | '';
  /** Tiles are filters: clicking one narrows the queue below. */
  onStageChange?: (stage: ServiceGRPOStage | '') => void;
  onStateChange?: (state: string) => void;
  onTransporterChange?: (transporter: string) => void;
}

/**
 * The Service GRPO page header: what is queued, what can actually be posted,
 * and where it is concentrated.
 *
 * Two things this deliberately does NOT say. It never calls a missing freight
 * figure a blocker — the operator types the amount on the post form, and most
 * successful postings never had one on their booking, so flagging it would
 * condemn a perfectly postable queue. And a booked truck without a bilty is
 * reported as *awaiting*, not failed: the bilty is the transporter's
 * consignment note and only exists once the truck has gone.
 */
export function ServiceGRPOInsights({
  year,
  month,
  stage = '',
  onStageChange,
  onStateChange,
  onTransporterChange,
}: ServiceGRPOInsightsProps) {
  const { data, isLoading, isError } = useServiceGRPOSummary({ year, month });

  const ageing = useMemo(() => {
    if (!data) return [];
    const buckets = data.queue.age_buckets;
    return [
      { label: '0-7 days', key: '0-7' as const, count: buckets['0-7'] },
      { label: '8-30 days', key: '8-30' as const, count: buckets['8-30'] },
      { label: '31-90 days', key: '31-90' as const, count: buckets['31-90'] },
      { label: 'Over 90 days', key: '90+' as const, count: buckets['90+'] },
    ].filter((row) => row.count > 0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    );
  }

  // A failed header must not take the queue down with it — the table below is
  // the page's actual job.
  if (isError || !data) return null;

  const { queue, postings } = data;
  const toggle = (next: ServiceGRPOStage) => onStageChange?.(stage === next ? '' : next);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <KpiStat
          icon={ListChecks}
          label="In queue"
          value={queue.total}
          sub="Bookings awaiting a GRPO"
          accent={ACCENTS.slate}
          onClick={() => onStageChange?.('')}
        />
        <KpiStat
          icon={CheckCircle2}
          label="Ready to post"
          value={queue.ready}
          sub="Bilty and document in hand"
          accent={ACCENTS.emerald}
          onClick={() => toggle('READY')}
        />
        <KpiStat
          icon={FileClock}
          label="Awaiting bilty"
          value={queue.awaiting_bilty}
          sub="Truck gone, note not back yet"
          accent={ACCENTS.amber}
          onClick={() => toggle('AWAITING_BILTY')}
        />
        <KpiStat
          icon={Clock}
          label="Oldest in queue"
          value={queue.oldest_days ? `${queue.oldest_days} d` : '—'}
          sub="Since dispatch"
          accent={ACCENTS.orange}
        />
        <KpiStat
          icon={IndianRupee}
          label="Posted this month"
          value={money(postings.posted_value)}
          sub={`${postings.posted} GRPO${postings.posted === 1 ? '' : 's'}`}
          accent={ACCENTS.teal}
        />
        <KpiStat
          icon={AlertTriangle}
          label="Failed"
          value={postings.failed}
          sub={postings.failed ? 'Check History for the reason' : 'None this month'}
          accent={ACCENTS.rose}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="By transporter"
          rows={data.by_transporter.map((r) => ({ label: r.transporter_name, count: r.count }))}
          total={queue.total}
          onSelect={onTransporterChange}
        />
        <BreakdownCard
          title="By state"
          rows={data.by_state.map((r) => ({ label: r.state, count: r.count }))}
          total={queue.total}
          onSelect={onStateChange}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ageing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ageing.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Queue is empty.</p>
            ) : (
              ageing.map((row) => (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${queue.total ? Math.max((row.count / queue.total) * 100, 2) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** A ranked breakdown whose rows filter the queue when clicked. */
function BreakdownCard({
  title,
  rows,
  total,
  onSelect,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  onSelect?: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing queued.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onSelect?.(row.label)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <span className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-sky-500"
                  style={{ width: `${total ? Math.max((row.count / total) * 100, 4) : 0}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-medium tabular-nums">{row.count}</span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
