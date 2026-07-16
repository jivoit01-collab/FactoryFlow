import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import { DISPATCH_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

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

/**
 * Legacy redirect: GRPO moved from `/grpo/*` to `/warehouse/grpo/*` when it became a
 * submodule of Warehouse. Forwards any old bookmark/deep link (path + query) to the new
 * prefix. No route permissions here — the destination route enforces gating.
 */
function LegacyGrpoRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/warehouse${pathname}${search}`} replace />;
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
 * GRPO routes — contributed to the Warehouse module (`warehouseModuleConfig`).
 *
 * Route permissions: Controls who can access each page (ProtectedRoute)
 */
export const grpoRoutes: ModuleRoute[] = [
  // Dashboard - requires pending view permission
  {
    path: '/warehouse/grpo',
    element: <Navigate to="/warehouse/grpo/material" replace />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    breadcrumb: { label: 'GRPO' },
  },
  {
    path: '/warehouse/grpo/material',
    element: <MaterialGRPOPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    breadcrumb: { label: 'Material GRPO' },
  },
  // Pending entries list
  {
    path: '/warehouse/grpo/material/pending',
    element: <PendingEntriesPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  // All entries list (gate / QC / done)
  {
    path: '/warehouse/grpo/material/all-entries',
    element: <AllEntriesPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  // Preview and post GRPO
  {
    path: '/warehouse/grpo/material/preview/:vehicleEntryId',
    element: <GRPOPreviewPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.PREVIEW],
  },
  // Posting history
  {
    path: '/warehouse/grpo/material/history',
    element: <GRPOHistoryPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
  },
  // Posting detail
  {
    path: '/warehouse/grpo/material/history/:postingId',
    element: <GRPOHistoryDetailPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
  },
  {
    path: '/warehouse/grpo/pending',
    element: <Navigate to="/warehouse/grpo/material/pending" replace />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  {
    path: '/warehouse/grpo/all-entries',
    element: <Navigate to="/warehouse/grpo/material/all-entries" replace />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  {
    path: '/warehouse/grpo/preview/:vehicleEntryId',
    element: <GRPOPreviewPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.PREVIEW],
  },
  {
    path: '/warehouse/grpo/history',
    element: <Navigate to="/warehouse/grpo/material/history" replace />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
  },
  {
    path: '/warehouse/grpo/history/:postingId',
    element: <GRPOHistoryDetailPage />,
    layout: 'main',
    permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
  },
  {
    path: '/warehouse/grpo/service',
    element: <Navigate to="/dispatch/bilty-grpo" replace />,
    layout: 'main',
    permissions: serviceGRPORedirectPermissions,
    breadcrumb: { label: 'Service GRPO' },
  },
  {
    path: '/warehouse/grpo/service/pending',
    element: <Navigate to="/dispatch/bilty-grpo/pending" replace />,
    layout: 'main',
    permissions: [
      DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
      GRPO_PERMISSIONS.VIEW_PENDING,
      GRPO_PERMISSIONS.POST,
    ],
  },
  {
    path: '/warehouse/grpo/service/preview/:dispatchPlanId',
    element: <ServicePreviewRedirect />,
    layout: 'main',
    permissions: [
      DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
      GRPO_PERMISSIONS.PREVIEW,
      GRPO_PERMISSIONS.POST,
    ],
  },
  {
    path: '/warehouse/grpo/service/history',
    element: <Navigate to="/dispatch/bilty-grpo/history" replace />,
    layout: 'main',
    permissions: [
      DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
      GRPO_PERMISSIONS.VIEW_HISTORY,
      GRPO_PERMISSIONS.VIEW_POSTING,
    ],
  },
  {
    path: '/warehouse/grpo/service/history/:postingId',
    element: <ServiceHistoryDetailRedirect />,
    layout: 'main',
    permissions: [
      DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
      GRPO_PERMISSIONS.VIEW_POSTING,
      GRPO_PERMISSIONS.VIEW_HISTORY,
    ],
  },
  // Legacy `/grpo/*` links → `/warehouse/grpo/*` (keep last: matches the whole old namespace).
  {
    path: '/grpo/*',
    element: <LegacyGrpoRedirect />,
    layout: 'main',
  },
];

/**
 * GRPO navigation — a child item under the Warehouse sidebar group.
 * The tabbed Material GRPO list covers pending, all entries (gate/QC/done) and history,
 * so a single entry is enough.
 */
export const grpoNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/grpo/material',
    title: 'Material GRPO',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
];
