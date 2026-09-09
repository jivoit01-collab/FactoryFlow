import { AlertTriangle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import {
  usePackingMaterialDispatch,
  usePackingMaterialProduction,
  usePackingMaterialStock,
} from '../api';
import {
  PmDispatchSection,
  PmPeriodBar,
  PmProductionSection,
  PmStockCards,
  PmStockDialog,
  type PmStockView,
} from '../components';
import { DEFAULT_TOP_N, monthRange, shiftMonth } from '../constants';
import type { PackingMaterialSource } from '../types';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

/**
 * Packing Material.
 *
 * Four stock cards over two top lists. The cards are what is on the shelf in
 * each packaging store right now, and every one of them opens: a store onto
 * its own items, the total onto the stores side by side. The two lists are one
 * month — the packing material the line issued, and the packing material that
 * went out inside the bills that were dispatched.
 *
 * Three requests, not one. Stock does not move when the month changes, and
 * only the dispatch list changes when the source toggle is flipped, so each
 * panel reloads when its own question changes and no faster.
 */
export default function PackingMaterialDashboardPage() {
  // Fixed at mount rather than recomputed on render, so a board left open
  // overnight does not silently change month underneath the person reading it.
  const [today] = useState(() => new Date());
  const currentMonth = useMemo(() => shiftMonth(today, 0), [today]);

  const [month, setMonth] = useState(currentMonth);
  const [top, setTop] = useState(DEFAULT_TOP_N);
  const [source, setSource] = useState<PackingMaterialSource>('sap');
  const [stockView, setStockView] = useState<PmStockView>(null);

  const period = useMemo(() => monthRange(month), [month]);
  const periodQuery = useMemo(() => ({ ...period, top }), [period, top]);
  const dispatchQuery = useMemo(() => ({ ...periodQuery, source }), [periodQuery, source]);

  const stockQuery = usePackingMaterialStock();
  const productionQuery = usePackingMaterialProduction(periodQuery);
  const dispatchQuery_ = usePackingMaterialDispatch(dispatchQuery);

  const refreshAll = useCallback(() => {
    void stockQuery.refetch();
    void productionQuery.refetch();
    void dispatchQuery_.refetch();
  }, [stockQuery, productionQuery, dispatchQuery_]);

  // Any one panel can be down while the others answer. The banner shows for
  // the first that is, and the panels that did answer stay on screen.
  const sapError = [stockQuery.error, productionQuery.error, dispatchQuery_.error].find(isSAPError);

  const isFetching =
    stockQuery.isFetching || productionQuery.isFetching || dispatchQuery_.isFetching;

  // SAP renumbered or renamed the packaging group. The board keeps counting on
  // the code, which is what SAP enforces, and says the two have parted rather
  // than reporting a month in which the factory apparently used no packaging.
  const groupMeta =
    stockQuery.data?.meta ?? productionQuery.data?.meta ?? dispatchQuery_.data?.meta;
  const groupMismatch = groupMeta ? !groupMeta.pm_item_group_matches : false;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Packing Material"
        description="What is in the packaging stores, what production used, and what shipped out"
      />

      <PmPeriodBar
        month={month}
        onMonthChange={setMonth}
        top={top}
        onTopChange={setTop}
        latestMonth={currentMonth}
        isFetching={isFetching}
        onRefresh={refreshAll}
      />

      {sapError && <SAPUnavailableBanner error={sapError as ApiError} onRetry={refreshAll} />}

      {groupMismatch && groupMeta && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            SAP item group {groupMeta.pm_item_group} is now called{' '}
            <span className="font-medium">{groupMeta.pm_item_group_name || '(no name)'}</span>, not
            &ldquo;PACKAGING MATERIAL&rdquo;. Every figure on this board is still counted on group{' '}
            {groupMeta.pm_item_group} — check with whoever changed it before quoting these numbers.
          </span>
        </p>
      )}

      <PmStockCards
        stock={stockQuery.data}
        isLoading={stockQuery.isLoading}
        onOpenWarehouse={(warehouse) => setStockView({ kind: 'warehouse', warehouse })}
        onOpenTotal={() => setStockView({ kind: 'total' })}
      />

      {/* Paired from 1280px and stacked below. Reading the two lists together
          is the point — the same cap appears in both — but each carries a name,
          a family, a quantity and a value, and at 1024px they were both
          scrolling sideways, which defeats reading them together worse than
          stacking does. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <PmProductionSection
          report={productionQuery.data}
          isLoading={productionQuery.isLoading || productionQuery.isFetching}
          top={top}
        />
        <PmDispatchSection
          report={dispatchQuery_.data}
          isLoading={dispatchQuery_.isLoading || dispatchQuery_.isFetching}
          top={top}
          source={source}
          onSourceChange={setSource}
        />
      </div>

      <PmStockDialog view={stockView} stock={stockQuery.data} onClose={() => setStockView(null)} />
    </div>
  );
}
