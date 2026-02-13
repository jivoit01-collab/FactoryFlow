// Components
export { AuthInitializer } from './components/AuthInitializer';
export { Authorized, withAuthorization } from './components/Authorized';
export { ProtectedRoute } from './components/ProtectedRoute';

// Hooks
export { useAuth, useAuthInitializer } from './hooks/useAuth';
export { useCanPerformAction, useHasPermission, usePermission } from './hooks/usePermission';

// Services
export { authService } from './services/auth.service';
export { indexedDBService } from './services/indexedDb.service';

// Types
export type {
  AuthState,
  LoginCredentials,
  LoginResponse,
  MeResponse,
  RefreshTokenResponse,
  User,
  UserCompany,
} from './types/auth.types';
export {
  getActiveCompanies,
  getDefaultCompany,
  getPermissions,
  hasRoleInAnyCompany,
  hasRoleInCompany,
} from './types/auth.types';

// Store
export { default as authReducer } from './store/authSlice';
export {
  clearCurrentCompany,
  initializeAuth,
  initializeComplete,
  loginSuccess,
  logout,
  setLoading,
  setPermissionsLoading,
  switchCompany,
  updatePermissions,
  updateTokens,
  updateUser,
} from './store/authSlice';
