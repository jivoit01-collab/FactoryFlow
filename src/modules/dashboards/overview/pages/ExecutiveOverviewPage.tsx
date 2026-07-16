import { LayoutGrid, Sparkles } from 'lucide-react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';

import { LiveDispatchCard, LiveStockHealthCard, ModuleDirectoryGrid } from '../components';

/**
 * Executive Overview — the "all-in-one" Command Centre (Tier 1 of the dashboard
 * system, see docs/DASHBOARD_MODULE_PLAN.md). One screen: live headline KPIs
 * from wired-up modules + a permission-filtered directory of every module.
 *
 * Live KPI sections reuse the sibling dashboards' typed query hooks. As each
 * remaining module gains a summary endpoint, add a `Live<Module>Card` to the
 * Live KPIs grid and gate it on that module's view permission.
 */
export default function ExecutiveOverviewPage() {
  const { hasPermission } = usePermission();

  const canViewDispatch = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);
  const canViewStock = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD);
  const hasAnyLiveKpi = canViewDispatch || canViewStock;

  return (
    <div className="relative min-h-full space-y-10 p-6">
      {/* ambient background wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent" />

      {/* -------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* -------------------------------------------------------------- */}
      <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both space-y-2 duration-500">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Command Centre
        </div>
        <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Everything, at a glance
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A single view across every module — live KPIs where wired, and one-tap access to each
          module&apos;s full dashboard.
        </p>
      </header>

      {/* -------------------------------------------------------------- */}
      {/* Live KPIs across modules                                        */}
      {/* -------------------------------------------------------------- */}
      {hasAnyLiveKpi && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-lg font-semibold">Live KPIs</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {canViewDispatch && <LiveDispatchCard />}
            {canViewStock && <LiveStockHealthCard />}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* All modules directory                                           */}
      {/* -------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">All modules</h2>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">
          Jump straight into any module you have access to.
        </p>
        <ModuleDirectoryGrid />
      </section>
    </div>
  );
}
