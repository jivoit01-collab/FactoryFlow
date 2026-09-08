import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import type { PmDemandFamily } from '../types';
import { formatInr, formatInrCompact, formatPct } from '../utils';

interface PmDemandFamilyRollupProps {
  families: PmDemandFamily[];
  isLoading?: boolean;
  /** Narrow to these families when the page filter is set. */
  selected?: string[];
}

/**
 * Where the packaging spend goes, one bar per family.
 *
 * The item lists are dominated by whatever the volume SKU is -- on Oil that
 * is 1-litre labels and caps, every month. This panel is the other question:
 * of everything the factory spends on packaging, how much is film, how much
 * is cartons, how much is tin. `OITM.U_Sub_Group` already carries the family
 * for the whole packaging range, so nothing here is inferred from item names.
 */
export function PmDemandFamilyRollup({
  families,
  isLoading,
  selected,
}: PmDemandFamilyRollupProps) {
  const wanted = selected?.length ? new Set(selected) : null;
  const visible = wanted
    ? families.filter((family) => wanted.has(family.sub_group))
    : families;

  // Bars are scaled to the largest family on screen, not to the total, so a
  // long tail of small families is still readable.
  const largest = visible.reduce((max, family) => Math.max(max, family.consumed_value), 0);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">By packaging family</CardTitle>
        <CardDescription>
          The same consumption grouped by what kind of packaging it is
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
                <div className="h-2.5 animate-pulse rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No packaging families in this period.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((family) => (
              <li key={family.sub_group} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{family.sub_group}</span>
                  <span className="tabular-nums">
                    {formatInrCompact(family.consumed_value)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {family.consumed_share_pct.toFixed(1)}%
                    </span>
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${largest ? (family.consumed_value / largest) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{family.item_count} items</span>
                  <span>shipped {formatInr(family.dispatched_value)}</span>
                  {family.bom_value > 0 && (
                    <span
                      className={
                        family.variance_value > 0
                          ? 'text-amber-600 dark:text-amber-500'
                          : undefined
                      }
                    >
                      {formatPct((family.variance_value / family.bom_value) * 100)} vs recipe
                    </span>
                  )}
                  {family.wastage_value > 0 && (
                    <span>scrapped {formatInr(family.wastage_value)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
