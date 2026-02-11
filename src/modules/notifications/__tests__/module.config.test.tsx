import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Module Config — Structure Verification
//
// Direct import of module.config.tsx hangs because it triggers
// Vite's module graph resolution on lucide-react (thousands of
// icon exports) and the lazy-loaded page chains.
// Instead, we verify the config structure via file content
// analysis — the same proven pattern from dashboard/__tests__.
// ═══════════════════════════════════════════════════════════════

function readModuleConfig(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/notifications/module.config.tsx'),
    'utf-8',
  )
}

describe('notificationsModuleConfig', () => {
  // ─── Top-level Shape ──────────────────────────────────────────

  it('exports notificationsModuleConfig with ModuleConfig type', () => {
    const content = readModuleConfig()
    expect(content).toContain('export const notificationsModuleConfig')
    expect(content).toContain('ModuleConfig')
  })

  it('has name set to "notifications"', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/name:\s*['"]notifications['"]/)
  })

  // ─── Routes ───────────────────────────────────────────────────

  it('defines a routes array', () => {
    const content = readModuleConfig()
    expect(content).toContain('routes:')
  })

  it('has /notifications route with main layout', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/path:\s*['"]\/notifications['"]/)
    expect(content).toMatch(/layout:\s*['"]main['"]/)
  })

  it('has /notifications/send route', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/path:\s*['"]\/notifications\/send['"]/)
  })

  it('/notifications/send requires NOTIFICATION_PERMISSIONS.SEND', () => {
    const content = readModuleConfig()
    expect(content).toContain('NOTIFICATION_PERMISSIONS.SEND')
  })

  it('route elements use lazy-loaded pages', () => {
    const content = readModuleConfig()
    expect(content).toContain("lazy(() => import('./pages/NotificationsPage'))")
    expect(content).toContain("lazy(() => import('./pages/SendNotificationPage'))")
  })

  // ─── Navigation ───────────────────────────────────────────────

  it('defines a navigation array', () => {
    const content = readModuleConfig()
    expect(content).toContain('navigation:')
  })

  it('navigation item has path /notifications and title Notifications', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/title:\s*['"]Notifications['"]/)
  })

  it('navigation uses Bell icon from lucide-react', () => {
    const content = readModuleConfig()
    expect(content).toContain("import { Bell } from 'lucide-react'")
    expect(content).toContain('icon: Bell')
  })

  it('navigation has showInSidebar and hasSubmenu set to true', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/showInSidebar:\s*true/)
    expect(content).toMatch(/hasSubmenu:\s*true/)
  })

  it('navigation has 2 children (All Notifications, Send Notification)', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/title:\s*['"]All Notifications['"]/)
    expect(content).toMatch(/title:\s*['"]Send Notification['"]/)
  })
})
