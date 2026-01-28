import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User, LoginResponse, UserCompany } from '../types/auth.types'
import { getPermissions, getDefaultCompany } from '../types/auth.types'

const initialState: AuthState = {
  user: null,
  permissions: [],
  currentCompany: null,
  access: '',
  refresh: '',
  expiresIn: 0,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check IndexedDB
  permissionsLoaded: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    /**
     * Initialize auth state from IndexedDB cache
     */
    initializeAuth: (
      state,
      action: PayloadAction<{
        user: User
        permissions: string[]
        currentCompany: UserCompany | null
        access: string
        refresh: string
        expiresIn: number
      }>
    ) => {
      const { user, permissions, currentCompany, access, refresh, expiresIn } = action.payload
      state.user = user
      state.permissions = permissions
      state.currentCompany = currentCompany
      state.access = access
      state.refresh = refresh
      state.expiresIn = expiresIn
      state.isAuthenticated = true
      state.isLoading = false
      state.permissionsLoaded = true
    },

    /**
     * Called after successful login
     * Note: permissionsLoaded is set to false because we need to fetch full user data from /auth/me
     * Note: currentCompany is not set here - user will select it on the company selection page
     * Note: user from login response (UserLogin) is stored temporarily until /auth/me provides full User data
     */
    loginSuccess: (state, action: PayloadAction<LoginResponse>) => {
      const { user, access, refresh, tokensExpiresIn } = action.payload

      // Store user from login response (UserLogin type - has id, email, full_name, companies)
      // This allows CompanySelectionPage to access user.companies
      // Full User data will be loaded from /auth/me in LoadingUserPage
      state.user = user as User // UserLogin is compatible with User (subset)
      state.currentCompany = null // Will be set after company selection
      state.access = access
      state.refresh = refresh
      // Use access_expires_in from API response (convert seconds to milliseconds)
      state.expiresIn = Date.now() + tokensExpiresIn.access_expires_in * 1000
      state.isAuthenticated = true
      state.isLoading = false
      state.permissionsLoaded = false // Will be set to true after /auth/me completes
    },

    /**
     * Update tokens after refresh
     * Note: expiresIn is accessExpiresAt, refreshExpiresAt should be calculated from tokensExpiresIn.refresh_expires_in in the calling code
     */
    updateTokens: (
      state,
      action: PayloadAction<{
        access: string
        refresh: string
        expiresIn: number
        refreshExpiresAt: number
      }>
    ) => {
      const { access, refresh, expiresIn } = action.payload

      state.access = access
      state.refresh = refresh
      state.expiresIn = expiresIn
    },

    /**
     * Update user data and permissions from /auth/me response
     */
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.permissions = getPermissions(action.payload)

      // Update current company if needed
      if (
        state.currentCompany &&
        !action.payload.companies.some((c) => c.company_id === state.currentCompany?.company_id)
      ) {
        // Current company no longer available, switch to default
        state.currentCompany = getDefaultCompany(action.payload)
      } else if (!state.currentCompany) {
        state.currentCompany = getDefaultCompany(action.payload)
      }

      state.permissionsLoaded = true
    },

    /**
     * Update permissions only
     */
    updatePermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload
      state.permissionsLoaded = true
    },

    /**
     * Switch current company
     */
    switchCompany: (state, action: PayloadAction<UserCompany>) => {
      state.currentCompany = action.payload
    },

    /**
     * Clear current company
     */
    clearCurrentCompany: (state) => {
      state.currentCompany = null
    },

    /**
     * Mark permissions as loading
     */
    setPermissionsLoading: (state) => {
      state.permissionsLoaded = false
    },

    /**
     * Logout - clear all state
     */
    logout: (state) => {
      state.user = null
      state.permissions = []
      state.currentCompany = null
      state.access = ''
      state.refresh = ''
      state.expiresIn = 0
      state.isAuthenticated = false
      state.isLoading = false
      state.permissionsLoaded = false
    },

    /**
     * Mark auth initialization as complete (no cached data)
     */
    initializeComplete: (state) => {
      state.isLoading = false
    },
  },
})

export const {
  setLoading,
  initializeAuth,
  loginSuccess,
  updateTokens,
  updateUser,
  updatePermissions,
  switchCompany,
  clearCurrentCompany,
  setPermissionsLoading,
  logout,
  initializeComplete,
} = authSlice.actions

export default authSlice.reducer
