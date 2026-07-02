import { PackageCheck } from 'lucide-react';
import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { DISPATCH_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load GRPO pages
const MaterialGRPOPage = lazy(() => import('./pages/MaterialGRPOPage'));
const PendingEntriesPage = lazy(() => import('./pages/PendingEntriesPage'));
const AllEntriesPage = lazy(() => import('./pages/AllEntriesPage'));
const GRPOPreviewPage = lazy(() => import('./pages/GRPOPreviewPage'));
const GRPOHistoryPage = lazy(() => import('./pages/GRPOHistoryPage'));
const GRPOHistoryDetailPage = lazy(() => import('./pages/GRPOHistoryDetailPage'));
function ServicePreviewRedirect() {
  const { dispatchPlanId } = useParams<{ dispatchPlanId: string }>();
  return <Navigate to={`/dispatch/bilty-grpo/preview/${dispatchPlanId}`} replace />;
}

function ServiceHistoryDetailRedirect() {
  const { postingId } = useParams<{ postingId: string }>();
  return <Navigate to={`/dispatch/bilty-grpo/history/${postingId}`} replace />;
}

const serviceGRPORedirectPermissions = [
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
  GRPO_PERMISSIONS.VIEW_PENDING,
  GRPO_PERMISSIONS.PREVIEW,
  GRPO_PERMISSIONS.POST,
  GRPO_PERMISSIONS.VIEW_HISTORY,
  GRPO_PERMISSIONS.VIEW_POSTING,
] as const;

/**
 * GRPO module configuration
 *
 * Route permissions: Controls who can access each page (ProtectedRoute)
 * Navigation permissions: Controls what appears in sidebar and dashboard cards
 */
export const grpoModuleConfig: ModuleConfig = {
  name: 'grpo',
  routes: [
    // Dashboard - requires pending view permission
    {
      path: '/grpo',
      element: <Navigate to="/grpo/material" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      breadcrumb: { label: 'GRPO' },
    },
    {
      path: '/grpo/material',
      element: <MaterialGRPOPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      breadcrumb: { label: 'Material GRPO' },
    },
    // Pending entries list
    {
      path: '/grpo/material/pending',
      element: <PendingEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // All entries list (gate / QC / done)
    {
      path: '/grpo/material/all-entries',
      element: <AllEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // Preview and post GRPO
    {
      path: '/grpo/material/preview/:vehicleEntryId',
      element: <GRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    // Posting history
    {
      path: '/grpo/material/history',
      element: <GRPOHistoryPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    // Posting detail
    {
      path: '/grpo/material/history/:postingId',
      element: <GRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
    {
      path: '/grpo/pending',
      element: <Navigate to="/grpo/material/pending" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    {
      path: '/grpo/all-entries',
      element: <Navigate to="/grpo/material/all-entries" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    {
      path: '/grpo/preview/:vehicleEntryId',
      element: <GRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    {
      path: '/grpo/history',
      element: <Navigate to="/grpo/material/history" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    {
      path: '/grpo/history/:postingId',
      element: <GRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
    {
      path: '/grpo/service',
      element: <Navigate to="/dispatch/bilty-grpo" replace />,
      layout: 'main',
      permissions: serviceGRPORedirectPermissions,
      breadcrumb: { label: 'Service GRPO' },
    },
    {
      path: '/grpo/service/pending',
      element: <Navigate to="/dispatch/bilty-grpo/pending" replace />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_PENDING,
        GRPO_PERMISSIONS.POST,
      ],
    },
    {
      path: '/grpo/service/preview/:dispatchPlanId',
      element: <ServicePreviewRedirect />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.PREVIEW,
        GRPO_PERMISSIONS.POST,
      ],
    },
    {
      path: '/grpo/service/history',
      element: <Navigate to="/dispatch/bilty-grpo/history" replace />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_HISTORY,
        GRPO_PERMISSIONS.VIEW_POSTING,
      ],
    },
    {
      path: '/grpo/service/history/:postingId',
      element: <ServiceHistoryDetailRedirect />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_POSTING,
        GRPO_PERMISSIONS.VIEW_HISTORY,
      ],
    },
  ],
  navigation: [
    // GRPO is a single page: the tabbed Material GRPO list covers pending, all
    // entries (gate/QC/done) and history, so no submenu is needed.
    {
      path: '/grpo/material',
      title: 'GRPO',
      icon: PackageCheck,
      showInSidebar: true,
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
  ],
};
