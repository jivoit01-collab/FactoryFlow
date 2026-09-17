import { Truck, TruckIcon } from 'lucide-react';

import { DASHBOARDS_PERMISSIONS, DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { PageHeader, PageSection } from '@/shared/components/page';

import {
  DispatchAnalytics,
  DispatchDeliveryKpis,
  DispatchPipelineFlow,
  DispatchSectionCards,
} from '../components/dashboard';

/**
 * Dispatch module landing (/dispatch). One screen: an animated live pipeline
 * flow (Booked → Vehicle In → Docked → Gatepass → Dispatched), headline KPIs and
 * charts, and the module's sub-areas as the same tiles the Dashboards hub is
 * built from. Analytics/pipeline sections render only when the user holds the
 * matching dashboard permission; the section tiles are always available.
 *
 * The page wears the standard header rather than a gradient hero of its own —
 * it is reached from the same sidebar as every other working page, and a second
 * visual language here made Dispatch look like a different product.
 */
export default function DispatchDashboardPage() {
  const { hasPermission } = usePermission();
  const canViewAnalytics = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);
  const canViewPipeline = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE);
  const canViewTracking = hasPermission(DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch"
        description="Plans, vehicle linking, docking, GRPO, bilties and transporter invoices — in one place."
        icon={Truck}
        accent="teal"
      />

      {canViewPipeline && <DispatchPipelineFlow />}

      {canViewAnalytics && <DispatchAnalytics />}

      {canViewTracking && (
        <PageSection title="Delivery tracking" icon={TruckIcon}>
          <DispatchDeliveryKpis />
        </PageSection>
      )}

      <PageSection title="Dispatch sections">
        <DispatchSectionCards />
      </PageSection>
    </div>
  );
}
