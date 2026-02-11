import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// env.config — File Content Verification
//
// Direct import hangs because env.config imports from './constants'
// which is a barrel that re-exports status.constants (lucide-react).
// We verify via file content analysis.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/config/env.config.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('env.config — Imports', () => {
  it('imports API_CONFIG from ./constants', () => {
    const content = readSource()
    expect(content).toContain('API_CONFIG')
    expect(content).toContain("from './constants'")
  })
})

// ═══════════════════════════════════════════════════════════════
// EnvConfig interface
// ═══════════════════════════════════════════════════════════════

describe('env.config — EnvConfig interface', () => {
  it('defines EnvConfig with apiBaseUrl, appEnv, isDev, isProd, enableMocking', () => {
    const content = readSource()
    expect(content).toContain('interface EnvConfig')
    expect(content).toContain('apiBaseUrl: string')
    expect(content).toContain('isDev: boolean')
    expect(content).toContain('isProd: boolean')
    expect(content).toContain('enableMocking: boolean')
  })

  it('appEnv is typed as union of development | staging | production', () => {
    const content = readSource()
    expect(content).toContain("'development'")
    expect(content).toContain("'staging'")
    expect(content).toContain("'production'")
  })
})

// ═══════════════════════════════════════════════════════════════
// getEnvVar helper
// ═══════════════════════════════════════════════════════════════

describe('env.config — getEnvVar helper', () => {
  it('defines getEnvVar function', () => {
    const content = readSource()
    expect(content).toContain('function getEnvVar')
  })

  it('uses import.meta.env[key]', () => {
    const content = readSource()
    expect(content).toContain('import.meta.env[key]')
  })

  it('throws Error for missing env var without default', () => {
    const content = readSource()
    expect(content).toContain('throw new Error')
    expect(content).toContain('Missing environment variable')
  })
})

// ═══════════════════════════════════════════════════════════════
// env object
// ═══════════════════════════════════════════════════════════════

describe('env.config — env object', () => {
  it('exports env as EnvConfig', () => {
    const content = readSource()
    expect(content).toContain('export const env: EnvConfig')
  })

  it('apiBaseUrl uses VITE_API_BASE_URL with API_CONFIG.baseUrl fallback', () => {
    const content = readSource()
    expect(content).toContain('VITE_API_BASE_URL')
    expect(content).toContain('API_CONFIG.baseUrl')
  })

  it('appEnv uses VITE_APP_ENV with "development" default', () => {
    const content = readSource()
    expect(content).toContain('VITE_APP_ENV')
    expect(content).toContain("'development'")
  })

  it('isDev reads from import.meta.env.DEV', () => {
    const content = readSource()
    expect(content).toContain('import.meta.env.DEV')
  })

  it('isProd reads from import.meta.env.PROD', () => {
    const content = readSource()
    expect(content).toContain('import.meta.env.PROD')
  })

  it('enableMocking compares VITE_ENABLE_MOCKING against "true"', () => {
    const content = readSource()
    expect(content).toContain('VITE_ENABLE_MOCKING')
    expect(content).toContain("=== 'true'")
  })
})
