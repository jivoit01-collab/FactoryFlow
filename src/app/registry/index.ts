import type { Reducer } from '@reduxjs/toolkit';

import type { ModuleConfig, ModuleNavItem, ModuleRoute } from '@/core/types';
// Module configuration imports
// Each module exports its own routes, navigation, and reducers
import { authModuleConfig } from '@/modules/auth/module.config';
import { dashboardModuleConfig } from '@/modules/dashboard/module.config';
import { dashboardsModuleConfig } from '@/modules/dashboards/module.config';
import { gateModuleConfig } from '@/modules/gate/module.config';
import { grpoModuleConfig } from '@/modules/grpo/module.config';
import { notificationsModuleConfig } from '@/modules/notifications/module.config';
import { productionModuleConfig } from '@/modules/production/module.config';
import { qcModuleConfig } from '@/modules/qc/module.config';
import { settingsModuleConfig } from '@/modules/settings/module.config';
import { warehouseModuleConfig } from '@/modules/warehouse/module.config';

/**
 * Central registry of all feature modules
 * Each module exports its own configuration (routes, navigation, reducers)
 */
export const moduleRegistry: ModuleConfig[] = [
  authModuleConfig,
  dashboardModuleConfig,
  dashboardsModuleConfig,
  gateModuleConfig,
  qcModuleConfig,
  grpoModuleConfig,
  productionModuleConfig,
  warehouseModuleConfig,
  notificationsModuleConfig,
  settingsModuleConfig,
];

/**
 * Extract all routes from registered modules
 */
export function getAllRoutes(): ModuleRoute[] {
  return moduleRegistry.flatMap((m) => m.routes);
}

/**
 * Extract routes by layout type
 */
export function getRoutesByLayout(layout: 'auth' | 'main'): ModuleRoute[] {
  return getAllRoutes().filter((route) => {
    if (layout === 'auth') {
      return route.layout === 'auth';
    }
    // Default to main layout if not specified
    return route.layout !== 'auth';
  });
}

/**
 * Extract all navigation items from registered modules
 */
export function getAllNavigation(): ModuleNavItem[] {
  return moduleRegistry.flatMap((m) => m.navigation ?? []);
}

/**
 * Build a Set of all registered route paths (for breadcrumb navigability)
 * and a Map of path → breadcrumb label overrides
 */
export function getBreadcrumbMeta(): {
  navigablePaths: Set<string>;
  labels: Map<string, string>;
} {
  const navigablePaths = new Set<string>();
  const labels = new Map<string, string>();

  for (const route of getAllRoutes()) {
    // Skip auth routes and dynamic param routes for navigability
    if (route.layout === 'auth') continue;
    navigablePaths.add(route.path);

    if (route.breadcrumb?.label) {
      // Extract the last static segment to map label
      // e.g. '/gate/raw-materials' → 'raw-materials' → 'RM'
      const segments = route.path.split('/').filter(Boolean);
      const lastStatic = [...segments].reverse().find((s) => !s.startsWith(':'));
      if (lastStatic) {
        labels.set(lastStatic, route.breadcrumb.label);
      }
    }
  }

  return { navigablePaths, labels };
}

/**
 * Combine all module reducers into a single object for the root reducer
 */
export function getAllReducers(): Record<string, Reducer> {
  return moduleRegistry.reduce(
    (acc, m) => ({
      ...acc,
      ...m.reducer,
    }),
    {} as Record<string, Reducer>,
  );
}
