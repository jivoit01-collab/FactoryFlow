import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateLoginResponse,
  validateRefreshTokenResponse,
  validateUserResponse,
} from '@/core/api/utils/validation.util'

// ═══════════════════════════════════════════════════════════════
// Validation Utils (src/core/api/utils/validation.util.ts) — Direct Import
//
// Only imports auth.types (pure TS). Fully testable directly.
// ═══════════════════════════════════════════════════════════════

describe('Validation Utils', () => {
  // ─── ValidationError ──────────────────────────────────────

  describe('ValidationError', () => {
    it('extends Error', () => {
      const err = new ValidationError('test')
      expect(err).toBeInstanceOf(Error)
    })

    it('has name "ValidationError"', () => {
      const err = new ValidationError('test')
      expect(err.name).toBe('ValidationError')
    })

    it('stores message', () => {
      const err = new ValidationError('bad data')
      expect(err.message).toBe('bad data')
    })

    it('stores optional field', () => {
      const err = new ValidationError('bad', 'email')
      expect(err.field).toBe('email')
    })

    it('field is undefined when not provided', () => {
      const err = new ValidationError('bad')
      expect(err.field).toBeUndefined()
    })
  })

  // ─── validateLoginResponse ────────────────────────────────

  describe('validateLoginResponse', () => {
    const validData = {
      user: { id: 1, email: 'a@b.com', full_name: 'Test', companies: [] },
      access: 'access-tok',
      refresh: 'refresh-tok',
      token: { access_expires_in: 300, refresh_expires_in: 86400 },
    }

    it('returns valid LoginResponse for correct data', () => {
      const result = validateLoginResponse(validData)
      expect(result.user.id).toBe(1)
      expect(result.user.email).toBe('a@b.com')
      expect(result.access).toBe('access-tok')
      expect(result.refresh).toBe('refresh-tok')
      expect(result.tokensExpiresIn.access_expires_in).toBe(300)
      expect(result.tokensExpiresIn.refresh_expires_in).toBe(86400)
    })

    it('maps user.full_name to empty string when missing', () => {
      const data = { ...validData, user: { id: 1, email: 'a@b.com' } }
      const result = validateLoginResponse(data)
      expect(result.user.full_name).toBe('')
    })

    it('maps user.companies to empty array when missing', () => {
      const data = { ...validData, user: { id: 1, email: 'a@b.com' } }
      const result = validateLoginResponse(data)
      expect(result.user.companies).toEqual([])
    })

    it('throws when data is null', () => {
      expect(() => validateLoginResponse(null)).toThrow(ValidationError)
    })

    it('throws when data is not an object', () => {
      expect(() => validateLoginResponse('string')).toThrow(ValidationError)
    })

    it('throws when user is missing', () => {
      expect(() => validateLoginResponse({ access: 'a', refresh: 'r', token: {} })).toThrow(
        'must include a user object',
      )
    })

    it('throws when user.id is invalid', () => {
      const data = { ...validData, user: { id: 'not-number', email: 'a@b.com' } }
      expect(() => validateLoginResponse(data)).toThrow('User ID must be a valid number')
    })

    it('throws when user.email is empty', () => {
      const data = { ...validData, user: { id: 1, email: '' } }
      expect(() => validateLoginResponse(data)).toThrow('User email must be a non-empty string')
    })

    it('throws when access token is missing', () => {
      const data = { ...validData, access: '' }
      expect(() => validateLoginResponse(data)).toThrow('Access token must be a non-empty string')
    })

    it('throws when refresh token is missing', () => {
      const data = { ...validData, refresh: '' }
      expect(() => validateLoginResponse(data)).toThrow('Refresh token must be a non-empty string')
    })

    it('throws when token object is missing', () => {
      const { token: _, ...noToken } = validData
      expect(() => validateLoginResponse(noToken)).toThrow('must include a token object')
    })

    it('throws when access_expires_in is invalid', () => {
      const data = { ...validData, token: { access_expires_in: 'bad', refresh_expires_in: 1 } }
      expect(() => validateLoginResponse(data)).toThrow('access_expires_in must be a valid number')
    })

    it('throws when refresh_expires_in is invalid', () => {
      const data = { ...validData, token: { access_expires_in: 1, refresh_expires_in: NaN } }
      expect(() => validateLoginResponse(data)).toThrow('refresh_expires_in must be a valid number')
    })

    it('thrown error has field property', () => {
      try {
        validateLoginResponse({ access: '', refresh: 'r', user: { id: 1, email: 'a@b.com' }, token: {} })
      } catch (e) {
        expect((e as ValidationError).field).toBe('access')
      }
    })
  })

  // ─── validateRefreshTokenResponse ─────────────────────────

  describe('validateRefreshTokenResponse', () => {
    const validData = {
      access: 'new-access',
      refresh: 'new-refresh',
      token: { access_expires_in: 300, refresh_expires_in: 86400 },
    }

    it('returns valid RefreshTokenResponse for correct data', () => {
      const result = validateRefreshTokenResponse(validData)
      expect(result.access).toBe('new-access')
      expect(result.refresh).toBe('new-refresh')
      expect(result.tokensExpiresIn.access_expires_in).toBe(300)
    })

    it('throws when data is null', () => {
      expect(() => validateRefreshTokenResponse(null)).toThrow(ValidationError)
    })

    it('throws when access is missing', () => {
      expect(() => validateRefreshTokenResponse({ ...validData, access: '' })).toThrow(
        'Access token',
      )
    })

    it('throws when refresh is missing', () => {
      expect(() => validateRefreshTokenResponse({ ...validData, refresh: '' })).toThrow(
        'Refresh token',
      )
    })

    it('throws when token object is missing', () => {
      const { token: _, ...noToken } = validData
      expect(() => validateRefreshTokenResponse(noToken)).toThrow('must include a token object')
    })

    it('throws when access_expires_in is invalid', () => {
      const data = { ...validData, token: { access_expires_in: Infinity, refresh_expires_in: 1 } }
      expect(() => validateRefreshTokenResponse(data)).toThrow('access_expires_in')
    })
  })

  // ─── validateUserResponse ─────────────────────────────────

  describe('validateUserResponse', () => {
    const validData = {
      id: 1,
      email: 'user@test.com',
      full_name: 'Test User',
      employee_code: 'EMP001',
      is_active: true,
      is_staff: false,
      date_joined: '2024-01-01',
      companies: [],
      permissions: ['view_gate'],
    }

    it('returns valid User for correct data', () => {
      const result = validateUserResponse(validData)
      expect(result.id).toBe(1)
      expect(result.email).toBe('user@test.com')
      expect(result.full_name).toBe('Test User')
      expect(result.permissions).toEqual(['view_gate'])
    })

    it('defaults employee_code to empty string when missing', () => {
      const data = { ...validData, employee_code: undefined }
      const result = validateUserResponse(data)
      expect(result.employee_code).toBe('')
    })

    it('converts is_active to boolean', () => {
      const data = { ...validData, is_active: 0 }
      const result = validateUserResponse(data)
      expect(result.is_active).toBe(false)
    })

    it('throws when data is null', () => {
      expect(() => validateUserResponse(null)).toThrow('User response must be an object')
    })

    it('throws when id is invalid', () => {
      expect(() => validateUserResponse({ ...validData, id: 'bad' })).toThrow('User ID')
    })

    it('throws when email is empty', () => {
      expect(() => validateUserResponse({ ...validData, email: '' })).toThrow('User email')
    })

    it('throws when full_name is empty', () => {
      expect(() => validateUserResponse({ ...validData, full_name: '' })).toThrow('User full_name')
    })

    it('throws when permissions is not an array', () => {
      expect(() => validateUserResponse({ ...validData, permissions: 'not-array' })).toThrow(
        'permissions must be an array',
      )
    })

    it('throws when companies is not an array', () => {
      expect(() => validateUserResponse({ ...validData, companies: null })).toThrow(
        'companies must be an array',
      )
    })
  })
})
