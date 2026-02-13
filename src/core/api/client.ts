import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

import { API_CONFIG, API_ENDPOINTS, AUTH_CONFIG, HTTP_STATUS } from '@/config/constants'
import { env } from '@/config/env.config'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import {
  refreshAccessToken,
  shouldRefreshToken as shouldProactivelyRefresh,
} from '@/core/auth/utils/tokenRefresh.util'

import type { ApiError } from './types'

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

/**
 * Extract field-level errors from API response data.
 * Handles both nested {"errors": {...}} and flat {"field": ["error"]} formats.
 */
function extractFieldErrors(
  responseData: Record<string, unknown> | undefined
): Record<string, string[]> | undefined {
  if (!responseData) return undefined

  if (responseData.errors && typeof responseData.errors === 'object') {
    return responseData.errors as Record<string, string[]>
  }

  const fieldErrors: Record<string, string[]> = {}
  Object.entries(responseData).forEach(([key, value]) => {
    if (key !== 'detail' && key !== 'message' && key !== 'errors' && key !== 'success') {
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        fieldErrors[key] = value as string[]
      }
    }
  })
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}

/**
 * Extract a human-readable error message from API response data.
 * Checks 'detail' (Django REST), 'message', and 'error' fields.
 * Handles Python-style stringified lists (e.g., "['message']") and arrays.
 */
function extractErrorMessage(
  responseData: Record<string, unknown> | undefined,
  fallback: string = 'An error occurred'
): string {
  if (!responseData) return fallback

  if (typeof responseData.detail === 'string') return responseData.detail
  if (typeof responseData.message === 'string') return responseData.message

  if (responseData.error) {
    const errValue = responseData.error
    if (typeof errValue === 'string') {
      // Handle Python-style stringified lists: "['message']" or "['msg1', 'msg2']"
      const match = errValue.match(/^\[['"](.+?)['"]\]$/)
      return match ? match[1] : errValue
    }
    if (Array.isArray(errValue) && errValue.length > 0) {
      return String(errValue[0])
    }
  }

  return fallback
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
            } catch {
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
          const responseData = error.response?.data as unknown as
            | Record<string, unknown>
            | undefined
          const apiError: ApiError = {
            message: extractErrorMessage(responseData, error.message || 'Authentication failed'),
            code: error.code,
            errors: extractFieldErrors(responseData),
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
      const responseData = error.response?.data as unknown as Record<string, unknown> | undefined
      const errorMessage = extractErrorMessage(responseData, error.message)

      const apiError: ApiError = {
        message: errorMessage,
        code: error.code,
        errors: extractFieldErrors(responseData),
        status: error.response?.status || 500,
      }

      // Show global toast notification for API errors
      // Skip 401 (handled by token refresh/redirect) and errors with only field-level errors
      const status = apiError.status
      if (status !== HTTP_STATUS.UNAUTHORIZED) {
        toast.error(errorMessage)
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
      } catch {
        // Token refresh failed - will be handled on next API call
        // Error is silently logged to avoid console spam
      } finally {
        isRefreshing = false
      }
    }
  }, AUTH_CONFIG.tokenCheckInterval)

  return () => clearInterval(intervalId)
}
