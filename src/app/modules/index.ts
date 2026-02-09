import type { Reducer } from '@reduxjs/toolkit'
import type { ModuleConfig, ModuleNavItem, ModuleRoute } from '@/core/types'

// Module configuration imports
// Each module exports its own routes, navigation, and reducers
import { authModuleConfig } from '@/modules/auth/module.config'
import { dashboardModuleConfig } from '@/modules/dashboard/module.config'
import { gateModuleConfig } from '@/modules/gate/module.config'
import { qcModuleConfig } from '@/modules/qc/module.config'
import { grpoModuleConfig } from '@/modules/grpo/module.config'
import { notificationsModuleConfig } from '@/modules/notifications/module.config'

/**
 * Central registry of all feature modules
 * Each module exports its own configuration (routes, navigation, reducers)
 */
export const moduleRegistry: ModuleConfig[] = [
  authModuleConfig,
  dashboardModuleConfig,
  gateModuleConfig,
  qcModuleConfig,
  grpoModuleConfig,
  notificationsModuleConfig,
]

/**
 * Extract all routes from registered modules
 */
export function getAllRoutes(): ModuleRoute[] {
  return moduleRegistry.flatMap((m) => m.routes)
}

/**
 * Extract routes by layout type
 */
export function getRoutesByLayout(layout: 'auth' | 'main'): ModuleRoute[] {
  return getAllRoutes().filter((route) => {
    if (layout === 'auth') {
      return route.layout === 'auth'
    }
    // Default to main layout if not specified
    return route.layout !== 'auth'
  })
}

/**
 * Extract all navigation items from registered modules
 */
export function getAllNavigation(): ModuleNavItem[] {
  return moduleRegistry.flatMap((m) => m.navigation ?? [])
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
    {} as Record<string, Reducer>
  )
}
