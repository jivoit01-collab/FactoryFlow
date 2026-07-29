import { Boxes, Coins, Gauge, Recycle, Target, Trees } from 'lucide-react';

import {
  useCostAnalysisReport,
  useOEETrendReport,
  usePlanVsProductionReport,
  useWasteTrendReport,
} from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

import {
  count,
  money,
  type ProductionVariant,
} from '../constants/production-dashboard.constants';

const pct = (v: number | undefined) => `${(v ?? 0).toFixed(1)}%`;

/**
 * The six headline production KPIs for the selected company & date range:
 * cost per unit, OEE, output, plan achievement, waste % and run count. Each is
 * sourced from an existing production report endpoint.
 */
export function ProductionKpiStrip({
  params,
  variant,
}: {
  params: AnalyticsParams;
  variant: ProductionVariant;
}) {
  const cost = useCostAnalysisReport(params);
  const oee = useOEETrendReport({ ...params, group_by: 'daily' });
  const waste = useWasteTrendReport(params);
  const plan = usePlanVsProductionReport(params);

  const loading = cost.isLoading || oee.isLoading || waste.isLoading || plan.isLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const costPerUnit = (cost.data?.summary.avg_per_unit ?? 0) / (variant.unitsPerCase || 1);
  const avgOee = oee.data?.summary.avg_oee ?? 0;
  const production = cost.data?.summary.total_production ?? 0;
  const achievement = plan.data?.summary.avg_achievement_pct ?? 0;
  const wastePct = waste.data?.summary.waste_vs_production_pct ?? 0;
  const runs = oee.data?.summary.total_runs ?? cost.data?.summary.run_count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <KpiStat
        icon={Coins}
        label={`Cost / ${variant.unitNoun}`}
        value={money(costPerUnit)}
        sub={`Total ${money(cost.data?.summary.total_cost ?? 0)}`}
        accent={ACCENTS.amber}
        delayMs={0}
      />
      <KpiStat
        icon={Gauge}
        label="OEE"
        value={pct(avgOee)}
        sub={`Target ${variant.benchmarks.oee}%`}
        accent={avgOee >= variant.benchmarks.oee ? ACCENTS.emerald : ACCENTS.orange}
        delayMs={60}
      />
      <KpiStat
        icon={Boxes}
        label={`Output (${variant.unitNoun}s)`}
        value={count(production)}
        sub={`${count(runs)} runs`}
        accent={ACCENTS.sky}
        delayMs={120}
      />
      <KpiStat
        icon={Target}
        label="Plan achievement"
        value={pct(achievement)}
        sub={`Target ${variant.benchmarks.achievement}%`}
        accent={achievement >= variant.benchmarks.achievement ? ACCENTS.emerald : ACCENTS.blue}
        delayMs={180}
      />
      <KpiStat
        icon={Recycle}
        label="Waste vs output"
        value={pct(wastePct)}
        sub={`Target ≤ ${variant.benchmarks.wastePct}%`}
        accent={wastePct <= variant.benchmarks.wastePct ? ACCENTS.emerald : ACCENTS.rose}
        delayMs={240}
      />
      <KpiStat
        icon={Trees}
        label="Runs"
        value={count(runs)}
        sub="In selected range"
        accent={ACCENTS.violet}
        delayMs={300}
      />
    </div>
  );
}
