import { Maximize2 } from 'lucide-react';
import { useRef } from 'react';

import {
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  DispatchCompanyPanel,
  DispatchDayHeader,
  DispatchDayKpis,
  DispatchTrendChart,
  DispatchVehiclesPanel,
  DispatchVendorsPanel,
} from '../components';
import { useDispatchDayTotals, useDispatchDayVehicles, useFullscreen } from '../hooks';

/**
 * Dispatch, today, on a wall.
 *
 * Built for the screen in the admin's room rather than for a laptop: one glance
 * answers "how much went out, who moved it, which company it belonged to, and
 * which trucks are still standing in the yard". Everything fits one viewport —
 * there is no scrolling on a wall — and every list creeps past on its own, so
 * the board is complete without anybody touching it.
 *
 * Three sources, three different anchors, and the difference matters:
 *   - money and volume come from the fulfilment summary, anchored on the ACTUAL
 *     gate-out date, so they agree with the sales-dispatch register;
 *   - vendors, companies and the IN/OUT vehicle list come from the docking
 *     register, the only record carrying company, transporter and the truck's
 *     real state on one row.
 *
 * The dispatch-plan pipeline board used to drive a stage-flow strip here and was
 * dropped: a 16-day cross-company scan blew the client's 30 s timeout on every
 * refresh, so the strip showed a row of zeros and an error banner rather than
 * the floor. The full board still lives on the Dispatch Pipeline dashboard,
 * where one screen is worth waiting for.
 */
export default function DispatchDayDashboardPage() {
  const { hasPermission } = usePermission();
  const canSeeValues = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);
  const canSeeDockings = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.VIEW);
  const canSeeTracking = hasPermission(DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW);

  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  const totals = useDispatchDayTotals(canSeeValues);
  const vehicles = useDispatchDayVehicles(canSeeDockings);

  const updatedAt = Math.max(
    canSeeValues ? totals.updatedAt : 0,
    canSeeDockings ? vehicles.updatedAt : 0,
  );

  const refreshAll = () => {
    if (canSeeValues) totals.refetch();
    if (canSeeDockings) vehicles.refetch();
  };

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden bg-[#070b14] text-slate-200',
        isFullscreen
          ? 'h-screen w-screen p-4'
          : 'h-[calc(100vh-11rem)] min-h-[880px] rounded-3xl border border-white/10 p-3',
      )}
    >
      {/* ambient wash — keeps a mostly-black board from looking switched off */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/[0.07] to-transparent"
      />

      <DispatchDayHeader
        companyCount={totals.companyCount}
        companyCodes={totals.companyCodes}
        isFetching={totals.isFetching || vehicles.isFetching}
        updatedAt={updatedAt}
        onRefresh={refreshAll}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
      />

      {canSeeValues && totals.isError && (
        <p className="shrink-0 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
          {getErrorMessage(totals.error, "Today's dispatched totals could not be read.")}
        </p>
      )}

      {canSeeValues ? (
        <>
          <DispatchDayKpis totals={totals} />
          <DispatchTrendChart totals={totals} />
        </>
      ) : (
        <p className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
          Headline figures and the 14-day trend need the Dispatch Plans permission &mdash; showing
          the floor only.
        </p>
      )}

      {canSeeDockings ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_1.05fr]">
          <DispatchVendorsPanel vehicles={vehicles} />
          <DispatchCompanyPanel vehicles={vehicles} knownCompanyCodes={totals.companyCodes} />
          <DispatchVehiclesPanel vehicles={vehicles} canSeeTracking={canSeeTracking} />
        </div>
      ) : (
        <p className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm text-slate-400">
          Vendors, company split and the vehicle list need the Sales Dispatch Out view permission.
        </p>
      )}

      {!isFullscreen && (
        <p className="flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-slate-600">
          <Maximize2 className="h-3 w-3" />
          Built for a wall screen &mdash; open wall mode for the full-height board.
        </p>
      )}
    </div>
  );
}
