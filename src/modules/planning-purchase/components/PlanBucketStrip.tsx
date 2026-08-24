import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PlanBucket, PlanHeader, PlanUnit } from '../types';
import { pickUnit, qty, qtyWithUnit, shortDate, toNumber } from './format';
import { DerivedMark } from './UrgencyPill';

/**
 * The plan across time, at whichever grain is selected.
 *
 * Bars are scaled against the largest bucket rather than the total, so a month
 * with one heavy week still reads as shaped rather than flat.
 */
export function PlanBucketStrip({
  buckets,
  plan,
  bucketLabel,
  unit,
}: {
  buckets: PlanBucket[];
  plan: PlanHeader;
  bucketLabel: string;
  unit: PlanUnit;
}) {
  if (!buckets.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          This plan has no lines in SAP yet.
        </CardContent>
      </Card>
    );
  }

  const valueOf = (bucket: PlanBucket) =>
    toNumber(
      pickUnit(
        { pieces: bucket.planned_qty, litres: bucket.planned_litres, cases: bucket.planned_cases },
        unit,
      ),
    );

  const peak = Math.max(...buckets.map(valueOf), 1);
  const total = buckets.reduce((sum, bucket) => sum + valueOf(bucket), 0);
  const planned = toNumber(
    pickUnit(
      { pieces: plan.planned_qty, litres: plan.planned_litres, cases: plan.planned_cases },
      unit,
    ),
  );

  // The three grains must always agree, in every unit. If they ever do not, the
  // arithmetic is wrong and saying so beats quietly showing a different total
  // per tab. The backend allocates the line total across buckets rather than
  // converting each one, so this holds exactly rather than approximately.
  const reconciles = Math.abs(total - planned) < 1;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">{bucketLabel} breakdown</h3>
          <span className="text-xs text-muted-foreground">
            {buckets.length} {bucketLabel.toLowerCase()}
            {buckets.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-1.5">
          {buckets.map((bucket) => {
            const value = valueOf(bucket);
            return (
              <div key={bucket.bucket_start} className="flex items-center gap-3 text-xs">
                <span className="w-40 shrink-0 truncate text-muted-foreground">
                  {bucket.label ?? shortDate(bucket.bucket_start)}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn(
                      'h-full rounded transition-all',
                      bucket.derived ? 'bg-primary/50' : 'bg-primary',
                    )}
                    style={{ width: `${Math.max((value / peak) * 100, 1)}%` }}
                  />
                </div>
                <span className="w-40 shrink-0 text-right font-mono tabular-nums">
                  {qtyWithUnit(value, unit)}
                  {bucket.derived ? <DerivedMark /> : null}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-xs">
          <span className="font-medium">Total</span>
          <span
            className={cn(
              'font-mono tabular-nums',
              reconciles ? 'font-semibold' : 'font-semibold text-destructive',
            )}
          >
            {qtyWithUnit(total, unit)}
            {!reconciles ? ` (plan says ${qty(planned)})` : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
