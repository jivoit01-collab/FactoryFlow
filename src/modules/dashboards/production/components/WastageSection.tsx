import { Recycle } from 'lucide-react';
import { useMemo } from 'react';

import type { AnalyticsParams } from '@/modules/production/execution/types';

import { useWastageReconciliation } from '../api/reconciliation.queries';
import { ProductionWaste } from './ProductionWaste';
import { ReconciliationPanel } from './ReconciliationPanel';

/**
 * Wastage (App vs SAP) section — app WasteLog vs SAP scrap transferred into the
 * BH-WST warehouse, for the selected date range (all lines).
 */
export function WastageSection({ range }: { range: { from: string; to: string } }) {
  const params = useMemo(
    () => ({ date_from: range.from, date_to: range.to }),
    [range.from, range.to],
  );
  const query = useWastageReconciliation(params);
  const trendParams: AnalyticsParams = params;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Recycle className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold tracking-tight">Wastage — App vs SAP (BH-WST)</h2>
      </div>

      <ReconciliationPanel
        title="Wastage reconciliation"
        icon={Recycle}
        report={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        unitNoun="unit"
      />
      <ProductionWaste params={trendParams} />
    </section>
  );
}
