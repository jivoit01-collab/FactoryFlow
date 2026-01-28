import type { LoginResponse, RefreshTokenResponse, User } from '@/core/auth/types/auth.types'

/**
 * Validation error thrown when API response doesn't match expected structure
 */
export class ValidationError extends Error {
  public readonly field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

/**
 * Type guard to check if a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Type guard to check if a value is a valid number
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * Validates LoginResponse structure
 *
 * @param data - Data to validate
 * @returns Validated LoginResponse
 * @throws ValidationError if data is invalid
 */
export function validateLoginResponse(data: unknown): LoginResponse {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Login response must be an object')
  }

  const response = data as Record<string, unknown>

  // Validate user object
  if (!response.user || typeof response.user !== 'object') {
    throw new ValidationError('Login response must include a user object', 'user')
  }

  const user = response.user as Record<string, unknown>

  if (!isValidNumber(user.id)) {
    throw new ValidationError('User ID must be a valid number', 'user.id')
  }

  if (!isNonEmptyString(user.email)) {
    throw new ValidationError('User email must be a non-empty string', 'user.email')
  }

  // Validate tokens
  if (!isNonEmptyString(response.access)) {
    throw new ValidationError('Access token must be a non-empty string', 'access')
  }

  if (!isNonEmptyString(response.refresh)) {
    throw new ValidationError('Refresh token must be a non-empty string', 'refresh')
  }

  // Validate token object (API returns 'token', we map it to 'tokensExpiresIn')
  if (!response.token || typeof response.token !== 'object') {
    throw new ValidationError('Login response must include a token object', 'token')
  }

  const token = response.token as Record<string, unknown>

  if (!isValidNumber(token.access_expires_in)) {
    throw new ValidationError('access_expires_in must be a valid number', 'token.access_expires_in')
  }

  if (!isValidNumber(token.refresh_expires_in)) {
    throw new ValidationError(
      'refresh_expires_in must be a valid number',
      'token.refresh_expires_in'
    )
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: (user.full_name as string) || '',
      companies: Array.isArray(user.companies) ? user.companies : [],
    },
    access: response.access,
    refresh: response.refresh,
    tokensExpiresIn: {
      access_expires_in: token.access_expires_in,
      refresh_expires_in: token.refresh_expires_in,
    },
  }
}

/**
 * Validates RefreshTokenResponse structure
 *
 * @param data - Data to validate
 * @returns Validated RefreshTokenResponse
 * @throws ValidationError if data is invalid
 */
export function validateRefreshTokenResponse(data: unknown): RefreshTokenResponse {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Refresh token response must be an object')
  }

  const response = data as Record<string, unknown>

  if (!isNonEmptyString(response.access)) {
    throw new ValidationError('Access token must be a non-empty string', 'access')
  }

  if (!isNonEmptyString(response.refresh)) {
    throw new ValidationError('Refresh token must be a non-empty string', 'refresh')
  }

  // Validate token object (API returns 'token', we map it to 'tokensExpiresIn')
  if (!response.token || typeof response.token !== 'object') {
    throw new ValidationError('Refresh token response must include a token object', 'token')
  }

  const token = response.token as Record<string, unknown>

  if (!isValidNumber(token.access_expires_in)) {
    throw new ValidationError('access_expires_in must be a valid number', 'token.access_expires_in')
  }

  if (!isValidNumber(token.refresh_expires_in)) {
    throw new ValidationError(
      'refresh_expires_in must be a valid number',
      'token.refresh_expires_in'
    )
  }

  return {
    access: response.access,
    refresh: response.refresh,
    tokensExpiresIn: {
      access_expires_in: token.access_expires_in,
      refresh_expires_in: token.refresh_expires_in,
    },
  }
}

/**
 * Validates User object structure (from /auth/me endpoint)
 *
 * @param data - Data to validate
 * @returns Validated User
 * @throws ValidationError if data is invalid
 */
export function validateUserResponse(data: unknown): User {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('User response must be an object')
  }

  const user = data as Record<string, unknown>

  if (!isValidNumber(user.id)) {
    throw new ValidationError('User ID must be a valid number', 'id')
  }

  if (!isNonEmptyString(user.email)) {
    throw new ValidationError('User email must be a non-empty string', 'email')
  }

  if (!isNonEmptyString(user.full_name)) {
    throw new ValidationError('User full_name must be a non-empty string', 'full_name')
  }

  if (!Array.isArray(user.permissions)) {
    throw new ValidationError('User permissions must be an array', 'permissions')
  }

  if (!Array.isArray(user.companies)) {
    throw new ValidationError('User companies must be an array', 'companies')
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    employee_code: (user.employee_code as string) || '',
    is_active: Boolean(user.is_active),
    is_staff: Boolean(user.is_staff),
    date_joined: (user.date_joined as string) || '',
    companies: user.companies as User['companies'],
    permissions: user.permissions as string[],
  }
}
