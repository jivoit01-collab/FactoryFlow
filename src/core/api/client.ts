import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env.config'
import { API_CONFIG, HTTP_STATUS, AUTH_CONFIG, API_ENDPOINTS } from '@/config/constants'
import type { ApiError } from './types'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import { refreshAccessToken, shouldRefreshToken as shouldProactivelyRefresh } from '@/core/auth/utils/tokenRefresh.util'

let isRefreshing = false
let isInitialized = false
let initializationPromise: Promise<void> | null = null
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

/**
 * Wait for auth initialization to complete
 */
export async function waitForAuthInitialization(): Promise<void> {
  if (isInitialized) return
  if (initializationPromise) {
    return initializationPromise
  }
  // If not initialized yet, return immediately (will be handled by interceptor)
  return Promise.resolve()
}

/**
 * Mark auth as initialized (called by AuthInitializer)
 */
export function markAuthInitialized(): void {
  isInitialized = true
  initializationPromise = null
}

/**
 * Set initialization promise (called by AuthInitializer)
 */
export function setInitializationPromise(promise: Promise<void>): void {
  initializationPromise = promise
  promise.finally(() => {
    isInitialized = true
  })
}

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token!)
    }
  })
  failedQueue = []
}

/**
 * Check if URL is an auth endpoint that should skip token handling
 * Only login and refresh endpoints should skip token (they don't need/use access token)
 */

/**
 * Check if URL is an auth endpoint that should skip token handling
 * Only login and refresh endpoints should skip token (they don't need/use access token)
 * 
 * @param url - The request URL to check
 * @returns True if token should be skipped for this endpoint
 */
function shouldSkipToken(url: string | undefined): boolean {
  if (!url) return false
  return url.includes(API_ENDPOINTS.AUTH.LOGIN) || url.includes(API_ENDPOINTS.AUTH.REFRESH)
}

/**
 * Perform token refresh using the shared utility
 * 
 * @returns Promise resolving to the new access token
 * @throws Error if refresh fails
 */
async function performTokenRefresh(): Promise<string> {
  const result = await refreshAccessToken()
  
  if (!result.success || !result.access) {
    throw result.error || new Error('Token refresh failed')
  }

  return result.access
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiBaseUrl || API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor - add auth token and proactively refresh if needed
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Skip token for login and refresh endpoints (they don't need/use access token)
      const skipToken = shouldSkipToken(config.url)

      if (!skipToken) {
        // Wait for initialization if not complete
        if (!isInitialized && initializationPromise) {
          await initializationPromise
        }

        // Get token from IndexedDB
        const token = await indexedDBService.getAccessToken()

        if (token) {
          // Check if we should proactively refresh
          const shouldRefresh = await shouldProactivelyRefresh()

          if (shouldRefresh && !isRefreshing) {
            isRefreshing = true
            try {
              const newToken = await performTokenRefresh()
              config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${newToken}`
            } catch (error) {
              // Continue with existing token, will be caught by response interceptor
              config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`
            } finally {
              isRefreshing = false
            }
          } else {
            config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`
          }
        }

        // Add company code header if available
        const currentCompany = await indexedDBService.getCurrentCompany()
        if (currentCompany?.company_code) {
          config.headers['Company-Code'] = currentCompany.company_code
        }
      }

      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - handle errors and token refresh on 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      // Handle 401 - try to refresh token
      if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
        // Skip refresh for login and refresh endpoints (they don't use access token)
        // But still transform the error to ApiError format for consistent error handling
        if (shouldSkipToken(originalRequest.url)) {
          // Transform error to ApiError format before rejecting
          // Backend may return 'detail' (Django REST framework) or 'message' field
          const responseData = (error.response?.data as unknown) as Record<string, unknown> | undefined
          const apiError: ApiError = {
            message:
              (responseData?.detail as string) ||
              (responseData?.message as string) ||
              error.message ||
              'Authentication failed',
            code: error.code,
            errors: responseData?.errors as Record<string, string[]> | undefined,
            status: error.response?.status || 401,
          }
          return Promise.reject(apiError)
        }

        if (isRefreshing) {
          // Wait for ongoing refresh
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              originalRequest.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`
              return client(originalRequest)
            })
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const newToken = await performTokenRefresh()
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${newToken}`
          return client(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)

          // Clear IndexedDB
          await indexedDBService.clearAuthData()

          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // Handle 403 - permission denied
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        // Permission denied - could redirect to unauthorized page or show notification
        // Error is logged via ApiError transformation below
      }

      // Transform error to ApiError format
      // Check for both 'detail' (Django REST framework) and 'message' (custom API) fields
      const responseData = (error.response?.data as unknown) as Record<string, unknown> | undefined
      
      // Check if errors are nested under 'errors' key or directly on response data
      // Some APIs return: {"errors": {"name": ["error"]}}
      // Others return: {"name": ["error"]} directly
      let errors: Record<string, string[]> | undefined
      if (responseData?.errors && typeof responseData.errors === 'object') {
        errors = responseData.errors as Record<string, string[]>
      } else if (responseData) {
        // Check if response data itself contains field errors (flat structure)
        const fieldErrors: Record<string, string[]> = {}
        Object.entries(responseData).forEach(([key, value]) => {
          // Skip common error properties that aren't field errors
          if (key !== 'detail' && key !== 'message' && key !== 'errors' && key !== 'success') {
            if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
              fieldErrors[key] = value as string[]
            }
          }
        })
        if (Object.keys(fieldErrors).length > 0) {
          errors = fieldErrors
        }
      }
      
      const apiError: ApiError = {
        message:
          (responseData?.detail as string) ||
          (responseData?.message as string) ||
          error.message ||
          'An error occurred',
        code: error.code,
        errors: errors,
        status: error.response?.status || 500,
      }

      return Promise.reject(apiError)
    }
  )

  return client
}

export const apiClient = createApiClient()

/**
 * Setup periodic token refresh check
 * Call this on app initialization
 */
export function setupTokenRefreshInterval(): () => void {
  const intervalId = setInterval(async () => {
    const token = await indexedDBService.getAccessToken()
    if (!token) return

    const shouldRefresh = await shouldProactivelyRefresh()
    if (shouldRefresh && !isRefreshing) {
      isRefreshing = true
      try {
        await performTokenRefresh()
      } catch (error) {
        // Token refresh failed - will be handled on next API call
        // Error is silently logged to avoid console spam
      } finally {
        isRefreshing = false
      }
    }
  }, AUTH_CONFIG.tokenCheckInterval)

  return () => clearInterval(intervalId)
}
