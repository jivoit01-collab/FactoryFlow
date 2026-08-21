import { Truck } from 'lucide-react';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import { Navigate } from 'react-router-dom';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const VehicleManagementDashboardPage = lazy(() => import('./pages/VehicleManagementDashboardPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const TransportersPage = lazy(() => import('./pages/TransportersPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const VehicleEntriesPage = lazy(() => import('./pages/VehicleEntriesPage'));

const vehicleManagementViewPermissions = [
  VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
] as const;

export const vehicleManagementModuleConfig: ModuleConfig = {
  name: 'vehicle-management',
  routes: [
    {
      path: '/vehicle-management',
      element: <VehicleManagementDashboardPage />,
      layout: 'main',
      permissions: vehicleManagementViewPermissions,
      breadcrumb: { label: 'Vehicle Management' },
    },
    {
      path: '/vehicle-management/dispatch-linking',
      element: <Navigate to="/dispatch/bills-linking" replace />,
      layout: 'main',
      permissions: [VEHICLE_MANAGEMENT_PERMISSIONS.DISPATCH_VEHICLE_LINKING],
      breadcrumb: { label: 'Bills Linking' },
    },
    {
      path: '/vehicle-management/vehicles',
      element: <VehiclesPage />,
      layout: 'main',
      permissions: [
        VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
        VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_VEHICLES,
      ],
      breadcrumb: { label: 'Vehicles' },
    },
    {
      path: '/vehicle-management/transporters',
      element: <TransportersPage />,
      layout: 'main',
      permissions: [
        VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
        VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_TRANSPORTERS,
      ],
      breadcrumb: { label: 'Transporters' },
    },
    {
      path: '/vehicle-management/drivers',
      element: <DriversPage />,
      layout: 'main',
      permissions: [
        VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
        VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_DRIVERS,
      ],
      breadcrumb: { label: 'Drivers' },
    },
    {
      path: '/vehicle-management/entries',
      element: <VehicleEntriesPage />,
      layout: 'main',
      permissions: [VEHICLE_MANAGEMENT_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Vehicle Entries' },
    },
  ],
  navigation: [
    {
      path: '/vehicle-management',
      title: 'Vehicle Management',
      icon: Truck,
      showInSidebar: true,
      permissions: vehicleManagementViewPermissions,
      hasSubmenu: true,
      children: [
        {
          path: '/vehicle-management/vehicles',
          title: 'Vehicles',
          permissions: [
            VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
            VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_VEHICLES,
          ],
        },
        {
          path: '/vehicle-management/transporters',
          title: 'Transporters',
          permissions: [
            VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
            VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_TRANSPORTERS,
          ],
        },
        {
          path: '/vehicle-management/drivers',
          title: 'Drivers',
          permissions: [
            VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
            VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_DRIVERS,
          ],
        },
        {
          path: '/vehicle-management/entries',
          title: 'Vehicle Entries',
          permissions: [VEHICLE_MANAGEMENT_PERMISSIONS.VIEW],
        },
      ],
    },
  ],
};
