import { AlertTriangle, ExternalLink, HardHat, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { COST_MASTER_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Badge, Button } from '@/shared/components/ui';

import { useResolvedRates } from '../../api';
import { BUCKET_META } from '../../constants';
import type { ResolvedRateGroup } from '../../types';

/**
 * What the board prices with — read from the Cost Master, not set here.
 *
 * The board is one consumer of `cost_master`, the factory-wide rate catalog
 * behind Admin › Cost Master. Letting a rate be edited from two screens is how
 * two cost masters start, so this tab shows the resolved rows and sends anyone
 * who wants to change one to the place that owns them.
 *
 * Rows are listed most-specific-first, which is also the order the board
 * resolves them in: a department rate beats a company rate beats the
 * factory-wide one, and the latest start date breaks the tie.
 */
export function RatesTab() {
  const { data, isLoading } = useResolvedRates();
  const { hasPermission } = usePermission();
  const canOpenCostMaster = hasPermission(COST_MASTER_PERMISSIONS.VIEW);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the Cost Master…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Labour and salary are priced from the factory Cost Master, so the same rate serves this
          board and anything else that costs a day&rsquo;s work. Rates are effective-dated: to
          change one, add a row with a later start date rather than editing the old one, and the
          board keeps pricing past days correctly.
        </p>
        {canOpenCostMaster && (
          <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/cost-master">
              <ExternalLink className="h-4 w-4" />
              Open Cost Master
            </Link>
          </Button>
        )}
      </div>

      <RateGroup
        title="Labour"
        icon={HardHat}
        hex={BUCKET_META.LABOUR.hex}
        group={data.labour}
        emptyHint="Add a rate with basis “Per Person per Day”. The board multiplies it by the head count from Gate › Labour In."
      />
      <RateGroup
        title="Salary"
        icon={Users}
        hex={BUCKET_META.SALARY.hex}
        group={data.salary}
        emptyHint="Add one “Per Month” rate per department. The board spreads each across the month’s days."
      />
    </div>
  );
}

function RateGroup({
  title,
  icon: Icon,
  hex,
  group,
  emptyHint,
}: {
  title: string;
  icon: typeof HardHat;
  hex: string;
  group: ResolvedRateGroup;
  emptyHint: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${hex}24` }}
        >
          <Icon className="h-4 w-4" style={{ color: hex }} />
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {group.cost_type_code}
        </Badge>
      </div>

      {group.rates.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              No rate in force — this tile shows a warning instead of a number.
            </p>
            <p className="mt-1">{emptyHint}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Applies to</th>
                <th className="px-4 py-2.5 text-left font-medium">Scope</th>
                <th className="px-4 py-2.5 text-left font-medium">Basis</th>
                <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                <th className="px-4 py-2.5 text-left font-medium">From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    {rate.department ?? rate.company_code ?? 'Whole factory'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {rate.scope_display}
                    {rate.scope === 'DEPARTMENT' && rate.company_code && (
                      <span className="ml-1 text-xs">({rate.company_code})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{rate.basis_display}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ₹{Number(rate.rate).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {rate.effective_from}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
