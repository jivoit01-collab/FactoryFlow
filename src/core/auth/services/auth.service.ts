import { API_ENDPOINTS, AUTH_CONFIG } from '@/config/constants'
import { apiClient } from '@/core/api'
import {
  validateLoginResponse,
  validateRefreshTokenResponse,
  validateUserResponse,
} from '@/core/api/utils/validation.util'

import type {
  LoginCredentials,
  LoginResponse,
  MeResponse,
  RefreshTokenResponse,
  User,
  UserCompany,
} from '../types/auth.types'
import { type AuthData, indexedDBService } from './indexedDb.service'

const SECONDS_TO_MS = 1000
function secondsToMs(seconds: number): number {
  return seconds * SECONDS_TO_MS
}

export const authService = {
  /**
   * Login with credentials
   *
   * Validates the response structure and stores tokens and user data in IndexedDB.
   *
   * @param credentials - Login credentials (email and password)
   * @returns Promise resolving to LoginResponse with tokens and user data
   * @throws Error if login fails or response is invalid
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials)

    // Validate response structure
    const data = validateLoginResponse(response.data)

    // Calculate token expiry using tokensExpiresIn from API
    const accessExpiresAt = Date.now() + secondsToMs(data.tokensExpiresIn.access_expires_in)
    const refreshExpiresAt = Date.now() + secondsToMs(data.tokensExpiresIn.refresh_expires_in)

    // Store in IndexedDB with expiry timestamps
    await indexedDBService.saveAuthDataLogin({
      id: AUTH_CONFIG.userKey,
      user: data.user,
      access: data.access,
      refresh: data.refresh,
      accessExpiresAt,
      refreshExpiresAt,
    })

    return data
  },

  /**
   * Logout - clear all stored data
   */
  async logout(): Promise<void> {
    await indexedDBService.clearAuthData()
  },

  /**
   * Refresh access token using the provided refresh token
   *
   * Validates the response structure and updates tokens in IndexedDB.
   *
   * @param refresh - The refresh token to use for refreshing
   * @returns Promise resolving to RefreshTokenResponse with new access and refresh tokens
   * @throws Error if refresh fails or response is invalid
   */
  async refreshToken(refresh: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
      refresh,
    })

    // Validate response structure
    const data = validateRefreshTokenResponse(response.data)

    // Calculate new token expiry using tokensExpiresIn from API
    const accessExpiresAt = Date.now() + secondsToMs(data.tokensExpiresIn.access_expires_in)
    const refreshExpiresAt = Date.now() + secondsToMs(data.tokensExpiresIn.refresh_expires_in)

    // Update IndexedDB
    await indexedDBService.updateTokens(
      data.access,
      data.refresh,
      accessExpiresAt,
      refreshExpiresAt
    )

    return data
  },

  /**
   * Get current user data from /auth/me endpoint
   *
   * Validates the response structure and updates user data in IndexedDB.
   * The response includes all permissions in the user object.
   *
   * @returns Promise resolving to User object with permissions and companies
   * @throws Error if request fails or response is invalid
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<MeResponse>(API_ENDPOINTS.AUTH.ME)

    // Validate response structure
    const user = validateUserResponse(response.data)

    // Update user and permissions in IndexedDB
    await indexedDBService.updateUser(user)

    return user
  },

  /**
   * Get cached permissions from IndexedDB
   */
  async getCachedPermissions(): Promise<string[]> {
    return indexedDBService.getPermissions()
  },

  /**
   * Get cached user from IndexedDB
   */
  async getCachedUser(): Promise<User | null> {
    return indexedDBService.getUser()
  },

  /**
   * Get cached auth data from IndexedDB
   */
  async getCachedAuthData() {
    return indexedDBService.getAuthData()
  },

  /**
   * Check if token is about to expire (within refresh threshold)
   */
  async shouldRefreshToken(): Promise<boolean> {
    return indexedDBService.isTokenExpired()
  },

  /**
   * Check if token is completely expired
   */
  async isTokenExpired(): Promise<boolean> {
    return indexedDBService.isTokenExpiredCompletely()
  },

  /**
   * Initialize auth state from IndexedDB on app load
   */
  async initializeFromCache(): Promise<{
    user: User | null
    permissions: string[]
    currentCompany: UserCompany | null
    access: string | null
    refresh: string | null
    expiresIn: number | null
    isAuthenticated: boolean
  } | null> {
    const authData = await indexedDBService.getAuthData()

    if (!authData) {
      return null
    }

    // Check if token is completely expired
    const isExpired = await indexedDBService.isTokenExpiredCompletely()
    if (isExpired) {
      // Clear expired data
      await indexedDBService.clearAuthData()
      return null
    }

    return {
      user: (authData as AuthData).user,
      permissions: (authData as AuthData).permissions,
      currentCompany: (authData as AuthData).currentCompany,
      access: authData.access,
      refresh: authData.refresh,
      expiresIn: authData.accessExpiresAt,
      isAuthenticated: true,
    }
  },

  /**
   * Switch the current company
   */
  async switchCompany(company: UserCompany): Promise<void> {
    await indexedDBService.updateCurrentCompany(company)
  },

  /**
   * Change user password
   *
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @returns Promise resolving to success message
   * @throws Error if password change fails
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    // Create URLSearchParams for x-www-form-urlencoded format
    const params = new URLSearchParams()
    params.append('old_password', oldPassword)
    params.append('new_password', newPassword)

    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return response.data
  },
}
