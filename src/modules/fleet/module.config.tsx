/**
 * Company Vehicles — the fleet the company owns and what it costs to run.
 *
 * Deliberately its own module rather than a page under Vehicle Management.
 * That module is the gate's: it holds the outside trucks that arrive, every
 * one of them against a transporter, and it is about deliveries. This one is
 * about four trucks, a couple of cars, an Eeco and a scooty — and about fuel
 * slips and workshop bills, which the gate never sees.
 *
 * The sidebar hides the whole module from anyone without a `company_vehicle.*`
 * permission (`modulePrefix`).
 */
import { Car } from 'lucide-react';

import { FLEET_ACCESS, FLEET_MODULE_PREFIX, FLEET_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const FleetDashboardPage = lazy(() => import('./pages/FleetDashboardPage'));
const FleetVehiclesPage = lazy(() => import('./pages/FleetVehiclesPage'));
const FleetVehicleDetailPage = lazy(() => import('./pages/FleetVehicleDetailPage'));
const DailyReadingsPage = lazy(() => import('./pages/DailyReadingsPage'));
const FuelEntriesPage = lazy(() => import('./pages/FuelEntriesPage'));
const ServiceEntriesPage = lazy(() => import('./pages/ServiceEntriesPage'));
const FleetApprovalsPage = lazy(() => import('./pages/FleetApprovalsPage'));

export const fleetModuleConfig: ModuleConfig = {
  name: 'fleet',
  routes: [
    {
      path: '/fleet',
      element: <FleetDashboardPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Company Vehicles' },
    },
    {
      path: '/fleet/vehicles',
      element: <FleetVehiclesPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Vehicles' },
    },
    {
      path: '/fleet/vehicles/:id',
      element: <FleetVehicleDetailPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Vehicle' },
    },
    {
      path: '/fleet/readings',
      element: <DailyReadingsPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Daily reading' },
    },
    {
      path: '/fleet/fuel',
      element: <FuelEntriesPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Fuel' },
    },
    {
      path: '/fleet/service',
      element: <ServiceEntriesPage />,
      layout: 'main',
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Service' },
    },
    {
      path: '/fleet/approvals',
      element: <FleetApprovalsPage />,
      layout: 'main',
      // Viewers reach this page too — it shows what is waiting. The buttons on
      // it are what the approve right gates, and the API enforces that.
      permissions: FLEET_ACCESS,
      breadcrumb: { label: 'Approvals' },
    },
  ],
  navigation: [
    {
      path: '/fleet',
      title: 'Company Vehicles',
      icon: Car,
      showInSidebar: true,
      permissions: FLEET_ACCESS,
      modulePrefix: FLEET_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        { path: '/fleet/vehicles', title: 'Vehicles', permissions: FLEET_ACCESS },
        { path: '/fleet/readings', title: 'Daily reading', permissions: FLEET_ACCESS },
        { path: '/fleet/fuel', title: 'Fuel', permissions: FLEET_ACCESS },
        { path: '/fleet/service', title: 'Service & repairs', permissions: FLEET_ACCESS },
        {
          path: '/fleet/approvals',
          title: 'Approvals',
          permissions: [FLEET_PERMISSIONS.VIEW, FLEET_PERMISSIONS.APPROVE_EXPENSE],
        },
      ],
    },
  ],
};
