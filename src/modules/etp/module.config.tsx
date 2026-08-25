/**
 * ETP / STP module — the effluent and sewage treatment plants' QA registers.
 *
 * Six registers (daily plant log, on-line monitoring, chemical consumption,
 * sludge generation, back washing, calibration) plus the Settings screen that
 * holds every list they pick from. Each page is gated on its own register
 * permission, so a plant operator sees the daily registers while the calibration
 * record stays with QA.
 *
 * The sidebar hides the whole module from anyone without an `etp.*` permission
 * (`modulePrefix`).
 */
import {
  Beaker,
  Droplets,
  FlaskConical,
  Gauge,
  Recycle,
  Settings,
  ShowerHead,
  Trash2,
} from 'lucide-react';

import {
  ETP_ACCESS,
  ETP_BACKWASH_ACCESS,
  ETP_CALIBRATION_ACCESS,
  ETP_CHEMICAL_ACCESS,
  ETP_DAILY_LOG_ACCESS,
  ETP_MODULE_PREFIX,
  ETP_MONITORING_ACCESS,
  ETP_PERMISSIONS,
  ETP_SLUDGE_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const EtpHubPage = lazy(() => import('./pages/EtpHubPage'));
const EtpDailyLogPage = lazy(() => import('./pages/EtpDailyLogPage'));
const EtpMonitoringPage = lazy(() => import('./pages/EtpMonitoringPage'));
const EtpChemicalLogPage = lazy(() => import('./pages/EtpChemicalLogPage'));
const EtpSludgePage = lazy(() => import('./pages/EtpSludgePage'));
const EtpBackwashPage = lazy(() => import('./pages/EtpBackwashPage'));
const EtpCalibrationPage = lazy(() => import('./pages/EtpCalibrationPage'));
const EtpSettingsPage = lazy(() => import('./pages/EtpSettingsPage'));

export const etpModuleConfig: ModuleConfig = {
  name: 'etp',
  routes: [
    {
      path: '/etp',
      element: <EtpHubPage />,
      layout: 'main',
      permissions: ETP_ACCESS,
      breadcrumb: { label: 'ETP / STP' },
    },
    {
      path: '/etp/daily-log',
      element: <EtpDailyLogPage />,
      layout: 'main',
      permissions: ETP_DAILY_LOG_ACCESS,
      breadcrumb: { label: 'Daily Plant Log' },
    },
    {
      path: '/etp/monitoring',
      element: <EtpMonitoringPage />,
      layout: 'main',
      permissions: ETP_MONITORING_ACCESS,
      breadcrumb: { label: 'On-line Monitoring' },
    },
    {
      path: '/etp/chemicals',
      element: <EtpChemicalLogPage />,
      layout: 'main',
      permissions: ETP_CHEMICAL_ACCESS,
      breadcrumb: { label: 'Chemical Consumption' },
    },
    {
      path: '/etp/sludge',
      element: <EtpSludgePage />,
      layout: 'main',
      permissions: ETP_SLUDGE_ACCESS,
      breadcrumb: { label: 'Sludge Generation' },
    },
    {
      path: '/etp/backwash',
      element: <EtpBackwashPage />,
      layout: 'main',
      permissions: ETP_BACKWASH_ACCESS,
      breadcrumb: { label: 'Daily Back Washing' },
    },
    {
      path: '/etp/calibration',
      element: <EtpCalibrationPage />,
      layout: 'main',
      permissions: ETP_CALIBRATION_ACCESS,
      breadcrumb: { label: 'Calibration' },
    },
    {
      path: '/etp/settings',
      element: <EtpSettingsPage />,
      layout: 'main',
      permissions: [ETP_PERMISSIONS.MANAGE_SETTINGS, ETP_PERMISSIONS.VIEW_MODULE],
      breadcrumb: { label: 'Settings' },
    },
  ],
  navigation: [
    {
      path: '/etp',
      title: 'ETP / STP',
      icon: Recycle,
      showInSidebar: true,
      hasSubmenu: true,
      modulePrefix: ETP_MODULE_PREFIX,
      children: [
        {
          path: '/etp/daily-log',
          title: 'Daily Plant Log',
          icon: Droplets,
          permissions: ETP_DAILY_LOG_ACCESS,
        },
        {
          path: '/etp/monitoring',
          title: 'On-line Monitoring',
          icon: Gauge,
          permissions: ETP_MONITORING_ACCESS,
        },
        {
          path: '/etp/chemicals',
          title: 'Chemical Consumption',
          icon: FlaskConical,
          permissions: ETP_CHEMICAL_ACCESS,
        },
        {
          path: '/etp/sludge',
          title: 'Sludge Generation',
          icon: Trash2,
          permissions: ETP_SLUDGE_ACCESS,
        },
        {
          path: '/etp/backwash',
          title: 'Daily Back Washing',
          icon: ShowerHead,
          permissions: ETP_BACKWASH_ACCESS,
        },
        {
          path: '/etp/calibration',
          title: 'Calibration',
          icon: Beaker,
          permissions: ETP_CALIBRATION_ACCESS,
        },
        {
          path: '/etp/settings',
          title: 'Settings',
          icon: Settings,
          permissions: [ETP_PERMISSIONS.MANAGE_SETTINGS],
        },
      ],
    },
  ],
};
