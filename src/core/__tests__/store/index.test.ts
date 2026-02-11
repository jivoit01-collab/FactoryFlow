import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// store/index.ts — Barrel Re-exports (File Content Verification)
//
// The store barrel imports configureStore, Redux hooks, and
// reducers with deep dependency chains. Verify structure via
// readFileSync to avoid Vite module graph hangs.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/store/index.ts'),
    'utf-8',
  )
}

describe('store/index.ts — Barrel Re-exports', () => {
  // ═══════════════════════════════════════════════════════════
  // Store exports
  // ═══════════════════════════════════════════════════════════

  it('re-exports store, RootState, and AppDispatch from ./store', () => {
    const content = readSource()
    expect(content).toContain('store')
    expect(content).toContain('RootState')
    expect(content).toContain('AppDispatch')
    expect(content).toContain("from './store'")
  })

  // ═══════════════════════════════════════════════════════════
  // Hooks exports
  // ═══════════════════════════════════════════════════════════

  it('re-exports useAppDispatch and useAppSelector from ./hooks', () => {
    const content = readSource()
    expect(content).toContain('useAppDispatch')
    expect(content).toContain('useAppSelector')
    expect(content).toContain("from './hooks'")
  })

  // ═══════════════════════════════════════════════════════════
  // Root reducer export
  // ═══════════════════════════════════════════════════════════

  it('re-exports rootReducer from ./rootReducer', () => {
    const content = readSource()
    expect(content).toContain('rootReducer')
    expect(content).toContain("from './rootReducer'")
  })

  it('exports RootState and AppDispatch as type-only re-exports', () => {
    const content = readSource()
    expect(content).toMatch(/type\s+RootState/)
    expect(content).toMatch(/type\s+AppDispatch/)
  })
})
