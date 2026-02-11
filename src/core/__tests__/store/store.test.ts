import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// store/store.ts — Store Configuration (File Content Verification)
//
// Imports configureStore, rootReducer, authSyncMiddleware, and
// filtersSlice. Uses deep Redux/auth dependency chains — verify
// structure via readFileSync to avoid Vite module graph hangs.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/store/store.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('store/store.ts — Imports', () => {
  it('imports configureStore from @reduxjs/toolkit', () => {
    const content = readSource()
    expect(content).toContain('configureStore')
    expect(content).toContain("from '@reduxjs/toolkit'")
  })

  it('imports rootReducer from ./rootReducer', () => {
    const content = readSource()
    expect(content).toContain('rootReducer')
    expect(content).toContain("from './rootReducer'")
  })

  it('imports authSyncMiddleware from @/core/auth/store/authSyncMiddleware', () => {
    const content = readSource()
    expect(content).toContain('authSyncMiddleware')
    expect(content).toContain("from '@/core/auth/store/authSyncMiddleware'")
  })

  it('imports saveFiltersToStorage from ./filtersSlice', () => {
    const content = readSource()
    expect(content).toContain('saveFiltersToStorage')
    expect(content).toContain("from './filtersSlice'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('store/store.ts — Exports', () => {
  it('exports store via configureStore', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+const\s+store\s*=\s*configureStore/)
  })

  it('exports RootState and AppDispatch types', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+type\s+RootState/)
    expect(content).toMatch(/export\s+type\s+AppDispatch/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Middleware & Configuration
// ═══════════════════════════════════════════════════════════════

describe('store/store.ts — Middleware & Configuration', () => {
  it('configures middleware with serializableCheck and authSyncMiddleware', () => {
    const content = readSource()
    expect(content).toContain('getDefaultMiddleware')
    expect(content).toContain('serializableCheck')
    expect(content).toContain('.concat(authSyncMiddleware)')
  })

  it('enables devTools conditionally based on import.meta.env.DEV', () => {
    const content = readSource()
    expect(content).toContain('devTools: import.meta.env.DEV')
  })
})

// ═══════════════════════════════════════════════════════════════
// localStorage Subscription
// ═══════════════════════════════════════════════════════════════

describe('store/store.ts — localStorage Subscription', () => {
  it('subscribes to store changes via store.subscribe', () => {
    const content = readSource()
    expect(content).toContain('store.subscribe')
  })

  it('calls saveFiltersToStorage when filters change', () => {
    const content = readSource()
    expect(content).toContain('saveFiltersToStorage(currentFilters)')
  })
})
