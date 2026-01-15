// Components
export { ProtectedRoute } from './components/ProtectedRoute'
export { Authorized, withAuthorization } from './components/Authorized'
export { AuthInitializer } from './components/AuthInitializer'

// Hooks
export { useAuth, useAuthInitializer } from './hooks/useAuth'
export { usePermission, useHasPermission, useCanPerformAction } from './hooks/usePermission'

// Services
export { authService } from './services/auth.service'
export { indexedDBService } from './services/indexedDb.service'

// Types
export type {
  User,
  UserCompany,
  AuthState,
  LoginCredentials,
  LoginResponse,
  MeResponse,
  RefreshTokenResponse,
} from './types/auth.types'
export {
  getPermissions,
  getDefaultCompany,
  getActiveCompanies,
  hasRoleInAnyCompany,
  hasRoleInCompany,
} from './types/auth.types'

// Store
export { default as authReducer } from './store/authSlice'
export {
  loginSuccess,
  logout,
  updateUser,
  updateTokens,
  updatePermissions,
  switchCompany,
  clearCurrentCompany,
  initializeAuth,
  initializeComplete,
  setLoading,
  setPermissionsLoading,
} from './store/authSlice'
