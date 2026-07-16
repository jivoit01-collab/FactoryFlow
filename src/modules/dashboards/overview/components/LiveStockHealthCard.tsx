import { AlertTriangle, ArrowUpRight, Boxes, PackageCheck, PackageX } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage } from '@/shared/utils';

import { useStockLevels } from '../../stock-level/api';
import { ACCENTS, formatCount } from '../constants';
import { KpiStat } from './KpiStat';

/**
 * Live stock-health KPIs on the overview — tracked items and the healthy / low
 * / critical split vs benchmark minimums. Reuses the stock-benchmark hook; a
 * tiny page size keeps the payload minimal (the counts live in response meta).
 */
export function LiveStockHealthCard() {
  const navigate = useNavigate();
  const filters = useMemo(() => ({ page: 1, page_size: 1 }), []);
  const query = useStockLevels(filters);
  const meta = query.data?.meta;

  const goToStock = () => navigate('/dashboards/stock-levels');

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-sm duration-500 [animation-delay:100ms]">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-emerald-500" />
          <h3 className="text-base font-semibold">Stock health vs benchmark</h3>
        </div>
        <button
          type="button"
          onClick={goToStock}
          className="group inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
        >
          View dashboard
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </header>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          {getErrorMessage(query.error, 'Failed to load stock data.')}
        </p>
      ) : !meta ? null : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiStat
            icon={Boxes}
            label="Tracked items"
            value={formatCount(meta.total_items)}
            accent={ACCENTS.indigo}
            onClick={goToStock}
            delayMs={0}
          />
          <KpiStat
            icon={PackageCheck}
            label="Healthy"
            value={formatCount(meta.healthy_count)}
            accent={ACCENTS.emerald}
            onClick={goToStock}
            delayMs={60}
          />
          <KpiStat
            icon={PackageX}
            label="Low stock"
            value={formatCount(meta.low_stock_count)}
            accent={ACCENTS.amber}
            onClick={goToStock}
            delayMs={120}
          />
          <KpiStat
            icon={AlertTriangle}
            label="Critical"
            value={formatCount(meta.critical_stock_count)}
            accent={ACCENTS.rose}
            onClick={goToStock}
            delayMs={180}
          />
        </div>
      )}
    </section>
  );
}
