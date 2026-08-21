import { Truck } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

import { DISPATCH_PERMISSIONS, GATE_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const DispatchDashboardPage = lazy(() => import('./pages/DispatchDashboardPage'));
const DispatchBillSelectionPage = lazy(
  () => import('@/modules/dashboards/dispatch-plans/pages/DispatchBillSelectionPage'),
);
const DispatchPlansDashboardPage = lazy(
  () => import('@/modules/dashboards/dispatch-plans/pages/DispatchPlansDashboardPage'),
);
const DispatchBillsLinkingPage = lazy(
  () => import('@/modules/vehicle-management/pages/DispatchBillsLinkingPage'),
);
const DispatchVehicleLinkingPage = lazy(
  () => import('@/modules/vehicle-management/pages/DispatchVehicleLinkingPage'),
);
const PreviouslyRegisteredVehiclePage = lazy(
  () => import('@/modules/vehicle-management/pages/PreviouslyRegisteredVehiclePage'),
);
const DispatchTrackingPage = lazy(() => import('@/modules/dispatch/pages/DispatchTrackingPage'));
const ServiceGRPODashboardPage = lazy(
  () => import('@/modules/warehouse/grpo/pages/ServiceGRPODashboardPage'),
);
const ServicePendingEntriesPage = lazy(
  () => import('@/modules/warehouse/grpo/pages/ServicePendingEntriesPage'),
);
const ServiceGRPOPreviewPage = lazy(() => import('@/modules/warehouse/grpo/pages/ServiceGRPOPreviewPage'));
const ServiceGRPOHistoryPage = lazy(() => import('@/modules/warehouse/grpo/pages/ServiceGRPOHistoryPage'));
const ServiceGRPOHistoryDetailPage = lazy(
  () => import('@/modules/warehouse/grpo/pages/ServiceGRPOHistoryDetailPage'),
);
const OpenBiltiesPage = lazy(() => import('./pages/OpenBiltiesPage'));
const TransporterInvoicesPage = lazy(() => import('./pages/TransporterInvoicesPage'));
const TransporterInvoiceQueuePage = lazy(() => import('./pages/TransporterInvoiceQueuePage'));
const TransporterInvoiceHistoryPage = lazy(() => import('./pages/TransporterInvoiceHistoryPage'));
const TransporterInvoiceDetailPage = lazy(() => import('./pages/TransporterInvoiceDetailPage'));
const DockingDashboardPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchDashboardPage'),
);
const DockingNewPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchNewPage'),
);
const DockingBarcodeScanPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage'),
);
const DockingAttachmentsPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchAttachmentsPage'),
);
const DockingGatepassPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchGatepassPage'),
);
const DockingReprintPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchReprintPage'),
);
const DockingDetailPage = lazy(
  () => import('@/modules/gate/pages/customerSalesFlow/SalesDispatchDetailPage'),
);

const dispatchViewPermissions = [
  DISPATCH_PERMISSIONS.VIEW_PLANS,
  DISPATCH_PERMISSIONS.SELECT_BILLS,
  DISPATCH_PERMISSIONS.LINK_VEHICLE,
  // Inside Vehicle Manager view — so a user granted ONLY this page (e.g. an
  // add-bill-only SCM operator) still sees the Dispatch parent menu and the
  // /dispatch landing. Every other child's view perm is represented here too.
  DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW,
  DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW,
  // Service GRPO (transporter bilty) is a dispatch function — gate the module on
  // the dispatch-owned can_post_bilty_service_grpo, NOT the material-GRPO app
  // perms, so material-GRPO clerks don't see the whole Dispatch module (A7a).
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
  DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES,
  DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE,
  DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE,
  GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
  GATE_PERMISSIONS.SALES_DISPATCH.CREATE,
  GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS,
  GATE_PERMISSIONS.SALES_DISPATCH.VIEW_REPORTS,
] as const;

// Nav gate for the Service GRPO submenu: dispatch-owned perm only, so it shows
// for dispatch/service-GRPO staff but not material-GRPO clerks. The routes below
// still accept grpo.* as an alternative, matching the backend's OR-permission.
const serviceGRPOViewPermissions = [
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
] as const;

function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

export const dispatchModuleConfig: ModuleConfig = {
  name: 'dispatch',
  routes: [
    {
      path: '/dispatch',
      element: <DispatchDashboardPage />,
      layout: 'main',
      permissions: dispatchViewPermissions,
      breadcrumb: { label: 'Dispatch' },
    },
    {
      path: '/dispatch/bill-selection',
      element: <DispatchBillSelectionPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.SELECT_BILLS],
      breadcrumb: { label: 'Bill Selection' },
    },
    {
      path: '/dispatch/plans',
      element: <DispatchPlansDashboardPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
      breadcrumb: { label: 'Dispatch Plans' },
    },
    {
      path: '/dispatch/bills-linking',
      element: <DispatchBillsLinkingPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
      breadcrumb: { label: 'Bills Linking' },
    },
    {
      // The truck board: booking through gate-in. Either permission opens it —
      // the linking half and the inside-correction half are gated per button.
      path: '/dispatch/vehicle-linking',
      element: <DispatchVehicleLinkingPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.LINK_VEHICLE,
        DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW,
      ],
      breadcrumb: { label: 'Vehicle Linking' },
    },
    {
      path: '/dispatch/vehicle-linking/previously-registered',
      element: <PreviouslyRegisteredVehiclePage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
      breadcrumb: { label: 'Previously Registered Vehicle' },
    },
    {
      // Merged into Vehicle Linking — kept so old links and bookmarks land there.
      path: '/dispatch/inside-vehicles',
      element: <Navigate to="/dispatch/vehicle-linking" replace />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW],
      breadcrumb: { label: 'Inside Vehicle Manager' },
    },
    {
      path: '/dispatch/tracking',
      element: <DispatchTrackingPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
      breadcrumb: { label: 'Dispatch Tracking' },
    },
    {
      path: '/dispatch/docking',
      element: <DockingDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
      breadcrumb: { label: 'Docking' },
    },
    {
      path: '/dispatch/docking/new',
      element: <DockingNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'New Docking' },
    },
    {
      path: '/dispatch/docking/new/barcode-scan',
      element: <DockingBarcodeScanPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Box Scanning' },
    },
    {
      path: '/dispatch/docking/new/weighment',
      element: <RedirectWithSearch to="/dispatch/docking/new/barcode-scan" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Box Scanning' },
    },
    {
      path: '/dispatch/docking/new/attachments',
      element: <DockingAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Attachments' },
    },
    {
      path: '/dispatch/docking/new/gatepass',
      element: <DockingGatepassPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Gatepass' },
    },
    {
      path: '/dispatch/docking/reprint',
      element: <DockingReprintPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
      breadcrumb: { label: 'Reprint Gatepass' },
    },
    {
      path: '/dispatch/docking/:entryId/reprint',
      element: <DockingReprintPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
      breadcrumb: { label: 'Reprint Gatepass' },
    },
    {
      path: '/dispatch/docking/reports',
      element: <RedirectWithSearch to="/dispatch/docking/reprint" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
      breadcrumb: { label: 'Reprint Gatepass' },
    },
    {
      path: '/dispatch/docking/:entryId',
      element: <DockingDetailPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
      breadcrumb: { label: 'Docking Entry' },
    },
    {
      path: '/dispatch/bilty-grpo',
      element: <ServiceGRPODashboardPage />,
      layout: 'main',
      permissions: serviceGRPOViewPermissions,
      breadcrumb: { label: 'Service GRPO' },
    },
    {
      path: '/dispatch/bilty-grpo/pending',
      element: <ServicePendingEntriesPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_PENDING,
        GRPO_PERMISSIONS.POST,
      ],
      breadcrumb: { label: 'Pending Service GRPO' },
    },
    {
      path: '/dispatch/bilty-grpo/preview/:dispatchPlanId',
      element: <ServiceGRPOPreviewPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.PREVIEW,
        GRPO_PERMISSIONS.POST,
      ],
      breadcrumb: { label: 'Service GRPO Preview' },
    },
    {
      path: '/dispatch/bilty-grpo/history',
      element: <ServiceGRPOHistoryPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_HISTORY,
        GRPO_PERMISSIONS.VIEW_POSTING,
      ],
      breadcrumb: { label: 'Service GRPO History' },
    },
    {
      path: '/dispatch/bilty-grpo/history/:postingId',
      element: <ServiceGRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_POSTING,
        GRPO_PERMISSIONS.VIEW_HISTORY,
      ],
      breadcrumb: { label: 'Service GRPO Detail' },
    },
    {
      path: '/dispatch/open-bilties',
      element: <OpenBiltiesPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES,
        DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE,
      ],
      breadcrumb: { label: 'Open Bilties' },
    },
    {
      path: '/dispatch/transporter-invoices',
      element: <TransporterInvoicesPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'A/P Invoice' },
    },
    {
      path: '/dispatch/transporter-invoices/pending',
      element: <TransporterInvoiceQueuePage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'Pending A/P Invoice' },
    },
    {
      path: '/dispatch/transporter-invoices/history',
      element: <TransporterInvoiceHistoryPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'A/P Invoice History' },
    },
    {
      path: '/dispatch/transporter-invoices/history/:postingId',
      element: <TransporterInvoiceDetailPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'Invoice Detail' },
    },
  ],
  navigation: [
    {
      path: '/dispatch',
      title: 'Dispatch',
      icon: Truck,
      showInSidebar: true,
      permissions: dispatchViewPermissions,
      hasSubmenu: true,
      children: [
        {
          path: '/dispatch/bill-selection',
          title: 'Bill Selection',
          permissions: [DISPATCH_PERMISSIONS.SELECT_BILLS],
        },
        {
          path: '/dispatch/plans',
          title: 'Plans',
          permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
        },
        {
          path: '/dispatch/bills-linking',
          title: 'Bills Linking',
          permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
        },
        {
          path: '/dispatch/vehicle-linking',
          title: 'Vehicle Linking',
          permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
        },
        {
          path: '/dispatch/docking',
          title: 'Docking',
          permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
        },
        {
          path: '/dispatch/tracking',
          title: 'Dispatch Tracking',
          permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
        },
        {
          path: '/dispatch/docking/reprint',
          title: 'Reprint Gatepass',
          permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
        },
        {
          path: '/dispatch/bilty-grpo',
          title: 'Service GRPO',
          permissions: serviceGRPOViewPermissions,
        },
        {
          path: '/dispatch/open-bilties',
          title: 'Open Bilties',
          permissions: [DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES],
        },
        {
          path: '/dispatch/transporter-invoices',
          title: 'A/P Invoice',
          permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
        },
      ],
    },
  ],
};
