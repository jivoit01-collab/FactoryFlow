import type { Middleware } from '@reduxjs/toolkit';

import { AUTH_CONFIG } from '@/config/constants';

import { indexedDBService } from '../services/indexedDb.service';
import {
  clearCurrentCompany,
  loginSuccess,
  logout,
  switchCompany,
  updateTokens,
  updateUser,
} from './authSlice';

/**
 * Middleware to sync Redux auth state changes to IndexedDB
 *
 * This middleware automatically persists auth state changes to IndexedDB
 * whenever relevant Redux actions are dispatched. Errors are silently
 * handled to prevent middleware from breaking the action flow.
 *
 * Synced actions:
 * - loginSuccess: Saves login data with tokens
 * - updateTokens: Updates access and refresh tokens
 * - updateUser: Updates user data and permissions
 * - switchCompany: Updates current company
 * - clearCurrentCompany: Clears current company
 * - logout: Clears all auth data
 */
export const authSyncMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  // Sync to IndexedDB after action is dispatched
  if (loginSuccess.match(action)) {
    const { user, access, refresh, tokensExpiresIn } = action.payload;
    // Use tokensExpiresIn from API response (convert seconds to milliseconds)
    const accessExpiresAt = Date.now() + tokensExpiresIn.access_expires_in * 1000;
    const refreshExpiresAt = Date.now() + tokensExpiresIn.refresh_expires_in * 1000;

    // Save to IndexedDB with all required fields
    indexedDBService
      .saveAuthDataLogin({
        id: AUTH_CONFIG.userKey,
        user,
        access,
        refresh,
        accessExpiresAt,
        refreshExpiresAt,
      })
      .catch(() => {
        // Silently handle errors to prevent middleware from breaking action flow
        // In production, consider logging to error tracking service
      });
  } else if (updateTokens.match(action)) {
    const { access, refresh, expiresIn, refreshExpiresAt } = action.payload;

    // Update tokens in IndexedDB (expiresIn is accessExpiresAt, refreshExpiresAt is provided)
    indexedDBService.updateTokens(access, refresh, expiresIn, refreshExpiresAt).catch(() => {
      // Silently handle errors
    });
  } else if (updateUser.match(action)) {
    const user = action.payload;

    // Update user in IndexedDB
    indexedDBService.updateUser(user).catch(() => {
      // Silently handle errors
    });
  } else if (switchCompany.match(action)) {
    const company = action.payload;

    // Update current company in IndexedDB
    indexedDBService.updateCurrentCompany(company).catch(() => {
      // Silently handle errors
    });
  } else if (clearCurrentCompany.match(action)) {
    // Clear current company in IndexedDB
    indexedDBService.updateCurrentCompany(null).catch(() => {
      // Silently handle errors
    });
  } else if (logout.match(action)) {
    // Clear IndexedDB on logout
    indexedDBService.clearAuthData().catch(() => {
      // Silently handle errors
    });
  }

  return result;
};
