import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// types/module.types.ts — Module Type Definitions
// (File Content Verification)
//
// Imports Reducer from @reduxjs/toolkit and LucideIcon from
// lucide-react. Deep lucide-react dependency chain — verify via
// readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/types/module.types.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('module.types.ts — Imports', () => {
  it('imports Reducer type from @reduxjs/toolkit', () => {
    const content = readSource()
    expect(content).toContain('Reducer')
    expect(content).toContain("from '@reduxjs/toolkit'")
  })

  it('imports LucideIcon type from lucide-react', () => {
    const content = readSource()
    expect(content).toContain('LucideIcon')
    expect(content).toContain("from 'lucide-react'")
  })
})

// ═══════════════════════════════════════════════════════════════
// ModuleNavItem Interface
// ═══════════════════════════════════════════════════════════════

describe('module.types.ts — ModuleNavItem', () => {
  it('exports ModuleNavItem interface', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+interface\s+ModuleNavItem/)
  })

  it('has path and title required properties', () => {
    const content = readSource()
    expect(content).toContain('path: string')
    expect(content).toContain('title: string')
  })

  it('has optional icon property typed to LucideIcon', () => {
    const content = readSource()
    expect(content).toContain('icon?: LucideIcon')
  })

  it('has optional permissions, modulePrefix, showInSidebar, hasSubmenu, children properties', () => {
    const content = readSource()
    expect(content).toContain('permissions?')
    expect(content).toContain('modulePrefix?')
    expect(content).toContain('showInSidebar?')
    expect(content).toContain('hasSubmenu?')
    expect(content).toContain('children?: ModuleNavItem[]')
  })
})

// ═══════════════════════════════════════════════════════════════
// ModuleRoute Interface
// ═══════════════════════════════════════════════════════════════

describe('module.types.ts — ModuleRoute', () => {
  it('exports ModuleRoute interface with path and element', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+interface\s+ModuleRoute/)
    expect(content).toContain('path: string')
    expect(content).toContain('element: React.ReactNode')
  })

  it('has optional permissions, requiresAuth, and layout properties', () => {
    const content = readSource()
    expect(content).toContain('permissions?')
    expect(content).toContain('requiresAuth?')
    expect(content).toContain("layout?: 'auth' | 'main'")
  })
})

// ═══════════════════════════════════════════════════════════════
// ModuleConfig Interface
// ═══════════════════════════════════════════════════════════════

describe('module.types.ts — ModuleConfig', () => {
  it('exports ModuleConfig interface with name and routes', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+interface\s+ModuleConfig/)
    expect(content).toContain('name: string')
    expect(content).toContain('routes: ModuleRoute[]')
  })

  it('has optional navigation and reducer properties', () => {
    const content = readSource()
    expect(content).toContain('navigation?: ModuleNavItem[]')
    expect(content).toContain('reducer?: Record<string, Reducer>')
  })
})
