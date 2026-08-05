import { AlertTriangle, Factory, Package, Receipt, Scale, Zap } from 'lucide-react';

import type { DailyReportTotals } from '@/modules/production/blowing/types';
import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

import {
  BLOWING_BENCHMARKS,
  count,
  money,
  monthLabel,
  pct,
  perBottle,
  rejectionPct,
} from '../constants';

interface BlowingKpiStripProps {
  totals?: DailyReportTotals;
  month: string;
  isLoading?: boolean;
}

/**
 * Headline numbers for the selected month. Everything here is the backend's own
 * roll-up (`/blowing/reports/monthly/`) so it agrees with the Reports page in
 * the blowing section — nothing is re-derived except the rejection share.
 */
export function BlowingKpiStrip({ totals, month, isLoading }: BlowingKpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const t = totals;
  const production = t?.total_production ?? 0;
  const rejection = t?.total_rejection ?? 0;
  const rejPct = rejectionPct(rejection, production);
  const goodBottles = Math.max(production - rejection, 0);
  const preformKg = (t?.total_preform_g ?? 0) / 1000;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <KpiStat
        icon={Factory}
        label="Runs"
        value={count(t?.run_count ?? 0)}
        sub={monthLabel(month)}
        accent={ACCENTS.slate}
        delayMs={0}
      />
      <KpiStat
        icon={Package}
        label="Bottles blown"
        value={count(production)}
        sub={`${count(goodBottles)} good`}
        accent={ACCENTS.blue}
        delayMs={60}
      />
      <KpiStat
        icon={AlertTriangle}
        label="Rejection"
        value={pct(rejPct)}
        sub={`${count(rejection)} pcs · target ≤ ${BLOWING_BENCHMARKS.rejectionPct}%`}
        accent={rejPct <= BLOWING_BENCHMARKS.rejectionPct ? ACCENTS.emerald : ACCENTS.orange}
        delayMs={120}
      />
      <KpiStat
        icon={Scale}
        label="Preform used"
        value={`${count(preformKg)} kg`}
        sub={preformKg > 0 ? `${(production / preformKg || 0).toFixed(0)} bottles / kg` : undefined}
        accent={ACCENTS.teal}
        delayMs={180}
      />
      <KpiStat
        icon={Receipt}
        label="Net cost"
        value={money(t?.net_cost ?? 0)}
        sub={`Gross ${money(t?.total_cost ?? 0)} − scrap ${money(t?.scrap_total ?? 0)}`}
        accent={ACCENTS.amber}
        delayMs={240}
      />
      <KpiStat
        icon={Zap}
        label="Cost / bottle"
        value={perBottle(t?.avg_per_bottle_cost ?? 0)}
        sub={`${count(t?.total_units ?? 0)} units · ${money(t?.electricity_cost ?? 0)} power`}
        accent={ACCENTS.violet}
        delayMs={300}
      />
    </div>
  );
}
