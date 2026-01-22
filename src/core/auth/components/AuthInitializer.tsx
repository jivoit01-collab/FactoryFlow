import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/core/store'
import { authService } from '../services/auth.service'
import { initializeComplete, loginSuccess, updateUser } from '../store/authSlice'
import { AUTH_CONFIG } from '@/config/constants'
import { ROUTES } from '@/config/routes.config'
import {
  setupTokenRefreshInterval,
  setInitializationPromise,
  markAuthInitialized,
} from '@/core/api/client'
import { indexedDBService } from '../services/indexedDb.service'
import { ensureValidToken, isTokenCompletelyExpired } from '../utils/tokenRefresh.util'

interface AuthInitializerProps {
  children: React.ReactNode
}

/**
 * Component that initializes auth state from IndexedDB on app load
 * and sets up periodic token and permission refresh
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)
  const initializedRef = useRef(false)
  const permissionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenIntervalCleanupRef = useRef<(() => void) | null>(null)
  
  // Capture the intended URL on initial load (before any redirects)
  const intendedUrlRef = useRef(location.pathname + location.search)

  // Initialize auth from IndexedDB on mount
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return
    initializedRef.current = true

    /**
     * Initialize authentication state from IndexedDB
     * Handles token validation, refresh, and navigation
     */
    async function initAuth() {
      const initPromise = (async () => {
        try {
          // Check if we have tokens in IndexedDB
          const access = await indexedDBService.getAccessToken()
          const refresh = await indexedDBService.getRefreshToken()
          const authData = await indexedDBService.getAuthData()

          // If we have tokens, validate and refresh if needed, then redirect to loading-user
          if (access && refresh && authData) {
            // Check if token is completely expired
            const isExpired = await isTokenCompletelyExpired()
            if (isExpired) {
              await indexedDBService.clearAuthData()
              dispatch(initializeComplete())
              markAuthInitialized()
              return
            }

            // Ensure token is valid (refreshes if close to expiry)
            const validToken = await ensureValidToken(async () => {
              await indexedDBService.clearAuthData()
            })

            if (!validToken) {
              // Token refresh failed or expired
              dispatch(initializeComplete())
              markAuthInitialized()
              return
            }

            // Get updated tokens after potential refresh
            const currentAccess = await indexedDBService.getAccessToken()
            const currentRefresh = await indexedDBService.getRefreshToken()

            if (!currentAccess || !currentRefresh) {
              dispatch(initializeComplete())
              markAuthInitialized()
              return
            }

            // Check if we have a current company set
            const currentCompany = await indexedDBService.getCurrentCompany()
            
            // Always redirect to loading-user page to fetch fresh user data from /auth/me
            // This ensures IndexedDB is updated with latest permissions and user data
            if (authData.user && 'id' in authData.user && 'email' in authData.user) {
              // Reconstruct tokensExpiresIn object from stored expiry timestamps
              // Calculate access_expires_in from stored expiry (convert milliseconds to seconds)
              const accessExpiresIn = Math.max(0, Math.floor((authData.accessExpiresAt - Date.now()) / 1000))
              // Calculate refresh_expires_in from stored expiry (convert milliseconds to seconds)
              const refreshExpiresIn = Math.max(0, Math.floor((authData.refreshExpiresAt - Date.now()) / 1000))

              dispatch(
                loginSuccess({
                  user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    full_name: authData.user.full_name || '',
                    companies: authData.user.companies || [],
                  },
                  access: currentAccess,
                  refresh: currentRefresh,
                  tokensExpiresIn: {
                    access_expires_in: accessExpiresIn,
                    refresh_expires_in: refreshExpiresIn,
                  },
                })
              )
            }

            dispatch(initializeComplete())
            markAuthInitialized()
            
            // If no current company, redirect to company selection
            // Otherwise, redirect to loading-user to fetch fresh data
            // Pass the intended URL so we can redirect back after loading
            const intendedUrl = intendedUrlRef.current
            if (!currentCompany) {
              navigate(ROUTES.COMPANY_SELECTION.path, { replace: true, state: { from: intendedUrl } })
            } else {
              navigate(ROUTES.LOADING_USER.path, { replace: true, state: { from: intendedUrl } })
            }
            return
          }

          // No tokens found, initialization complete
          dispatch(initializeComplete())
        } catch (error) {
          // Critical error during initialization
          dispatch(initializeComplete())
        } finally {
          markAuthInitialized()
        }
      })()

      // Set initialization promise for API client to wait on
      setInitializationPromise(initPromise)
      await initPromise
    }

    initAuth()
  }, [dispatch, navigate])

  // Setup token refresh interval when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Setup token refresh
      tokenIntervalCleanupRef.current = setupTokenRefreshInterval()

      // Setup permission refresh
      permissionIntervalRef.current = setInterval(async () => {
        try {
          const userData = await authService.getCurrentUser()
          dispatch(updateUser(userData))
        } catch (error) {
          // Permission refresh failed - will retry on next interval
          // Error is silently handled to avoid console spam
        }
      }, AUTH_CONFIG.permissionRefreshInterval)
    }

    return () => {
      if (tokenIntervalCleanupRef.current) {
        tokenIntervalCleanupRef.current()
        tokenIntervalCleanupRef.current = null
      }
      if (permissionIntervalRef.current) {
        clearInterval(permissionIntervalRef.current)
        permissionIntervalRef.current = null
      }
    }
  }, [isAuthenticated, isLoading, dispatch])

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
