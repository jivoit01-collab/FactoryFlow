import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/core/store'
import { updateUser } from '@/core/auth'
import { authService } from '@/core/auth/services/auth.service'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import { AUTH_ROUTES } from '@/config/constants'
import { ROUTES } from '@/config/routes.config'
import { ensureValidToken } from '@/core/auth/utils/tokenRefresh.util'

/**
 * LoadingUserPage component
 * 
 * Fetches full user data from /auth/me endpoint after login.
 * Handles token validation, refresh, and error states.
 * 
 * This page is shown after login to ensure fresh user data and permissions
 * are loaded before navigating to the dashboard.
 */
export default function LoadingUserPage() {
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const loadingRef = useRef(false)

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return
    loadingRef.current = true

    /**
     * Validates token, refreshes if needed, and fetches user data
     */
    async function checkAndLoadUser() {
      try {
        // Ensure token is valid (checks expiry and refreshes if needed)
        const validToken = await ensureValidToken(async () => {
          await indexedDBService.clearAuthData()
          navigate(AUTH_ROUTES.login, { replace: true })
        })

        if (!validToken) {
          // Token expired or refresh failed, already redirected
          return
        }

        // Fetch full user data from /auth/me
        const userData = await authService.getCurrentUser()

        // Update Redux with full user data (this sets permissionsLoaded to true)
        dispatch(updateUser(userData))

        // Navigate to dashboard
        navigate(ROUTES.DASHBOARD.path, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user data')
        
        // If token is invalid (401), redirect to login
        if (
          err instanceof Error &&
          (err.message.includes('401') || err.message.includes('Unauthorized'))
        ) {
          await indexedDBService.clearAuthData()
          navigate(AUTH_ROUTES.login, { replace: true })
        } else {
          // Other errors - still navigate to dashboard after delay
          setTimeout(() => {
            navigate(ROUTES.DASHBOARD.path, { replace: true })
          }, 2000)
        }
      } finally {
        loadingRef.current = false
      }
    }

    checkAndLoadUser()
  }, [dispatch, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center">
          <p className="text-lg font-medium">Loading your account...</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we fetch your permissions and company information
          </p>
        </div>
        {error && (
          <div className="mt-4 max-w-md rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Error loading user data</p>
            <p className="text-xs text-destructive/80">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}
