import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

import { API_CONFIG, API_ENDPOINTS, AUTH_CONFIG, HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env.config';
import { indexedDBService } from '@/core/auth/services/indexedDb.service';
import {
  refreshAccessToken,
  shouldRefreshToken as shouldProactivelyRefresh,
} from '@/core/auth/utils/tokenRefresh.util';

import type { ApiError } from './types';

declare module 'axios' {
  // Per-request opt-out of the global error toast (see response interceptor).
  // Used for background polls (e.g. sidebar count badges) whose failures should
  // not interrupt the user on every page.
  interface AxiosRequestConfig {
    suppressErrorToast?: boolean;
  }
}

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Promise-based lock for token refresh to prevent race conditions.
// When a refresh is in-flight, `refreshPromise` holds the pending Promise
// so concurrent callers await the same operation instead of triggering duplicates.
let refreshPromise: Promise<string> | null = null;

/**
 * Wait for auth initialization to complete
 */
export async function waitForAuthInitialization(): Promise<void> {
  if (isInitialized) return;
  if (initializationPromise) {
    return initializationPromise;
  }
  // If not initialized yet, return immediately (will be handled by interceptor)
  return Promise.resolve();
}

/**
 * Mark auth as initialized (called by AuthInitializer)
 */
export function markAuthInitialized(): void {
  isInitialized = true;
  initializationPromise = null;
}

/**
 * Set initialization promise (called by AuthInitializer)
 */
export function setInitializationPromise(promise: Promise<void>): void {
  initializationPromise = promise;
  promise.finally(() => {
    isInitialized = true;
  });
}

/**
 * Acquire a refreshed token, reusing an in-flight refresh if one exists.
 * This eliminates the race condition where multiple concurrent calls
 * could each trigger their own refresh request.
 */
async function acquireRefreshedToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performTokenRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Check if URL is an auth endpoint that should skip token handling
 * Only login and refresh endpoints should skip token (they don't need/use access token)
 *
 * @param url - The request URL to check
 * @returns True if token should be skipped for this endpoint
 */
function shouldSkipToken(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes(API_ENDPOINTS.AUTH.LOGIN) || url.includes(API_ENDPOINTS.AUTH.REFRESH);
}

/**
 * Perform token refresh using the shared utility
 *
 * @returns Promise resolving to the new access token
 * @throws Error if refresh fails
 */
async function performTokenRefresh(): Promise<string> {
  const result = await refreshAccessToken();

  if (!result.success || !result.access) {
    throw result.error || new Error('Token refresh failed');
  }

  return result.access;
}

/**
 * Walk a DRF error payload and collect every message under a dotted path.
 *
 * DRF nests as deeply as the serializer does: a `many=True` child serializer
 * answers with a list of per-row objects (`{"lines": [{"approved_qty": [msg]}]}`),
 * which a flat one-level read skips entirely — leaving the user with nothing but
 * axios' "Request failed with status code 400".
 */
function collectFieldErrors(
  value: unknown,
  path: string,
  into: Record<string, string[]>,
): void {
  if (value == null) return;

  if (typeof value === 'string') {
    (into[path] ??= []).push(value);
    return;
  }

  if (Array.isArray(value)) {
    // A list of plain strings is this field's own messages; a list of objects is
    // one entry per row, so keep the index to say WHICH row failed.
    if (value.every((item) => typeof item === 'string')) {
      if (value.length > 0) (into[path] ??= []).push(...(value as string[]));
      return;
    }
    value.forEach((item, index) => collectFieldErrors(item, `${path}[${index}]`, into));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      collectFieldErrors(child, path ? `${path}.${key}` : key, into);
    });
  }
}

/**
 * Extract field-level errors from API response data.
 * Handles nested {"errors": {...}}, flat {"field": ["error"]}, and the deeper
 * shapes DRF produces for nested/`many=True` serializers.
 */
function extractFieldErrors(
  responseData: Record<string, unknown> | undefined,
): Record<string, string[]> | undefined {
  if (!responseData) return undefined;

  const fieldErrors: Record<string, string[]> = {};

  if (responseData.errors && typeof responseData.errors === 'object') {
    collectFieldErrors(responseData.errors, '', fieldErrors);
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
  }

  Object.entries(responseData).forEach(([key, value]) => {
    if (key !== 'detail' && key !== 'message' && key !== 'errors' && key !== 'success') {
      collectFieldErrors(value, key, fieldErrors);
    }
  });
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

/** "lines[0].approved_qty" -> "lines #1 approved qty" — readable to a warehouse user. */
function humanizeFieldPath(field: string): string {
  return field
    .split('.')
    .filter((segment) => segment !== 'non_field_errors')
    .map((segment) =>
      segment.replaceAll('_', ' ').replace(/\[(\d+)\]/g, (_m, i) => ` #${Number(i) + 1}`),
    )
    .join(' ')
    .trim();
}

function formatFieldErrors(errors: Record<string, string[]>): string {
  return Object.entries(errors)
    .map(([field, messages]) => {
      const label = humanizeFieldPath(field);
      return label ? `${label}: ${messages.join(', ')}` : messages.join(', ');
    })
    .join(' | ');
}

/**
 * Extract a human-readable error message from API response data.
 * Checks 'detail' (Django REST), 'message', and 'error' fields.
 * Handles Python-style stringified lists (e.g., "['message']") and arrays.
 */
function extractErrorMessage(
  responseData: Record<string, unknown> | undefined,
  fallback: string = 'An error occurred',
): string {
  if (!responseData) return fallback;

  if (typeof responseData.detail === 'string') return responseData.detail;
  if (typeof responseData.message === 'string') return responseData.message;

  if (responseData.error) {
    const errValue = responseData.error;
    if (typeof errValue === 'string') {
      // Handle Python-style stringified lists: "['message']" or "['msg1', 'msg2']"
      const match = errValue.match(/^\[['"](.+?)['"]\]$/);
      return match ? match[1] : errValue;
    }
    if (Array.isArray(errValue) && errValue.length > 0) {
      return String(errValue[0]);
    }
  }

  const fieldErrors = extractFieldErrors(responseData);
  if (fieldErrors) return formatFieldErrors(fieldErrors);

  return fallback;
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiBaseUrl || API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token and proactively refresh if needed
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Skip token for login and refresh endpoints (they don't need/use access token)
      const skipToken = shouldSkipToken(config.url);

      if (!skipToken) {
        // Wait for initialization if not complete
        if (!isInitialized && initializationPromise) {
          await initializationPromise;
        }

        // Get token from IndexedDB
        const token = await indexedDBService.getAccessToken();

        if (token) {
          // Check if we should proactively refresh
          const shouldRefresh = await shouldProactivelyRefresh();

          if (shouldRefresh) {
            try {
              const newToken = await acquireRefreshedToken();
              config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${newToken}`;
            } catch {
              // Continue with existing token, will be caught by response interceptor
              config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`;
            }
          } else {
            config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`;
          }
        }

        // Add company code header if available. If the company selection cache is missing
        // but user data is present, restore the default active company so company-scoped
        // endpoints do not fail with "Company-Code header is missing".
        let currentCompany = await indexedDBService.getCurrentCompany();
        if (!currentCompany) {
          const user = await indexedDBService.getUser();
          currentCompany =
            user?.companies?.find((company) => company.is_default && company.is_active) ||
            user?.companies?.find((company) => company.is_active) ||
            user?.companies?.[0] ||
            null;

          if (currentCompany) {
            await indexedDBService.updateCurrentCompany(currentCompany);
          }
        }

        // Respect an explicit per-request Company-Code (e.g. a cross-company
        // lookup that must target a specific company); otherwise default to the
        // active company.
        if (currentCompany?.company_code && !config.headers['Company-Code']) {
          config.headers['Company-Code'] = currentCompany.company_code;
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor - handle errors and token refresh on 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 - try to refresh token
      if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
        // Skip refresh for login and refresh endpoints (they don't use access token)
        // But still transform the error to ApiError format for consistent error handling
        if (shouldSkipToken(originalRequest.url)) {
          const responseData = error.response?.data as Record<string, unknown> | undefined;
          const apiError: ApiError = {
            message: extractErrorMessage(responseData, error.message || 'Authentication failed'),
            code: error.code,
            errors: extractFieldErrors(responseData),
            status: error.response?.status || 401,
            response: {
              data: responseData,
              status: error.response?.status,
            },
          };
          return Promise.reject(apiError);
        }

        originalRequest._retry = true;

        try {
          // acquireRefreshedToken reuses an in-flight refresh if one exists,
          // so concurrent 401 responses all await the same refresh call.
          const newToken = await acquireRefreshedToken();
          originalRequest.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${newToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          // Clear IndexedDB
          await indexedDBService.clearAuthData();

          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle 403 - permission denied
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        // Permission denied - could redirect to unauthorized page or show notification
        // Error is logged via ApiError transformation below
      }

      // Transform error to ApiError format
      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const errorMessage = extractErrorMessage(responseData, error.message);

      const apiError: ApiError = {
        message: errorMessage,
        code: error.code,
        errors: extractFieldErrors(responseData),
        status: error.response?.status || 500,
        response: {
          data: responseData,
          status: error.response?.status,
        },
      };

      // Show global toast notification for API errors
      // Skip 401 (handled by token refresh/redirect), 404 (handled by page-level UI),
      // and any request that opted out via `suppressErrorToast` (background polls).
      const status = apiError.status;
      if (
        !originalRequest?.suppressErrorToast &&
        status !== HTTP_STATUS.UNAUTHORIZED &&
        status !== HTTP_STATUS.NOT_FOUND
      ) {
        toast.error(errorMessage);
      }

      return Promise.reject(apiError);
    },
  );

  return client;
}

export const apiClient = createApiClient();

/**
 * Setup periodic token refresh check
 * Call this on app initialization
 */
export function setupTokenRefreshInterval(): () => void {
  const intervalId = setInterval(async () => {
    const token = await indexedDBService.getAccessToken();
    if (!token) return;

    const shouldRefresh = await shouldProactivelyRefresh();
    if (shouldRefresh) {
      try {
        await acquireRefreshedToken();
      } catch {
        // Token refresh failed - will be handled on next API call
      }
    }
  }, AUTH_CONFIG.tokenCheckInterval);

  return () => clearInterval(intervalId);
}
