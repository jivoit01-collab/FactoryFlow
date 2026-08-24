/**
 * One plan: what is meant to be made, phased by day, week or month, against what
 * SAP says was actually made.
 *
 * SAP stores the plan as a single monthly figure per SKU. Day and week views are
 * this module's arithmetic, and every derived figure is marked as such — a
 * spread daily target is a suggestion, and treating it as a commitment is how
 * somebody ends up defending a number no human ever set.
 */
import { ArrowLeft, RefreshCw, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PLANNING_PURCHASE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { usePlanDetail } from '../api';
import {
  monthLabel,
  percent,
  PlanBucketStrip,
  PlanLinesTable,
  qty,
} from '../components';
import { BUCKET_TYPE_OPTIONS, SPREAD_POLICY_OPTIONS } from '../constants';
import type { BucketType, SpreadPolicy } from '../types';

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const absId = Number(planId);

  const { hasPermission } = usePermission();
  const canBuy = hasPermission(PLANNING_PURCHASE_PERMISSIONS.CREATE_PO);

  const [bucketType, setBucketType] = useState<BucketType>('WEEK');
  const [spreadPolicy, setSpreadPolicy] = useState<SpreadPolicy>('EVEN_WORKING_DAYS');

  const query = usePlanDetail(absId || undefined, bucketType, spreadPolicy);

  if (query.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <DashboardHeader title="Production Plan" description="Reading the plan from SAP…" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader title="Production Plan" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(query.error, 'Could not read this plan from SAP.')}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/planning-purchase">Back to plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { plan, lines, buckets, meta } = query.data;
  const attainment = Number(plan.attainment_pct ?? 0);
  const bucketLabel =
    BUCKET_TYPE_OPTIONS.find((option) => option.value === bucketType)?.label ?? 'Month';
  const policyHint = SPREAD_POLICY_OPTIONS.find(
    (option) => option.value === spreadPolicy,
  )?.hint;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title={plan.code || `Plan ${plan.abs_id}`}
        description={plan.name}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/planning-purchase">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All plans
            </Link>
          </Button>
          {canBuy ? (
            <Button asChild size="sm">
              <Link to={`/planning-purchase/plans/${plan.abs_id}/purchase`}>
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Purchase from BOM
              </Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', query.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      {/* Four numbers: the period, the target, what was made, how that reads. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Period" value={monthLabel(plan.start_date, plan.end_date)} />
        <SummaryTile label="Planned" value={qty(plan.planned_qty)} hint={`${plan.line_count} SKUs`} />
        <SummaryTile label="Produced" value={qty(plan.produced_qty)} hint="SAP goods receipts" />
        <SummaryTile
          label="Attainment"
          value={percent(plan.attainment_pct)}
          tone={attainment >= 95 ? 'ok' : attainment >= 70 ? 'warning' : 'critical'}
        />
      </div>

      {plan.items_without_bom?.length ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          {plan.items_without_bom.length} planned SKU
          {plan.items_without_bom.length === 1 ? '' : 's'} have no production BOM in SAP
          ({plan.items_without_bom.map((item) => item.item_code).join(', ')}). Their
          materials cannot be exploded, so nothing is being bought for them.
        </p>
      ) : null}

      {/* Grain and spread policy. The policy is on the screen rather than in
          config because it changes every daily number, and the reader has to
          know which one they are looking at. */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">View by</p>
          <div className="flex gap-1">
            {BUCKET_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBucketType(option.value)}
                className={cn(
                  'rounded border px-3 py-1.5 text-xs transition-colors',
                  bucketType === option.value
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[240px] flex-1">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            How the month is split
          </p>
          <div className="flex flex-wrap gap-1">
            {SPREAD_POLICY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSpreadPolicy(option.value)}
                className={cn(
                  'rounded border px-3 py-1.5 text-xs transition-colors',
                  spreadPolicy === option.value
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {policyHint ? (
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            {policyHint}
          </p>
        ) : null}
      </div>

      <PlanBucketStrip buckets={buckets} plan={plan} bucketLabel={bucketLabel} />

      <PlanLinesTable lines={lines} />

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{meta.derivation_note}</p>
        <p>{meta.unit_note}</p>
        <p>
          A <span className="font-mono">~</span> marks a figure this module derived
          rather than one SAP stated.
        </p>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'warning' | 'critical';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'critical' && 'border-destructive/30 bg-destructive/5',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/5',
        tone === 'ok' && 'border-emerald-500/30 bg-emerald-500/5',
        tone === 'neutral' && 'bg-card',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'critical' && 'text-destructive',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
