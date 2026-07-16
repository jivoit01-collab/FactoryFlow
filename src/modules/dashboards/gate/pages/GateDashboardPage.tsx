import { useCallback, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';

import { GateActivityCards, GateInSummary, GateVehicleJourney } from '../components';
import { type GateRange, todayISO } from '../constants/gate-dashboard.constants';

/**
 * Gate dashboard (Dashboards module, /dashboards/gate). Headline counts, a live
 * vehicle-journey road, and every gate activity as a compact card. A from→to
 * date range at the top drives every section and defaults to today; all data
 * polls live.
 */
export default function GateDashboardPage() {
  const { hasPermission } = usePermission();
  const canViewVehicleFlow = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);

  const [range, setRange] = useState<GateRange>(() => {
    const t = todayISO();
    return { from: t, to: t };
  });

  const onFrom = useCallback((from: string) => {
    if (!from) return;
    setRange((r) => ({ from, to: r.to && r.to >= from ? r.to : from }));
  }, []);
  const onTo = useCallback((to: string) => {
    if (!to) return;
    setRange((r) => ({ to, from: r.from && r.from <= to ? r.from : to }));
  }, []);
  const setToday = useCallback(() => {
    const t = todayISO();
    setRange({ from: t, to: t });
  }, []);

  return (
    <div className="relative min-h-full space-y-6 p-6">
      {/* ambient background wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-blue-500/[0.05] to-transparent" />

      {/* header */}
      <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col gap-4 duration-500 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Gate activity</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Every vehicle and person crossing the gate — inbound receipts, outbound dispatch,
            returns and visitors — in one live view.
          </p>
        </div>

        {/* rose-tinted date range card — drives the whole page */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-3 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10">
          <label className="flex flex-col gap-1 text-xs font-medium text-rose-700/80 dark:text-rose-300/80">
            From
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => onFrom(e.target.value)}
              className="rounded-md border border-rose-200 bg-background px-2 py-1.5 text-sm text-foreground dark:border-rose-500/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-rose-700/80 dark:text-rose-300/80">
            To
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => onTo(e.target.value)}
              className="rounded-md border border-rose-200 bg-background px-2 py-1.5 text-sm text-foreground dark:border-rose-500/30"
            />
          </label>
          <Button variant="outline" size="sm" onClick={setToday} className="bg-background">
            Today
          </Button>
        </div>
      </header>

      {/* headline gate counts */}
      <GateInSummary range={range} />

      {/* live vehicle journey */}
      {canViewVehicleFlow && <GateVehicleJourney range={range} />}

      {/* all gate activities (own header + view-all toggle) */}
      <GateActivityCards range={range} />
    </div>
  );
}
