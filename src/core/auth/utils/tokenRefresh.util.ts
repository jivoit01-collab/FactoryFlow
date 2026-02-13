import { authService } from '../services/auth.service';
import { indexedDBService } from '../services/indexedDb.service';
import type { RefreshTokenResponse } from '../types/auth.types';

/**
 * Result of a token refresh operation
 */
export interface TokenRefreshResult {
  success: boolean;
  access: string;
  refresh: string;
  error?: Error;
}

/**
 * Checks if the access token is completely expired
 *
 * @returns Promise resolving to true if token is completely expired
 */
export async function isTokenCompletelyExpired(): Promise<boolean> {
  return indexedDBService.isTokenExpiredCompletely();
}

/**
 * Checks if the access token is close to expiry and should be refreshed
 *
 * @returns Promise resolving to true if token should be refreshed
 */
export async function shouldRefreshToken(): Promise<boolean> {
  return indexedDBService.isTokenExpired();
}

/**
 * Attempts to refresh the access token using the refresh token from IndexedDB
 *
 * This function:
 * 1. Retrieves the refresh token from IndexedDB
 * 2. Calls the refresh token API endpoint
 * 3. Updates tokens in IndexedDB
 * 4. Returns the new tokens or an error
 *
 * @returns Promise resolving to TokenRefreshResult with success status and tokens
 *
 * @example
 * ```ts
 * const result = await refreshAccessToken()
 * if (result.success) {
 *   // Use result.access and result.refresh
 * } else {
 *   // Handle error: result.error
 * }
 * ```
 */
export async function refreshAccessToken(): Promise<TokenRefreshResult> {
  try {
    const refresh = await indexedDBService.getRefreshToken();

    if (!refresh) {
      return {
        success: false,
        access: '',
        refresh: '',
        error: new Error('No refresh token available'),
      };
    }

    const response: RefreshTokenResponse = await authService.refreshToken(refresh);

    return {
      success: true,
      access: response.access,
      refresh: response.refresh,
    };
  } catch (error) {
    return {
      success: false,
      access: '',
      refresh: '',
      error: error instanceof Error ? error : new Error('Token refresh failed'),
    };
  }
}

/**
 * Validates and refreshes token if needed before making an API call
 *
 * This function:
 * 1. Checks if token is completely expired (clears data if so)
 * 2. Checks if token is close to expiry (refreshes if needed)
 * 3. Returns the current or refreshed access token
 *
 * @param onExpired - Callback to execute if token is completely expired
 * @returns Promise resolving to access token string, or null if expired
 *
 * @example
 * ```ts
 * const token = await ensureValidToken(async () => {
 *   await indexedDBService.clearAuthData()
 *   navigate('/login')
 * })
 * if (token) {
 *   // Make API call with token
 * }
 * ```
 */
export async function ensureValidToken(
  onExpired?: () => Promise<void> | void,
): Promise<string | null> {
  const access = await indexedDBService.getAccessToken();
  const refresh = await indexedDBService.getRefreshToken();

  if (!access || !refresh) {
    return null;
  }

  // Check if completely expired
  const isExpired = await isTokenCompletelyExpired();
  if (isExpired) {
    if (onExpired) {
      await onExpired();
    }
    return null;
  }

  // Check if close to expiry and refresh if needed
  const needsRefresh = await shouldRefreshToken();
  if (needsRefresh) {
    const result = await refreshAccessToken();
    if (result.success) {
      return result.access;
    } else {
      // Refresh failed, token might be invalid
      if (onExpired) {
        await onExpired();
      }
      return null;
    }
  }

  return access;
}
