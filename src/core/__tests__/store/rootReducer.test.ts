import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// store/rootReducer.ts — Root Reducer (File Content Verification)
//
// Combines auth, filters, notification reducers with dynamic
// module reducers. Deep dependency chains through auth, modules,
// and slices — verify via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/store/rootReducer.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('store/rootReducer.ts — Imports', () => {
  it('imports combineReducers from @reduxjs/toolkit', () => {
    const content = readSource()
    expect(content).toContain('combineReducers')
    expect(content).toContain("from '@reduxjs/toolkit'")
  })

  it('imports getAllReducers from @/app/modules', () => {
    const content = readSource()
    expect(content).toContain('getAllReducers')
    expect(content).toContain("from '@/app/modules'")
  })

  it('imports authReducer as default from @/core/auth/store/authSlice', () => {
    const content = readSource()
    expect(content).toMatch(/import\s+authReducer\s+from\s+['"]@\/core\/auth\/store\/authSlice['"]/)
  })

  it('imports filtersReducer as default from ./filtersSlice', () => {
    const content = readSource()
    expect(content).toMatch(/import\s+filtersReducer\s+from\s+['"]\.\/filtersSlice['"]/)
  })

  it('imports notificationReducer as default from ./slices/notification.slice', () => {
    const content = readSource()
    expect(content).toMatch(/import\s+notificationReducer\s+from\s+['"]\.\/slices\/notification\.slice['"]/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Exports & Structure
// ═══════════════════════════════════════════════════════════════

describe('store/rootReducer.ts — Exports & Structure', () => {
  it('exports rootReducer using combineReducers with auth, filters, notification keys', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+const\s+rootReducer\s*=\s*combineReducers/)
    expect(content).toContain('auth: authReducer')
    expect(content).toContain('filters: filtersReducer')
    expect(content).toContain('notification: notificationReducer')
  })

  it('spreads getAllReducers() into the combined reducer', () => {
    const content = readSource()
    expect(content).toContain('...getAllReducers()')
  })
})
