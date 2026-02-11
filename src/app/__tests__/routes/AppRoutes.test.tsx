import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// AppRoutes — File Content Verification
//
// Imports @/app/layouts, @/core/auth (ProtectedRoute),
// @/app/modules (getRoutesByLayout), @/core/notifications.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/routes/AppRoutes.tsx'),
    'utf-8',
  )
}

describe('AppRoutes', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports AppRoutes as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+AppRoutes/)
  })

  it('imports Suspense from react', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Suspense[^}]*\}\s*from\s*['"]react['"]/,
    )
  })

  it('imports Routes, Route, Navigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toContain('Routes')
    expect(content).toContain('Route')
    expect(content).toContain('Navigate')
    expect(content).toMatch(/from\s*['"]react-router-dom['"]/)
  })

  it('imports ProtectedRoute from @/core/auth', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*ProtectedRoute[^}]*\}\s*from\s*['"]@\/core\/auth['"]/,
    )
  })

  it('imports getRoutesByLayout from @/app/modules', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*getRoutesByLayout[^}]*\}\s*from\s*['"]@\/app\/modules['"]/,
    )
  })

  // ─── UnauthorizedPage Internal Component ────────────────

  it('defines UnauthorizedPage internal component', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+UnauthorizedPage/)
  })

  it("UnauthorizedPage renders 'Unauthorized' heading", () => {
    const content = readSource()
    expect(content).toContain('>Unauthorized<')
  })

  it('UnauthorizedPage shows permission message', () => {
    const content = readSource()
    expect(content).toContain("don't have permission")
  })

  // ─── Route Structure ────────────────────────────────────

  it('wraps all routes in Suspense with PageLoadError fallback', () => {
    const content = readSource()
    expect(content).toContain('<Suspense fallback={<PageLoadError />}>')
    expect(content).toMatch(
      /import\s*\{[^}]*PageLoadError[^}]*\}\s*from\s*['"]@\/shared\/components\/PageLoadError['"]/,
    )
  })

  it('uses AuthLayout as route element for auth routes', () => {
    const content = readSource()
    expect(content).toContain('<Route element={<AuthLayout />}>')
  })

  it("maps auth routes from getRoutesByLayout('auth')", () => {
    const content = readSource()
    expect(content).toContain("getRoutesByLayout('auth')")
    expect(content).toContain('authRoutes.map')
  })

  it('wraps main routes in ProtectedRoute + NotificationGate + MainLayout', () => {
    const content = readSource()
    expect(content).toContain('<ProtectedRoute>')
    expect(content).toContain('<NotificationGate>')
    expect(content).toContain('<MainLayout />')
    expect(content).toMatch(
      /import\s*\{[^}]*NotificationGate[^}]*\}\s*from\s*['"]@\/core\/notifications\/components\/NotificationGate['"]/,
    )
  })

  it("maps main routes from getRoutesByLayout('main')", () => {
    const content = readSource()
    expect(content).toContain("getRoutesByLayout('main')")
    expect(content).toContain('mainRoutes.map')
  })

  it('wraps routes with permissions in per-route ProtectedRoute', () => {
    const content = readSource()
    expect(content).toContain('route.permissions ?')
    expect(content).toContain('<ProtectedRoute permissions={route.permissions}>')
  })

  // ─── Special Routes ─────────────────────────────────────

  it('has /unauthorized route rendering UnauthorizedPage', () => {
    const content = readSource()
    expect(content).toContain('path="/unauthorized"')
    expect(content).toContain('element={<UnauthorizedPage />}')
  })

  it('has catch-all path="*" with Navigate to="/" replace', () => {
    const content = readSource()
    expect(content).toContain('path="*"')
    expect(content).toContain('<Navigate to="/" replace />')
  })

  it('imports MainLayout and AuthLayout from @/app/layouts', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*MainLayout[^}]*AuthLayout[^}]*\}\s*from\s*['"]@\/app\/layouts['"]/,
    )
  })
})
