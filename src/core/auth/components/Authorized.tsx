import type { ReactNode } from 'react'

import { usePermission } from '../hooks/usePermission'

interface AuthorizedProps {
  children: ReactNode
  /** Required permissions (Django format: 'app_label.permission_codename') */
  permissions?: string[]
  /** Required company roles */
  companyRoles?: string[]
  /** If true, user must have ALL permissions/roles. If false, ANY grants access */
  requireAll?: boolean
  /** Content to render if user doesn't have access */
  fallback?: ReactNode
}

/**
 * Component-level authorization guard
 * Renders children only if user has required permissions/roles
 *
 * @example
 * // User needs any of these permissions
 * <Authorized permissions={['gatein.add_gateinentry', 'gatein.change_gateinentry']}>
 *   <AddButton />
 * </Authorized>
 *
 * @example
 * // User needs ALL permissions
 * <Authorized permissions={['gatein.add_gateinentry', 'gatein.delete_gateinentry']} requireAll>
 *   <AdminPanel />
 * </Authorized>
 *
 * @example
 * // User needs to have a specific role in current company
 * <Authorized companyRoles={['Manager', 'Admin']}>
 *   <ManagerDashboard />
 * </Authorized>
 */
export function Authorized({
  children,
  permissions,
  companyRoles,
  requireAll = false,
  fallback = null,
}: AuthorizedProps) {
  const { hasAnyPermission, hasAllPermissions, hasAnyCompanyRole, permissionsLoaded } =
    usePermission()

  // Wait for permissions to load before making access decisions
  if (!permissionsLoaded) {
    return <>{fallback}</>
  }

  // Check company roles
  if (companyRoles && companyRoles.length > 0) {
    if (!hasAnyCompanyRole(companyRoles)) {
      return <>{fallback}</>
    }
  }

  // Check permissions
  if (permissions && permissions.length > 0) {
    const hasPermissionAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasPermissionAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

/**
 * HOC version of Authorized for wrapping components
 */
export function withAuthorization<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<AuthorizedProps, 'children'>
) {
  return function AuthorizedComponent(props: P) {
    return (
      <Authorized {...options}>
        <WrappedComponent {...props} />
      </Authorized>
    )
  }
}
