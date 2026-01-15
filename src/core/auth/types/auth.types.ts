/**
 * Company assignment for a user
 * Note: API returns company_name and company_code (single underscore)
 */
export interface UserCompany {
  company_id: number
  company_name: string
  company_code: string
  role: string
  is_default: boolean
  is_active: boolean
}

/**
 * User object from Django backend /auth/me endpoint
 */
export interface User {
  id: number
  email: string
  full_name: string
  employee_code: string
  is_active: boolean
  is_staff: boolean
  date_joined: string
  companies: UserCompany[]
  permissions: string[]
}

export interface UserLogin extends Pick<User, 'id' | 'email' | 'full_name' | 'companies'> {}

export interface AuthState {
  user: User | null
  permissions: string[]
  currentCompany: UserCompany | null
  access: string
  refresh: string
  expiresIn: number
  isAuthenticated: boolean
  isLoading: boolean
  permissionsLoaded: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Token expiry information from API
 * Values are in seconds
 */
export interface TokensExpiresIn {
  access_expires_in: number
  refresh_expires_in: number
}

/**
 * Response from login endpoint
 */
export interface LoginResponse {
  user: UserLogin
  access: string
  refresh: string
  tokensExpiresIn: TokensExpiresIn
}

/**
 * Response from refresh token endpoint
 */
export interface RefreshTokenResponse {
  access: string
  refresh: string
  tokensExpiresIn: TokensExpiresIn
}

/**
 * Response from /auth/me endpoint
 * The user object itself contains the permissions array
 */
export type MeResponse = User

/**
 * Get permissions from user object
 * Permissions are already flattened in the API response
 */
export function getPermissions(user: User): string[] {
  return user.permissions || []
}

/**
 * Get the default company for a user
 */
export function getDefaultCompany(user: UserLogin): UserCompany | null {
  return user.companies.find((c) => c.is_default) || user.companies[0] || null
}

/**
 * Get all active companies for a user
 */
export function getActiveCompanies(user: User): UserCompany[] {
  return user.companies.filter((c) => c.is_active)
}

/**
 * Check if user has a specific role in any company
 */
export function hasRoleInAnyCompany(user: User, role: string): boolean {
  return user.companies.some((c) => c.role === role && c.is_active)
}

/**
 * Check if user has a specific role in a specific company
 */
export function hasRoleInCompany(user: User, companyId: number, role: string): boolean {
  const company = user.companies.find((c) => c.company_id === companyId)
  return company?.role === role && company.is_active
}
