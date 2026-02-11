import { describe, it, expect } from 'vitest'
import { AUTH_CONFIG, AUTH_ROUTES } from '@/config/constants/auth.constants'

// ═══════════════════════════════════════════════════════════════
// AUTH_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('AUTH_CONFIG', () => {
  // ─── Structure ───
  it('has all required storage keys', () => {
    expect(AUTH_CONFIG).toHaveProperty('tokenKey')
    expect(AUTH_CONFIG).toHaveProperty('refreshTokenKey')
    expect(AUTH_CONFIG).toHaveProperty('tokenExpiryKey')
    expect(AUTH_CONFIG).toHaveProperty('userKey')
  })

  it('has all required timing keys', () => {
    expect(AUTH_CONFIG).toHaveProperty('sessionDuration')
    expect(AUTH_CONFIG).toHaveProperty('refreshThreshold')
    expect(AUTH_CONFIG).toHaveProperty('tokenCheckInterval')
    expect(AUTH_CONFIG).toHaveProperty('permissionRefreshInterval')
  })

  // ─── Storage Keys ───
  it('tokenKey is "access_token"', () => {
    expect(AUTH_CONFIG.tokenKey).toBe('access_token')
  })

  it('refreshTokenKey is "refresh_token"', () => {
    expect(AUTH_CONFIG.refreshTokenKey).toBe('refresh_token')
  })

  it('tokenExpiryKey is "token_expiry"', () => {
    expect(AUTH_CONFIG.tokenExpiryKey).toBe('token_expiry')
  })

  it('userKey is "FMS_user"', () => {
    expect(AUTH_CONFIG.userKey).toBe('FMS_user')
  })

  // ─── Token Timing ───
  it('sessionDuration is 7 minutes (420000ms)', () => {
    expect(AUTH_CONFIG.sessionDuration).toBe(7 * 60 * 1000)
  })

  it('refreshThreshold is 1 minute (60000ms)', () => {
    expect(AUTH_CONFIG.refreshThreshold).toBe(60 * 1000)
  })

  it('tokenCheckInterval is 30 seconds (30000ms)', () => {
    expect(AUTH_CONFIG.tokenCheckInterval).toBe(30 * 1000)
  })

  it('permissionRefreshInterval is 5 minutes (300000ms)', () => {
    expect(AUTH_CONFIG.permissionRefreshInterval).toBe(5 * 60 * 1000)
  })

  // ─── Token Format ───
  it('tokenPrefix is "Bearer"', () => {
    expect(AUTH_CONFIG.tokenPrefix).toBe('Bearer')
  })
})

// ═══════════════════════════════════════════════════════════════
// AUTH_ROUTES
// ═══════════════════════════════════════════════════════════════

describe('AUTH_ROUTES', () => {
  it('has login, logout, and unauthorized route paths', () => {
    expect(AUTH_ROUTES).toHaveProperty('login')
    expect(AUTH_ROUTES).toHaveProperty('logout')
    expect(AUTH_ROUTES).toHaveProperty('unauthorized')
  })

  it('all route values are strings starting with "/"', () => {
    for (const [, value] of Object.entries(AUTH_ROUTES)) {
      expect(typeof value).toBe('string')
      expect(value).toMatch(/^\//)
    }
  })
})
