import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AUTH_CONFIG } from '@/config/constants'
import { ROUTES } from '@/config/routes.config'
import {
  markAuthInitialized,
  setInitializationPromise,
  setupTokenRefreshInterval,
} from '@/core/api/client'
import { useAppDispatch, useAppSelector } from '@/core/store'

import { authService } from '../services/auth.service'
import { indexedDBService } from '../services/indexedDb.service'
import { initializeComplete, loginSuccess, updateUser } from '../store/authSlice'
import { ensureValidToken, isTokenCompletelyExpired } from '../utils/tokenRefresh.util'

interface AuthInitializerProps {
  children: React.ReactNode
}

/**
 * Validate stored tokens and return them if valid, or null if expired/missing.
 */
async function validateStoredTokens(): Promise<{
  access: string
  refresh: string
  authData: Awaited<ReturnType<typeof indexedDBService.getAuthData>>
} | null> {
  const access = await indexedDBService.getAccessToken()
  const refresh = await indexedDBService.getRefreshToken()
  const authData = await indexedDBService.getAuthData()

  if (!access || !refresh || !authData) return null

  const isExpired = await isTokenCompletelyExpired()
  if (isExpired) {
    await indexedDBService.clearAuthData()
    return null
  }

  const validToken = await ensureValidToken(async () => {
    await indexedDBService.clearAuthData()
  })
  if (!validToken) return null

  // Re-read tokens after potential refresh
  const currentAccess = await indexedDBService.getAccessToken()
  const currentRefresh = await indexedDBService.getRefreshToken()
  if (!currentAccess || !currentRefresh) return null

  return { access: currentAccess, refresh: currentRefresh, authData }
}

/**
 * Build the Redux loginSuccess payload from stored auth data.
 */
function buildAuthPayload(
  authData: NonNullable<Awaited<ReturnType<typeof indexedDBService.getAuthData>>>,
  access: string,
  refresh: string
) {
  if (!authData.user || !('id' in authData.user) || !('email' in authData.user)) return null

  const accessExpiresIn = Math.max(0, Math.floor((authData.accessExpiresAt - Date.now()) / 1000))
  const refreshExpiresIn = Math.max(0, Math.floor((authData.refreshExpiresAt - Date.now()) / 1000))

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      full_name: authData.user.full_name || '',
      companies: authData.user.companies || [],
    },
    access,
    refresh,
    tokensExpiresIn: {
      access_expires_in: accessExpiresIn,
      refresh_expires_in: refreshExpiresIn,
    },
  }
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
    if (initializedRef.current) return
    initializedRef.current = true

    async function initAuth() {
      const initPromise = (async () => {
        try {
          const stored = await validateStoredTokens()

          if (!stored) {
            dispatch(initializeComplete())
            markAuthInitialized()
            return
          }

          const payload = buildAuthPayload(stored.authData!, stored.access, stored.refresh)
          if (payload) {
            dispatch(loginSuccess(payload))
          }

          dispatch(initializeComplete())
          markAuthInitialized()

          // Navigate based on company state
          const currentCompany = await indexedDBService.getCurrentCompany()
          const intendedUrl = intendedUrlRef.current
          if (!currentCompany) {
            navigate(ROUTES.COMPANY_SELECTION.path, {
              replace: true,
              state: { from: intendedUrl },
            })
          } else {
            navigate(ROUTES.LOADING_USER.path, { replace: true, state: { from: intendedUrl } })
          }
        } catch {
          dispatch(initializeComplete())
        } finally {
          markAuthInitialized()
        }
      })()

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
        } catch {
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
