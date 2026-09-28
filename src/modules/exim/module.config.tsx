/**
 * Import / Export module.
 *
 * EXIM's screens, brought across from the separate system they ran in, one
 * module at a time and renamed for what they are. Live so far:
 *
 *   Export Licences         EXIM's Advance License and DFIA License pages, as
 *                           one register with a tab per kind
 *   Customs Exchange Rates  EXIM's Custom Exchange Rates page
 *
 * Gated on EXIM's own rights under the `exim` label (see
 * `config/permissions/exim.permissions.ts`), which EXIM's users arrived holding.
 */
import { FileBadge, Globe, Ship } from 'lucide-react';

import {
  EXIM_ACCESS,
  EXIM_LICENCE_ACCESS,
  EXIM_PERMISSIONS,
} from '@/config/permissions/exim.permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const EximHome = lazy(() => import('./pages/EximHome'));
const LicencesPage = lazy(() => import('./pages/LicencesPage'));
const LicenceDetailPage = lazy(() => import('./pages/LicenceDetailPage'));
const CustomsRatesPage = lazy(() => import('./pages/CustomsRatesPage'));

export const eximModuleConfig: ModuleConfig = {
  name: 'exim',
  routes: [
    {
      // No page of its own yet: it names the breadcrumb, and sends the reader
      // on to the first screen they may open.
      path: '/exim',
      element: <EximHome />,
      layout: 'main',
      permissions: EXIM_ACCESS,
      breadcrumb: { label: 'Import / Export' },
    },
    {
      path: '/exim/licences',
      element: <LicencesPage />,
      layout: 'main',
      permissions: EXIM_LICENCE_ACCESS,
      breadcrumb: { label: 'Export Licences' },
    },
    {
      path: '/exim/licences/:licenceId',
      element: <LicenceDetailPage />,
      layout: 'main',
      permissions: EXIM_LICENCE_ACCESS,
      breadcrumb: { label: 'Licence' },
    },
    {
      path: '/exim/customs-rates',
      element: <CustomsRatesPage />,
      layout: 'main',
      permissions: [EXIM_PERMISSIONS.VIEW_CUSTOMS_RATES],
      breadcrumb: { label: 'Customs Exchange Rates' },
    },
  ],
  navigation: [
    {
      path: '/exim/licences',
      title: 'Import / Export',
      icon: Ship,
      // Required, despite being optional on the type: the sidebar hides an
      // item without it.
      showInSidebar: true,
      // A list, not the `exim` prefix: see EXIM_ACCESS.
      permissions: EXIM_ACCESS,
      hasSubmenu: true,
      children: [
        {
          path: '/exim/licences',
          title: 'Export Licences',
          icon: FileBadge,
          permissions: EXIM_LICENCE_ACCESS,
        },
        {
          path: '/exim/customs-rates',
          title: 'Customs Exchange Rates',
          icon: Globe,
          permissions: [EXIM_PERMISSIONS.VIEW_CUSTOMS_RATES],
        },
      ],
    },
  ],
};
