import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/core/store'
import { AUTH_ROUTES } from '@/config/constants'
import { usePermission } from '../hooks/usePermission'

interface ProtectedRouteProps {
  children: ReactNode
  /** Required permissions (Django format: 'app_label.permission_codename') */
  permissions?: readonly string[]
  /** Required company roles */
  companyRoles?: readonly string[]
  /** If true, user must have ALL permissions/roles. If false (default), ANY grants access */
  requireAll?: boolean
}

/**
 * Route-level protection component
 * Redirects to login if not authenticated, or unauthorized if missing permissions
 *
 * @example
 * <Route
 *   path="/gate-in"
 *   element={
 *     <ProtectedRoute permissions={['gatein.view_gateinentry']}>
 *       <GateInPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export function ProtectedRoute({
  children,
  permissions,
  companyRoles,
  requireAll = false,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)
  const { hasAnyPermission, hasAllPermissions, hasAnyCompanyRole, permissionsLoaded } =
    usePermission()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.login} state={{ from: location }} replace />
  }

  // Wait for permissions to load
  if (!permissionsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Check company role access
  if (companyRoles && companyRoles.length > 0) {
    if (!hasAnyCompanyRole([...companyRoles])) {
      return <Navigate to={AUTH_ROUTES.unauthorized} replace />
    }
  }

  // Check permission access
  if (permissions && permissions.length > 0) {
    const hasPermissionAccess = requireAll
      ? hasAllPermissions([...permissions])
      : hasAnyPermission([...permissions])

    if (!hasPermissionAccess) {
      return <Navigate to={AUTH_ROUTES.unauthorized} replace />
    }
  }

  return <>{children}</>
}
