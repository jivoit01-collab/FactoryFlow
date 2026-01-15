import { useMemo, useCallback } from 'react'
import { useAppSelector } from '@/core/store'

/**
 * Hook for checking user permissions
 * Permissions are fetched from /auth/me and stored in IndexedDB
 * The Redux state is synced with IndexedDB on app load and after login
 */
export function usePermission() {
  const { permissions, user, currentCompany, permissionsLoaded } = useAppSelector(
    (state) => state.auth
  )

  /**
   * Check if user has a specific permission
   * Permission string format: 'app_label.permission_codename'
   * Example: 'gatein.add_gateinentry'
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Staff users have all permissions
      if (user?.is_staff) return true
      return permissions.includes(permission)
    },
    [permissions, user?.is_staff]
  )

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (user?.is_staff) return true
      return requiredPermissions.some((permission) => permissions.includes(permission))
    },
    [permissions, user?.is_staff]
  )

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (user?.is_staff) return true
      return requiredPermissions.every((permission) => permissions.includes(permission))
    },
    [permissions, user?.is_staff]
  )

  /**
   * Check if user has a specific role in the current company
   */
  const hasCompanyRole = useCallback(
    (role: string): boolean => {
      return currentCompany?.role === role
    },
    [currentCompany?.role]
  )

  /**
   * Check if user has any of the specified roles in the current company
   */
  const hasAnyCompanyRole = useCallback(
    (roles: string[]): boolean => {
      return currentCompany ? roles.includes(currentCompany.role) : false
    },
    [currentCompany]
  )

  /**
   * Check if user has a specific role in any of their companies
   */
  const hasRoleInAnyCompany = useCallback(
    (role: string): boolean => {
      return user?.companies.some((c) => c.role === role && c.is_active) ?? false
    },
    [user?.companies]
  )

  /**
   * Check permission for a specific action on a model
   * @param appLabel - Django app label (e.g., 'gatein')
   * @param action - Action type (e.g., 'add', 'view', 'change', 'delete')
   * @param model - Model name (e.g., 'gateinentry')
   */
  const canPerformAction = useCallback(
    (appLabel: string, action: string, model: string): boolean => {
      const permission = `${appLabel}.${action}_${model}`
      return hasPermission(permission)
    },
    [hasPermission]
  )

  /**
   * Check if user can view a specific model
   */
  const canView = useCallback(
    (appLabel: string, model: string): boolean => {
      return canPerformAction(appLabel, 'view', model)
    },
    [canPerformAction]
  )

  /**
   * Check if user can add a specific model
   */
  const canAdd = useCallback(
    (appLabel: string, model: string): boolean => {
      return canPerformAction(appLabel, 'add', model)
    },
    [canPerformAction]
  )

  /**
   * Check if user can change a specific model
   */
  const canChange = useCallback(
    (appLabel: string, model: string): boolean => {
      return canPerformAction(appLabel, 'change', model)
    },
    [canPerformAction]
  )

  /**
   * Check if user can delete a specific model
   */
  const canDelete = useCallback(
    (appLabel: string, model: string): boolean => {
      return canPerformAction(appLabel, 'delete', model)
    },
    [canPerformAction]
  )

  /**
   * Get permissions as a set for faster lookups
   */
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  return {
    // State
    permissions,
    permissionsLoaded,
    isStaff: user?.is_staff ?? false,
    currentCompany,
    companies: user?.companies ?? [],

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Company role checks
    hasCompanyRole,
    hasAnyCompanyRole,
    hasRoleInAnyCompany,

    // Action-based checks (Django style)
    canPerformAction,
    canView,
    canAdd,
    canChange,
    canDelete,

    // Set for custom checks
    permissionSet,
  }
}

/**
 * Hook for checking a single permission
 * Optimized for conditional rendering
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermission()
  return useMemo(() => hasPermission(permission), [hasPermission, permission])
}

/**
 * Hook for checking if user can perform an action on a model
 */
export function useCanPerformAction(appLabel: string, action: string, model: string): boolean {
  const { canPerformAction } = usePermission()
  return useMemo(
    () => canPerformAction(appLabel, action, model),
    [canPerformAction, appLabel, action, model]
  )
}
