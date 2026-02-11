import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// auth/services/auth.service.ts — File Content Verification
//
// auth.service imports apiClient (axios + sonner + env deps),
// indexedDBService (IndexedDB), and validation utils — deep
// transitive chain. Verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/services/auth.service.ts'),
    'utf-8',
  )
}

describe('auth/services/auth.service.ts', () => {
  // ═══════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════

  it('imports apiClient from @/core/api', () => {
    const content = readSource()
    expect(content).toContain("import { apiClient } from '@/core/api'")
  })

  it('imports API_ENDPOINTS and AUTH_CONFIG from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('API_ENDPOINTS')
    expect(content).toContain('AUTH_CONFIG')
    expect(content).toContain("from '@/config/constants'")
  })

  it('imports types from ../types/auth.types', () => {
    const content = readSource()
    expect(content).toContain('LoginCredentials')
    expect(content).toContain('LoginResponse')
    expect(content).toContain('RefreshTokenResponse')
    expect(content).toContain('MeResponse')
    expect(content).toContain('User')
    expect(content).toContain('UserCompany')
    expect(content).toContain("from '../types/auth.types'")
  })

  it('imports indexedDBService and AuthData from indexedDb.service', () => {
    const content = readSource()
    expect(content).toContain('indexedDBService')
    expect(content).toContain('AuthData')
    expect(content).toContain("from './indexedDb.service'")
  })

  it('imports validation utils from @/core/api/utils/validation.util', () => {
    const content = readSource()
    expect(content).toContain('validateLoginResponse')
    expect(content).toContain('validateRefreshTokenResponse')
    expect(content).toContain('validateUserResponse')
    expect(content).toContain("from '@/core/api/utils/validation.util'")
  })

  // ═══════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════

  it('exports authService as const object', () => {
    const content = readSource()
    expect(content).toMatch(/export const authService\s*=\s*\{/)
  })

  // ═══════════════════════════════════════════════════════════
  // Methods
  // ═══════════════════════════════════════════════════════════

  // ─── login ──────────────────────────────────────────────────

  it('has login method that posts to AUTH.LOGIN', () => {
    const content = readSource()
    expect(content).toContain('async login(credentials: LoginCredentials)')
    expect(content).toContain('API_ENDPOINTS.AUTH.LOGIN')
  })

  it('login calls validateLoginResponse', () => {
    const content = readSource()
    expect(content).toContain('validateLoginResponse(response.data)')
  })

  it('login stores auth data via saveAuthDataLogin', () => {
    const content = readSource()
    expect(content).toContain('indexedDBService.saveAuthDataLogin')
  })

  // ─── logout ─────────────────────────────────────────────────

  it('has logout method that clears auth data', () => {
    const content = readSource()
    expect(content).toContain('async logout()')
    expect(content).toContain('indexedDBService.clearAuthData()')
  })

  // ─── refreshToken ───────────────────────────────────────────

  it('has refreshToken method that posts to AUTH.REFRESH', () => {
    const content = readSource()
    expect(content).toContain('async refreshToken(refresh: string)')
    expect(content).toContain('API_ENDPOINTS.AUTH.REFRESH')
  })

  it('refreshToken calls validateRefreshTokenResponse', () => {
    const content = readSource()
    expect(content).toContain('validateRefreshTokenResponse(response.data)')
  })

  it('refreshToken updates tokens via indexedDBService.updateTokens', () => {
    const content = readSource()
    expect(content).toContain('indexedDBService.updateTokens')
  })

  // ─── getCurrentUser ─────────────────────────────────────────

  it('has getCurrentUser method that calls AUTH.ME', () => {
    const content = readSource()
    expect(content).toContain('async getCurrentUser()')
    expect(content).toContain('API_ENDPOINTS.AUTH.ME')
  })

  it('getCurrentUser calls validateUserResponse', () => {
    const content = readSource()
    expect(content).toContain('validateUserResponse(response.data)')
  })

  // ─── Cache methods ──────────────────────────────────────────

  it('has getCachedPermissions that delegates to indexedDBService.getPermissions', () => {
    const content = readSource()
    expect(content).toContain('async getCachedPermissions()')
    expect(content).toContain('indexedDBService.getPermissions()')
  })

  it('has getCachedUser that delegates to indexedDBService.getUser', () => {
    const content = readSource()
    expect(content).toContain('async getCachedUser()')
    expect(content).toContain('indexedDBService.getUser()')
  })

  it('has getCachedAuthData that delegates to indexedDBService.getAuthData', () => {
    const content = readSource()
    expect(content).toContain('async getCachedAuthData()')
    expect(content).toContain('indexedDBService.getAuthData()')
  })

  // ─── Token check methods ───────────────────────────────────

  it('has shouldRefreshToken that delegates to isTokenExpired', () => {
    const content = readSource()
    expect(content).toContain('async shouldRefreshToken()')
    expect(content).toContain('indexedDBService.isTokenExpired()')
  })

  it('has isTokenExpired that delegates to isTokenExpiredCompletely', () => {
    const content = readSource()
    expect(content).toContain('async isTokenExpired()')
    expect(content).toContain('indexedDBService.isTokenExpiredCompletely()')
  })

  // ─── initializeFromCache ───────────────────────────────────

  it('has initializeFromCache that returns auth state or null', () => {
    const content = readSource()
    expect(content).toContain('async initializeFromCache()')
    expect(content).toContain('isAuthenticated: true')
  })

  // ─── switchCompany ─────────────────────────────────────────

  it('has switchCompany that delegates to updateCurrentCompany', () => {
    const content = readSource()
    expect(content).toContain('async switchCompany(company: UserCompany)')
    expect(content).toContain('indexedDBService.updateCurrentCompany(company)')
  })

  // ─── changePassword ────────────────────────────────────────

  it('has changePassword method using URLSearchParams', () => {
    const content = readSource()
    expect(content).toContain('async changePassword(oldPassword: string, newPassword: string)')
    expect(content).toContain('new URLSearchParams()')
  })

  it('changePassword posts to AUTH.CHANGE_PASSWORD', () => {
    const content = readSource()
    expect(content).toContain('API_ENDPOINTS.AUTH.CHANGE_PASSWORD')
  })

  it('changePassword sends x-www-form-urlencoded content type', () => {
    const content = readSource()
    expect(content).toContain('application/x-www-form-urlencoded')
  })
})
