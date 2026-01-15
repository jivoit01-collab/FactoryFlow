import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/core/store'
import {
  loginSuccess,
  logout as logoutAction,
  setLoading,
  initializeAuth,
  initializeComplete,
  updateUser,
  switchCompany as switchCompanyAction,
} from '../store/authSlice'
import { authService } from '../services/auth.service'
import { AUTH_ROUTES, AUTH_CONFIG } from '@/config/constants'
import type { LoginCredentials, UserCompany } from '../types/auth.types'

/**
 * Main authentication hook
 * Handles login, logout, session initialization, and permission syncing
 */
export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, permissions, currentCompany, permissionsLoaded } =
    useAppSelector((state) => state.auth)

  const permissionRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Login with credentials
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        dispatch(setLoading(true))
        const response = await authService.login(credentials)
        dispatch(loginSuccess(response))
        navigate('/')
        return { success: true }
      } catch (error) {
        dispatch(setLoading(false))
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Login failed',
        }
      }
    },
    [dispatch, navigate]
  )

  /**
   * Logout - clear all auth data
   */
  const logout = useCallback(async () => {
    // Clear permission refresh interval
    if (permissionRefreshIntervalRef.current) {
      clearInterval(permissionRefreshIntervalRef.current)
      permissionRefreshIntervalRef.current = null
    }

    try {
      await authService.logout()
    } catch {
      // Ignore logout API errors, still clear local state
    } finally {
      dispatch(logoutAction())
      navigate(AUTH_ROUTES.login)
    }
  }, [dispatch, navigate])

  /**
   * Refresh permissions from /auth/me endpoint
   */
  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const userData = await authService.getCurrentUser()
      dispatch(updateUser(userData))
    } catch (error) {
      console.error('Failed to refresh permissions:', error)
      // If 401, the interceptor will handle logout
    }
  }, [dispatch, isAuthenticated])

  /**
   * Initialize auth state from IndexedDB cache
   */
  const initializeFromCache = useCallback(async () => {
    try {
      const cachedAuth = await authService.initializeFromCache()

      if (cachedAuth && cachedAuth.isAuthenticated && cachedAuth.user) {
        dispatch(
          initializeAuth({
            user: cachedAuth.user,
            permissions: cachedAuth.permissions,
            currentCompany: cachedAuth.currentCompany,
            access: cachedAuth.access ?? '',
            refresh: cachedAuth.refresh ?? '',
            expiresIn: cachedAuth.expiresIn ?? 0,
          })
        )

        // Refresh permissions in background to get latest from server
        authService
          .getCurrentUser()
          .then((userData) => {
            dispatch(updateUser(userData))
          })
          .catch((error) => {
            console.warn('Failed to refresh permissions on init:', error)
          })
      } else {
        dispatch(initializeComplete())
      }
    } catch (error) {
      console.error('Failed to initialize from cache:', error)
      dispatch(initializeComplete())
    }
  }, [dispatch])

  /**
   * Switch current company
   */
  const switchCompany = useCallback(
    async (company: UserCompany) => {
      await authService.switchCompany(company)
      dispatch(switchCompanyAction(company))
    },
    [dispatch]
  )

  /**
   * Start periodic permission refresh
   */
  const startPermissionRefresh = useCallback(() => {
    // Clear any existing interval
    if (permissionRefreshIntervalRef.current) {
      clearInterval(permissionRefreshIntervalRef.current)
    }

    // Start new interval
    permissionRefreshIntervalRef.current = setInterval(() => {
      refreshPermissions()
    }, AUTH_CONFIG.permissionRefreshInterval)
  }, [refreshPermissions])

  /**
   * Stop periodic permission refresh
   */
  const stopPermissionRefresh = useCallback(() => {
    if (permissionRefreshIntervalRef.current) {
      clearInterval(permissionRefreshIntervalRef.current)
      permissionRefreshIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (permissionRefreshIntervalRef.current) {
        clearInterval(permissionRefreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    permissions,
    currentCompany,
    companies: user?.companies ?? [],
    permissionsLoaded,

    // Actions
    login,
    logout,
    refreshPermissions,
    initializeFromCache,
    switchCompany,
    startPermissionRefresh,
    stopPermissionRefresh,
  }
}

/**
 * Hook to initialize auth on app startup
 * Should be used in the root App component or a provider
 */
export function useAuthInitializer() {
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const { initializeFromCache, startPermissionRefresh, stopPermissionRefresh } = useAuth()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      initializeFromCache()
    }
  }, [initializeFromCache])

  // Start/stop permission refresh based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      startPermissionRefresh()
    } else {
      stopPermissionRefresh()
    }

    return () => {
      stopPermissionRefresh()
    }
  }, [isAuthenticated, startPermissionRefresh, stopPermissionRefresh])

  return null
}
