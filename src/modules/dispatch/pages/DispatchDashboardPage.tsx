import { LayoutGrid, Sparkles } from 'lucide-react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';

import {
  DispatchAnalytics,
  DispatchPipelineFlow,
  DispatchSectionCards,
} from '../components/dashboard';

/**
 * Dispatch module dashboard (landing at /dispatch). One screen: headline KPIs +
 * charts, an animated live pipeline flow (Booked → Vehicle In → Docked →
 * Gatepass → Dispatched), and the module's sub-areas as light nav cards at the
 * bottom. Analytics/pipeline sections render only when the user holds the
 * matching dashboard permission; the section cards are always available.
 */
export default function DispatchDashboardPage() {
  const { hasPermission } = usePermission();
  const canViewAnalytics = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);
  const canViewPipeline = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);

  return (
    <div className="relative min-h-full space-y-8 p-6">
      {/* ambient background wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-teal-500/[0.06] via-teal-500/[0.02] to-transparent" />

      {/* header */}
      <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both space-y-2 duration-500">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1 text-xs font-medium text-teal-600 dark:text-teal-400">
          <Sparkles className="h-3.5 w-3.5" />
          Dispatch
        </div>
        <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Dispatch control
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Plans, vehicle linking, docking, GRPO, bilties and transporter invoices — analysed in one
          place.
        </p>
      </header>

      {/* live pipeline flow */}
      {canViewPipeline && <DispatchPipelineFlow />}

      {/* KPIs + charts */}
      {canViewAnalytics && <DispatchAnalytics />}

      {/* module sections */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Dispatch sections</h2>
        </div>
        <DispatchSectionCards />
      </section>
    </div>
  );
}
