import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// auth/services/indexedDb.service.ts — File Content Verification
//
// indexedDb.service uses the IndexedDB browser API and imports
// from @/config/constants and auth types. Verify structure via
// readFileSync to avoid environment-specific issues.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/services/indexedDb.service.ts'),
    'utf-8',
  )
}

describe('auth/services/indexedDb.service.ts', () => {
  // ═══════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════

  it('imports AUTH_CONFIG from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain("import { AUTH_CONFIG } from '@/config/constants'")
  })

  it('imports types from ../types/auth.types', () => {
    const content = readSource()
    expect(content).toContain('User')
    expect(content).toContain('UserCompany')
    expect(content).toContain('UserLogin')
    expect(content).toContain("from '../types/auth.types'")
  })

  // ═══════════════════════════════════════════════════════════
  // Exported interfaces
  // ═══════════════════════════════════════════════════════════

  it('exports AuthDataLogin interface', () => {
    const content = readSource()
    expect(content).toMatch(/export interface AuthDataLogin/)
  })

  it('exports AuthData interface', () => {
    const content = readSource()
    expect(content).toMatch(/export interface AuthData/)
  })

  // ═══════════════════════════════════════════════════════════
  // Class and constants
  // ═══════════════════════════════════════════════════════════

  it('defines IndexedDBService class', () => {
    const content = readSource()
    expect(content).toContain('class IndexedDBService')
  })

  it('defines DB_NAME as factoryManagementDB', () => {
    const content = readSource()
    expect(content).toContain("const DB_NAME = 'factoryManagementDB'")
  })

  it('defines DB_VERSION as 1', () => {
    const content = readSource()
    expect(content).toContain('const DB_VERSION = 1')
  })

  it('defines AUTH_STORE as auth', () => {
    const content = readSource()
    expect(content).toContain("const AUTH_STORE = 'auth'")
  })

  // ═══════════════════════════════════════════════════════════
  // Methods
  // ═══════════════════════════════════════════════════════════

  // ─── Database access ───────────────────────────────────────

  it('has private getDB method', () => {
    const content = readSource()
    expect(content).toContain('private async getDB()')
  })

  // ─── Save methods ──────────────────────────────────────────

  it('has saveAuthDataLogin method', () => {
    const content = readSource()
    expect(content).toContain('async saveAuthDataLogin(data: AuthDataLogin)')
  })

  it('has saveAuthData method', () => {
    const content = readSource()
    expect(content).toMatch(/async saveAuthData\(data:/)
  })

  // ─── Read methods ──────────────────────────────────────────

  it('has getAuthData method', () => {
    const content = readSource()
    expect(content).toContain('async getAuthData()')
  })

  it('has getPermissions method', () => {
    const content = readSource()
    expect(content).toContain('async getPermissions()')
  })

  it('has getUser method', () => {
    const content = readSource()
    expect(content).toContain('async getUser()')
  })

  it('has getCurrentCompany method', () => {
    const content = readSource()
    expect(content).toContain('async getCurrentCompany()')
  })

  // ─── Update methods ────────────────────────────────────────

  it('has updateUser method', () => {
    const content = readSource()
    expect(content).toContain('async updateUser(user: User)')
  })

  it('has updatePermissions method', () => {
    const content = readSource()
    expect(content).toContain('async updatePermissions(permissions: string[])')
  })

  it('has updateCurrentCompany method', () => {
    const content = readSource()
    expect(content).toContain('async updateCurrentCompany(company: UserCompany | null)')
  })

  it('has updateTokens method with four parameters', () => {
    const content = readSource()
    expect(content).toMatch(/async updateTokens\(\s*access: string/)
  })

  // ─── Token expiry methods ─────────────────────────────────

  it('has getAccessTokenExpiry method', () => {
    const content = readSource()
    expect(content).toContain('async getAccessTokenExpiry()')
  })

  it('has getRefreshTokenExpiry method', () => {
    const content = readSource()
    expect(content).toContain('async getRefreshTokenExpiry()')
  })

  it('has getAccessToken method', () => {
    const content = readSource()
    expect(content).toContain('async getAccessToken()')
  })

  it('has getRefreshToken method', () => {
    const content = readSource()
    expect(content).toContain('async getRefreshToken()')
  })

  // ─── Cleanup ───────────────────────────────────────────────

  it('has clearAuthData method', () => {
    const content = readSource()
    expect(content).toContain('async clearAuthData()')
  })

  // ─── Token state checks ────────────────────────────────────

  it('has isTokenExpired method using refreshThreshold', () => {
    const content = readSource()
    expect(content).toContain('async isTokenExpired()')
    expect(content).toContain('AUTH_CONFIG.refreshThreshold')
  })

  it('has isTokenExpiredCompletely method', () => {
    const content = readSource()
    expect(content).toContain('async isTokenExpiredCompletely()')
  })

  // ═══════════════════════════════════════════════════════════
  // Singleton export
  // ═══════════════════════════════════════════════════════════

  it('exports indexedDBService as singleton instance', () => {
    const content = readSource()
    expect(content).toMatch(/export const indexedDBService = new IndexedDBService\(\)/)
  })
})
