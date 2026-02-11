import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// api/client.ts — API Client (File Content Verification)
//
// client.ts imports axios, sonner, env config, auth services,
// and tokenRefresh util — too many deep transitive deps for
// Vite's module graph. Verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/api/client.ts'),
    'utf-8',
  )
}

describe('api/client.ts — API Client', () => {
  // ═══════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════

  // ─── External deps ──────────────────────────────────────────

  it('imports axios with AxiosError, AxiosInstance, InternalAxiosRequestConfig', () => {
    const content = readSource()
    expect(content).toContain("from 'axios'")
    expect(content).toContain('AxiosError')
    expect(content).toContain('AxiosInstance')
    expect(content).toContain('InternalAxiosRequestConfig')
  })

  it('imports toast from sonner', () => {
    const content = readSource()
    expect(content).toContain("import { toast } from 'sonner'")
  })

  // ─── Config imports ─────────────────────────────────────────

  it('imports env from @/config/env.config', () => {
    const content = readSource()
    expect(content).toContain("from '@/config/env.config'")
    expect(content).toContain('env')
  })

  it('imports API_CONFIG, HTTP_STATUS, AUTH_CONFIG, API_ENDPOINTS from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain("from '@/config/constants'")
    expect(content).toContain('API_CONFIG')
    expect(content).toContain('HTTP_STATUS')
    expect(content).toContain('AUTH_CONFIG')
    expect(content).toContain('API_ENDPOINTS')
  })

  // ─── Internal imports ───────────────────────────────────────

  it('imports ApiError type from ./types', () => {
    const content = readSource()
    expect(content).toContain("import type { ApiError } from './types'")
  })

  it('imports indexedDBService from @/core/auth/services/indexedDb.service', () => {
    const content = readSource()
    expect(content).toContain('indexedDBService')
    expect(content).toContain("from '@/core/auth/services/indexedDb.service'")
  })

  it('imports refreshAccessToken and shouldRefreshToken from tokenRefresh.util', () => {
    const content = readSource()
    expect(content).toContain('refreshAccessToken')
    expect(content).toContain('shouldRefreshToken')
    expect(content).toContain("from '@/core/auth/utils/tokenRefresh.util'")
  })

  // ═══════════════════════════════════════════════════════════
  // Exported functions and constants
  // ═══════════════════════════════════════════════════════════

  // ─── waitForAuthInitialization ──────────────────────────────

  it('exports waitForAuthInitialization as async function', () => {
    const content = readSource()
    expect(content).toMatch(/export async function waitForAuthInitialization\(\)/)
  })

  // ─── markAuthInitialized ────────────────────────────────────

  it('exports markAuthInitialized function', () => {
    const content = readSource()
    expect(content).toMatch(/export function markAuthInitialized\(\)/)
  })

  // ─── setInitializationPromise ───────────────────────────────

  it('exports setInitializationPromise function', () => {
    const content = readSource()
    expect(content).toMatch(/export function setInitializationPromise\(/)
  })

  // ─── apiClient ──────────────────────────────────────────────

  it('exports apiClient as const created by createApiClient()', () => {
    const content = readSource()
    expect(content).toMatch(/export const apiClient = createApiClient\(\)/)
  })

  // ─── setupTokenRefreshInterval ──────────────────────────────

  it('exports setupTokenRefreshInterval function', () => {
    const content = readSource()
    expect(content).toMatch(/export function setupTokenRefreshInterval\(\)/)
  })

  // ═══════════════════════════════════════════════════════════
  // Internal helpers and state
  // ═══════════════════════════════════════════════════════════

  // ─── shouldSkipToken ────────────────────────────────────────

  it('defines shouldSkipToken function', () => {
    const content = readSource()
    expect(content).toMatch(/function shouldSkipToken\(/)
  })

  it('shouldSkipToken checks AUTH.LOGIN and AUTH.REFRESH endpoints', () => {
    const content = readSource()
    expect(content).toContain('API_ENDPOINTS.AUTH.LOGIN')
    expect(content).toContain('API_ENDPOINTS.AUTH.REFRESH')
  })

  // ─── processQueue ──────────────────────────────────────────

  it('defines processQueue function', () => {
    const content = readSource()
    expect(content).toMatch(/const processQueue =/)
  })

  // ─── performTokenRefresh ───────────────────────────────────

  it('defines performTokenRefresh async function', () => {
    const content = readSource()
    expect(content).toMatch(/async function performTokenRefresh\(\)/)
  })

  // ─── createApiClient ───────────────────────────────────────

  it('defines createApiClient function that returns AxiosInstance', () => {
    const content = readSource()
    expect(content).toMatch(/function createApiClient\(\): AxiosInstance/)
  })

  // ─── isRefreshing and failedQueue ──────────────────────────

  it('declares isRefreshing boolean state variable', () => {
    const content = readSource()
    expect(content).toMatch(/let isRefreshing = false/)
  })

  it('declares failedQueue array for queued requests', () => {
    const content = readSource()
    expect(content).toContain('let failedQueue:')
  })

  // ═══════════════════════════════════════════════════════════
  // Interceptors
  // ═══════════════════════════════════════════════════════════

  // ─── Request interceptor ───────────────────────────────────

  it('sets up request interceptor with Authorization header', () => {
    const content = readSource()
    expect(content).toContain('interceptors.request.use')
    expect(content).toContain('config.headers.Authorization')
  })

  it('adds Company-Code header from currentCompany', () => {
    const content = readSource()
    expect(content).toContain("config.headers['Company-Code']")
    expect(content).toContain('getCurrentCompany')
  })

  // ─── Response interceptor ─────────────────────────────────

  it('sets up response interceptor', () => {
    const content = readSource()
    expect(content).toContain('interceptors.response.use')
  })

  it('handles 401 Unauthorized with token refresh', () => {
    const content = readSource()
    expect(content).toContain('HTTP_STATUS.UNAUTHORIZED')
    expect(content).toContain('_retry')
  })

  it('shows toast.error for non-401 API errors', () => {
    const content = readSource()
    expect(content).toContain('toast.error')
  })

  // ─── Token refresh queue pattern ──────────────────────────

  it('implements token refresh queue pattern with failedQueue', () => {
    const content = readSource()
    expect(content).toContain('failedQueue.push')
    expect(content).toContain('processQueue(null, newToken)')
    expect(content).toContain('processQueue(refreshError, null)')
  })

  it('redirects to /login on refresh failure', () => {
    const content = readSource()
    expect(content).toContain("window.location.href = '/login'")
  })

  it('clears IndexedDB on refresh failure', () => {
    const content = readSource()
    expect(content).toContain('indexedDBService.clearAuthData()')
  })
})
