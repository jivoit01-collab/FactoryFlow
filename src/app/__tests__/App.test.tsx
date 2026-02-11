import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// App — File Content Verification
//
// Imports @/core/auth (AuthInitializer), @/shared/components
// (ErrorBoundary), @/core/pwa (PWAInstallPrompt).
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/App.tsx'),
    'utf-8',
  )
}

describe('App', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports App as default export', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+default\s+App/)
  })

  it('imports Toaster from sonner', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Toaster[^}]*\}\s*from\s*['"]sonner['"]/,
    )
  })

  it('imports AppProviders from ./providers', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*AppProviders[^}]*\}\s*from\s*['"]\.\/providers['"]/,
    )
  })

  it('imports AppRoutes from ./routes', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*AppRoutes[^}]*\}\s*from\s*['"]\.\/routes['"]/,
    )
  })

  it('imports AuthInitializer from @/core/auth/components/AuthInitializer', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*AuthInitializer[^}]*\}\s*from\s*['"]@\/core\/auth\/components\/AuthInitializer['"]/,
    )
  })

  // ─── Component Composition ──────────────────────────────

  it('imports ErrorBoundary from @/shared/components', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*ErrorBoundary[^}]*\}\s*from\s*['"]@\/shared\/components['"]/,
    )
  })

  it('imports PWAInstallPrompt from @/core/pwa/PWAInstallPrompt', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*PWAInstallPrompt[^}]*\}\s*from\s*['"]@\/core\/pwa\/PWAInstallPrompt['"]/,
    )
  })

  it('ErrorBoundary is the outermost wrapper', () => {
    const content = readSource()
    expect(content).toContain('<ErrorBoundary>')
    expect(content).toContain('</ErrorBoundary>')
  })

  it('AppProviders is inside ErrorBoundary', () => {
    const content = readSource()
    const errorBoundaryIdx = content.indexOf('<ErrorBoundary>')
    const appProvidersIdx = content.indexOf('<AppProviders>')
    expect(appProvidersIdx).toBeGreaterThan(errorBoundaryIdx)
  })

  it('AuthInitializer wraps AppRoutes', () => {
    const content = readSource()
    expect(content).toContain('<AuthInitializer>')
    expect(content).toContain('<AppRoutes />')
    expect(content).toContain('</AuthInitializer>')
    const authInitIdx = content.indexOf('<AuthInitializer>')
    const appRoutesIdx = content.indexOf('<AppRoutes />')
    expect(appRoutesIdx).toBeGreaterThan(authInitIdx)
  })

  // ─── Sibling Components ─────────────────────────────────

  it('renders Toaster with richColors and position="top-right"', () => {
    const content = readSource()
    expect(content).toContain('<Toaster richColors position="top-right"')
  })

  it('renders PWAInstallPrompt as sibling component', () => {
    const content = readSource()
    expect(content).toContain('<PWAInstallPrompt />')
  })
})
