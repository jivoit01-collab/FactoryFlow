export const AUTH_CONFIG = {
  // Storage keys
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  tokenExpiryKey: 'token_expiry',
  userKey: 'FMS_user',

  // Token timing
  sessionDuration: 7 * 60 * 1000, // 7 minutes default
  refreshThreshold: 60 * 1000, // 1 minute before expiry, start refresh
  tokenCheckInterval: 30 * 1000, // Check token every 30 seconds

  // Token format
  tokenPrefix: 'Bearer',

  // Permission refresh
  permissionRefreshInterval: 5 * 60 * 1000, // Refresh permissions every 5 minutes
} as const

export const AUTH_ROUTES = {
  login: '/login',
  logout: '/logout',
  unauthorized: '/unauthorized',
} as const

/**
 * Permission string format from Django
 * Format: app_label.permission_codename
 * Example: 'gatein.add_gateinentry', 'gatein.view_gateinentry'
 */
export const PERMISSION_ACTIONS = {
  ADD: 'add',
  VIEW: 'view',
  CHANGE: 'change',
  DELETE: 'delete',
} as const

/**
 * Helper to build Django permission string
 */
export function buildPermissionString(appLabel: string, action: string, model: string): string {
  return `${appLabel}.${action}_${model}`
}
